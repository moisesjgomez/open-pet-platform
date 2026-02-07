#!/bin/bash

# Azure Infrastructure Cleanup Script
# This script removes all resources created for the Open Pet Platform

set -e

RESOURCE_GROUP="rg-open-pet-platform"

echo "⚠️  WARNING: This will delete all resources in $RESOURCE_GROUP"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo ""
echo "🗑️  Deleting resource group: $RESOURCE_GROUP"
echo "This may take a few minutes..."

az group delete \
  --name "$RESOURCE_GROUP" \
  --yes \
  --no-wait

echo ""
echo "✅ Deletion initiated"
echo "   Resources are being deleted in the background"
echo "   Check status: az group show --name $RESOURCE_GROUP"
