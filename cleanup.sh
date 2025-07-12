#!/bin/bash

# Hand2Hand Kubernetes Cleanup Script
# This script cleans up the cluster and resources before redeployment

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

print_status "Starting Hand2Hand Kubernetes cleanup..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check Azure login
print_status "Checking Azure login..."
if ! az account show &> /dev/null; then
    print_error "Not logged into Azure. Please run 'az login' first."
    exit 1
fi

print_success "Azure login verified."

# Function to check if resource exists
resource_exists() {
    local resource_type=$1
    local resource_name=$2
    local resource_group=$3
    
    if [ -z "$resource_group" ]; then
        az $resource_type show --name $resource_name &> /dev/null
    else
        az $resource_type show --name $resource_name --resource-group $resource_group &> /dev/null
    fi
}

# Step 1: Uninstall Helm releases
print_status "Uninstalling Helm releases..."
if helm list | grep -q "hand2hand"; then
    helm uninstall hand2hand --namespace default
    print_success "Hand2Hand application uninstalled."
else
    print_warning "Hand2Hand application not found."
fi

if helm list -n ingress-nginx | grep -q "ingress-nginx"; then
    helm uninstall ingress-nginx --namespace ingress-nginx
    print_success "NGINX Ingress Controller uninstalled."
else
    print_warning "NGINX Ingress Controller not found."
fi

# Step 2: Delete Kubernetes namespaces
print_status "Deleting Kubernetes namespaces..."
if kubectl get namespace ingress-nginx &> /dev/null; then
    kubectl delete namespace ingress-nginx
    print_success "ingress-nginx namespace deleted."
else
    print_warning "ingress-nginx namespace not found."
fi

# Step 3: Delete AKS cluster
print_status "Checking if AKS cluster exists..."
if resource_exists "aks" $CLUSTER_NAME $RESOURCE_GROUP; then
    print_status "Deleting AKS cluster (this may take 10-15 minutes)..."
    az aks delete --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --yes --no-wait
    print_success "AKS cluster deletion initiated."
    
    # Wait for cluster deletion
    print_status "Waiting for cluster deletion to complete..."
    while resource_exists "aks" $CLUSTER_NAME $RESOURCE_GROUP; do
        print_status "Cluster still being deleted... (waiting)"
        sleep 30
    done
    print_success "AKS cluster deleted."
else
    print_warning "AKS cluster not found."
fi

# Step 4: Delete managed cluster resource group
print_status "Checking for managed cluster resource group..."
MANAGED_RG="MC_${RESOURCE_GROUP}_${CLUSTER_NAME}_eastus"
if resource_exists "group" $MANAGED_RG; then
    print_status "Deleting managed cluster resource group..."
    az group delete --name $MANAGED_RG --yes --no-wait
    print_success "Managed cluster resource group deletion initiated."
else
    print_warning "Managed cluster resource group not found."
fi

# Step 5: Delete main resource group
print_status "Checking if main resource group exists..."
if resource_exists "group" $RESOURCE_GROUP; then
    print_status "Deleting main resource group..."
    az group delete --name $RESOURCE_GROUP --yes --no-wait
    print_success "Main resource group deletion initiated."
else
    print_warning "Main resource group not found."
fi

# Step 6: Clean up local files
print_status "Cleaning up local files..."

# Remove .env.production file if it exists
if [ -f "apps/frontend/.env.production" ]; then
    rm "apps/frontend/.env.production"
    print_success "Frontend .env.production file removed."
fi

# Step 7: Clean up Docker images (optional)
read -p "Do you want to remove local Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Removing local Docker images..."
    docker rmi ridma95/hand2hand:backend-latest 2>/dev/null || print_warning "Backend image not found locally."
    docker rmi ridma95/hand2hand:frontend-latest 2>/dev/null || print_warning "Frontend image not found locally."
    print_success "Local Docker images cleaned."
fi

# Step 8: Clean up kubectl context
print_status "Cleaning up kubectl context..."
kubectl config unset current-context 2>/dev/null || print_warning "No kubectl context to clean."
kubectl config delete-context $CLUSTER_NAME 2>/dev/null || print_warning "No cluster context to delete."
kubectl config delete-cluster $CLUSTER_NAME 2>/dev/null || print_warning "No cluster to delete from config."
print_success "Kubectl context cleaned."

# Step 9: Wait for resource group deletion
print_status "Waiting for resource group deletion to complete..."
while resource_exists "group" $RESOURCE_GROUP; do
    print_status "Resource group still being deleted... (waiting)"
    sleep 30
done
print_success "Resource group deleted."

# Final output
echo ""
print_success "🎉 Cleanup completed successfully!"