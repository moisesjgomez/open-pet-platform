# Infrastructure as Code (Bicep)

This directory contains Azure Bicep templates for deploying the Open Pet Platform infrastructure.

## 📁 Files

- `main.bicep` - Main infrastructure template
- `main.parameters.json` - Production parameters (Basic B1 tier)
- `main.parameters.dev.json` - Development parameters (Free F1 tier)
- `deploy.sh` - Deployment script
- `destroy.sh` - Cleanup script

## 🚀 Quick Deploy

### Prerequisites

Install Azure CLI:
```bash
brew install azure-cli
```

### Deploy to Production (Basic B1 - $13/month)

```bash
chmod +x infra/deploy.sh
./infra/deploy.sh prod
```

### Deploy to Development (Free F1)

```bash
chmod +x infra/deploy.sh
./infra/deploy.sh dev
```

## 📋 What Gets Deployed

1. **Resource Group**: `rg-open-pet-platform`
2. **App Service Plan**: Linux-based, configurable tier (F1/B1/S1)
3. **Web App**: Node.js 18 LTS runtime
   - HTTPS enforced
   - HTTP/2 enabled
   - Minimum TLS 1.2
   - FTPS disabled (security best practice)
   - Always-on (if not Free tier)

## 🎛️ Configuration

Edit `infra/main.parameters.json` to customize:

- `appName`: Application name (must be globally unique)
- `location`: Azure region (eastus, westus2, etc.)
- `appServicePlanSku`: Pricing tier (F1, B1, S1)
- `nodeVersion`: Node.js version (18-lts, 20-lts)

## 💰 Cost Tiers

| Tier | Cost/Month | Use Case |
|------|-----------|----------|
| F1 (Free) | $0 | Testing (60 min/day limit) |
| B1 (Basic) | $13 | Production (always-on) |
| S1 (Standard) | $55 | Production with auto-scaling |

## 🔧 Manual Deployment Steps

If you prefer manual deployment:

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name rg-open-pet-platform \
  --location eastus

# Deploy infrastructure
az deployment group create \
  --resource-group rg-open-pet-platform \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json
```

## 🔗 Connect to GitHub

After deployment, connect to GitHub for CI/CD:

### Option 1: Azure Portal (Recommended)
1. Go to Azure Portal → Your Web App
2. Click **Deployment Center**
3. Choose **GitHub** and authorize
4. Select repository: `moisesjgomez/open-pet-platform`
5. Branch: `main`
6. Click **Save**

### Option 2: Azure CLI
```bash
az webapp deployment source config \
  --name open-pet-platform \
  --resource-group rg-open-pet-platform \
  --repo-url https://github.com/moisesjgomez/open-pet-platform \
  --branch main \
  --manual-integration
```

## 🧹 Cleanup

To delete all resources:

```bash
chmod +x infra/destroy.sh
./infra/destroy.sh
```

## 📊 View Deployment

```bash
# Get web app URL
az deployment group show \
  --resource-group rg-open-pet-platform \
  --name main \
  --query properties.outputs.webAppUrl.value \
  --output tsv

# View all resources
az resource list \
  --resource-group rg-open-pet-platform \
  --output table
```

## 🔐 Environment Variables

Add environment variables after deployment:

```bash
az webapp config appsettings set \
  --name open-pet-platform \
  --resource-group rg-open-pet-platform \
  --settings \
    NEXT_PUBLIC_API_URL=https://api.example.com \
    SHELTERLUV_API_KEY=your_key_here
```

## 📚 Learn More

- [Azure Bicep Documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [App Service Pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/)
- [Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/)
