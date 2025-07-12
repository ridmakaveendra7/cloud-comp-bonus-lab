#!/bin/bash

# Hand2Hand Kubernetes Deployment Automation Script
# This script automates the entire deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
RESOURCE_GROUP="myResourceGroup"
CLUSTER_NAME="myAKSCluster"
LOCATION="eastus"
VM_SIZE="Standard_D4d_v4"
NODE_COUNT=1

print_status "Starting Hand2Hand Kubernetes deployment automation..."

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install it first."
    exit 1
fi

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    print_error "Helm is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it first."
    exit 1
fi

print_success "All prerequisites are installed."

# Check Azure login
print_status "Checking Azure login..."
if ! az account show &> /dev/null; then
    print_error "Not logged into Azure. Please run 'az login' first."
    exit 1
fi

print_success "Azure login verified."

# Step 1: Create Resource Group
print_status "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
print_success "Resource group created."

# Step 2: Create AKS Cluster
print_status "Creating AKS cluster (this may take 10-15 minutes)..."
az aks create \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --node-count $NODE_COUNT \
    --node-vm-size $VM_SIZE \
    --enable-addons monitoring \
    --generate-ssh-keys \
    --network-plugin azure \
    --network-policy azure \
    --enable-managed-identity \
    --output none

print_success "AKS cluster created."

# Step 3: Get Cluster Credentials
print_status "Getting cluster credentials..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --overwrite-existing --output none
print_success "Cluster credentials obtained."

# Step 4: Install NGINX Ingress Controller
print_status "Installing NGINX Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

kubectl create namespace ingress-nginx --dry-run=client -o yaml | kubectl apply -f -

helm install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --set controller.replicaCount=1 \
    --set controller.resources.requests.cpu=100m \
    --set controller.resources.requests.memory=90Mi \
    --set controller.resources.limits.cpu=200m \
    --set controller.resources.limits.memory=180Mi \
    --wait --timeout=10m

print_success "NGINX Ingress Controller installed."

# Step 5: Wait for Ingress IP
print_status "Waiting for Ingress external IP to be assigned..."
INGRESS_IP=""
for i in {1..30}; do
    INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ ! -z "$INGRESS_IP" ]; then
        break
    fi
    print_status "Waiting for IP assignment... (attempt $i/30)"
    sleep 10
done

if [ -z "$INGRESS_IP" ]; then
    print_error "Failed to get Ingress external IP after 5 minutes."
    exit 1
fi

print_success "Ingress external IP obtained: $INGRESS_IP"

# Step 6: Update Frontend Environment
print_status "Updating frontend environment with Ingress IP..."
FRONTEND_ENV_FILE="apps/frontend/.env.production"
echo "VITE_API_BASE_URL=http://$INGRESS_IP/api" > $FRONTEND_ENV_FILE
print_success "Frontend environment updated."

# Step 7: Docker Hub Login
print_status "Logging into Docker Hub..."
docker logout
docker login -u ridma95
if [ $? -ne 0 ]; then
    print_error "Docker Hub login failed. Please check your credentials."
    exit 1
fi
print_success "Docker Hub login successful."


# Step 8: Build and Push Docker Images
print_status "Building Docker images..."
docker compose -f docker-compose.prod.yml build

print_status "Pushing Docker images..."
docker compose -f docker-compose.prod.yml push
print_success "Docker images built and pushed."

# Step 10: Deploy Application with Helm
print_status "Deploying application with Helm..."
helm upgrade --install hand2hand ./helm --namespace default --timeout=10m
print_success "Application deployed."

# Step 11: Verify Deployment
print_status "Verifying deployment..."
sleep 60  # Wait for pods to be ready

# Check pods
PODS_READY=$(kubectl get pods --no-headers | grep -v "Running\|Completed" | wc -l)
if [ $PODS_READY -eq 0 ]; then
    print_success "All pods are running."
else
    print_warning "Some pods are not ready yet. Check with: kubectl get pods"
fi

# Final output
echo ""
print_success "Deployment completed successfully!"
echo ""
echo "Application URL: http://$INGRESS_IP"