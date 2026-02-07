#!/bin/bash

# Azure Bicep Deployment Script
# This script deploys the Open Pet Platform infrastructure to Azure

set -e

# Configuration
RESOURCE_GROUP="rg-open-pet-platform"
LOCATION="eastus"
ENVIRONMENT="${1:-prod}"  # Default to prod, can pass 'dev' as argument

echo "🚀 Deploying Open Pet Platform to Azure"
echo "Environment: $ENVIRONMENT"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   brew install azure-cli"
    exit 1
fi

# Check if logged in
echo "Checking Azure login status..."
az account show &> /dev/null || {
    echo "❌ Not logged in to Azure. Running 'az login'..."
    az login
}

# Get current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Logged in to Azure"
echo "   Subscription: $SUBSCRIPTION"
echo ""

# Create resource group if it doesn't exist
echo "📦 Creating resource group if it doesn't exist..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

echo "✅ Resource group ready"
echo ""

# Select parameter file based on environment
if [ "$ENVIRONMENT" = "dev" ]; then
    PARAM_FILE="infra/main.parameters.dev.json"
    echo "📄 Using dev parameters (Free tier)"
else
    PARAM_FILE="infra/main.parameters.json"
    echo "📄 Using production parameters (Basic B1 tier)"
fi
echo ""

# Deploy Bicep template
echo "🔨 Deploying infrastructure..."
echo "This may take 2-3 minutes..."
echo ""

DEPLOYMENT_OUTPUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infra/main.bicep \
  --parameters "$PARAM_FILE" \
  --output json)

# Extract outputs
WEB_APP_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.webAppUrl.value')
WEB_APP_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.webAppName.value')

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Deployment Details:"
echo "   Web App Name: $WEB_APP_NAME"
echo "   Web App URL: $WEB_APP_URL"
echo "   Resource Group: $RESOURCE_GROUP"
echo ""
echo "🔗 Next Steps:"
echo "   1. Configure GitHub deployment:"
echo "      az webapp deployment source config \\"
echo "        --name $WEB_APP_NAME \\"
echo "        --resource-group $RESOURCE_GROUP \\"
echo "        --repo-url https://github.com/moisesjgomez/open-pet-platform \\"
echo "        --branch main \\"
echo "        --manual-integration"
echo ""
echo "   2. Or set up GitHub Actions (recommended):"
echo "      - Go to Azure Portal → $WEB_APP_NAME → Deployment Center"
echo "      - Choose GitHub and authorize"
echo "      - Select repository and branch"
echo ""
echo "   3. View your app:"
echo "      open $WEB_APP_URL"
echo ""
echo "🎉 Infrastructure is ready!"
