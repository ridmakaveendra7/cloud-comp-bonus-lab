# Hand2Hand Kubernetes Cluster Setup Guide

This guide provides step-by-step instructions to create a Azure Kubernetes Service (AKS) cluster for
 the Hand2Hand application deployment.
 
 Hand2Hand is a E-Commerce application that has been developed for a Project in Global
 Distributed Software Development modulle.
 
 Application is developed using Python Django framework and and React Vite and MySql DB.
 Application also uses Amazon S3 bucket internally.
 
 For this Bonus assignment we are using helm to deploy this application as a scalable app.
 Weareusing azure aks to deploy this application. We are using kubernetes HPA for auto scaling the
 pods of backend and frontend deployment. We have also added a nginx-ingress controller to route
 the incoming traffic to the pods.


**Below is a deployment guideline. There is also `deploy.sh` script which includes all below commands and can automate cluster creation and helm deployment.
`cleanup.sh` can be used to delete the whole cluster after creating and testing.** 

## Prerequisites

- Azure CLI installed and configured
- kubectl installed
- Helm installed
- Docker installed (for building images)
- Azure login
- Docker login

# Automated deployment and cleanup using the deploy and cleanup scripts

```bash
# Deploy 
chmod +x deploy.sh
./deploy.sh

# Cleanup
chmod +x cleanup.sh
./cleanup.sh
```


# Manual Deployment
## 1. Create Resource Group

```bash
# Create resource group
az group create --name myResourceGroup --location eastus
```

## 2. Create AKS Cluster (Cost-Optimized)

```bash
# Create AKS cluster with lower specs suitable for current workload
az aks create --resource-group myResourceGroup --name myAKSCluster --node-count 1 --node-vm-size Standard_B2s --enable-addons monitoring --generate-ssh-keys --network-plugin azure --network-policy azure --enable-managed-identity
```

### Node Specifications (Standard_D2d_v4):
- **CPU**: 2 cores (1.86 allocatable)
- **Memory**: 8GB (6GB allocatable)
- **Cost**: ~$50-60/month (vs $100-120 for D4d_v4)
- **Sufficient for**: Current workload + 3-4x growth

## 3. Get Cluster Credentials

```bash
# Get credentials for kubectl
az aks get-credentials --resource-group myResourceGroup --name myAKSCluster
```

## 4. Install NGINX Ingress Controller

```bash
# Add NGINX ingress repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Create namespace for ingress
kubectl create namespace ingress-nginx

# Install NGINX ingress controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.replicaCount=1 \
  --set controller.resources.requests.cpu=100m \
  --set controller.resources.requests.memory=90Mi \
  --set controller.resources.limits.cpu=200m \
  --set controller.resources.limits.memory=180Mi
```

## 5. Set ENVs and Build, Push Docker Images

```bash
Set-Content -Path "apps/frontend/.env.production" -Value "VITE_API_BASE_URL=http://20.246.189.54/api"
# Build both images
docker compose -f docker-compose.prod.yml build

# Push images to docker registry
docker compose -f docker-compose.prod.yml push
```

## 6. Deploy Application with Helm

```bash
# Deploy the application
helm upgrade --install hand2hand ./helm --namespace default
```

## 7. Verify Deployment

```bash
# Check all pods are running
kubectl get pods

# Check services
kubectl get svc

# Check ingress
kubectl get ingress

# Get external IP
kubectl get svc -n ingress-nginx
```

## 8. Access the Application

- **URL**: http://EXTERNAL_IP (from ingress-nginx service)
