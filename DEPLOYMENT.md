# Azure Deployment Guide - Open Pet Platform

## Deployment Strategy

This guide will help you deploy the Open Pet Platform to Azure. Since this app uses **Next.js ISR (Incremental Static Regeneration)** and server-side data fetching, you need **Azure App Service** (not Static Web Apps).

---

## 🎯 Deployment Option: Azure App Service (Required for Full Next.js)

**Why App Service is required:**
- ✅ Full Next.js support (SSR, ISR, API Routes)
- ✅ Server-side data fetching with revalidation
- ✅ Built-in CI/CD with GitHub Actions
- ✅ Custom domains + SSL
- ✅ Auto-scaling available
- ✅ Environment variables for API keys

**Cost:** ~$13/month (Basic B1 tier) or ~$55/month (Standard S1 with autoscaling)

---

## 📋 Prerequisites

1. **Azure Account** - [Sign up for free](https://azure.microsoft.com/free/) ($200 credit for 30 days)
2. **GitHub Account** - Your code repository
3. **Azure CLI** (optional but recommended) - [Install](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)

---

## 🚀 Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
# Initialize git if you haven't already
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Azure App Service deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/open-pet-platform.git
git branch -M main
git push -u origin main
```

### Step 2: Create Azure App Service

#### Option A: Using Azure Portal (Recommended)

#### Option A: Using Azure Portal (Recommended)

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"**
3. Search for **"Web App"**
4. Click **"Create"**
5. Fill in the details:
   - **Subscription:** Select your subscription
   - **Resource Group:** Create new (e.g., `rg-open-pet-platform`)
   - **Name:** `open-pet-platform` (must be globally unique)
   - **Publish:** Code
   - **Runtime stack:** Node 18 LTS
   - **Operating System:** Linux
   - **Region:** Choose closest to your users (e.g., East US)
   - **Pricing Plan:** Basic B1 (~$13/month) or Free F1 for testing
6. Click **"Review + Create"** → **"Create"**
7. After creation, go to **Deployment Center**
8. Choose **GitHub** as source
9. Authorize and select your repository and branch
10. Azure will automatically set up GitHub Actions

#### Option B: Using Azure CLI (Faster)

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name rg-open-pet-platform \
  --location eastus

# Create App Service Plan (Basic B1 tier)
az appservice plan create \
  --name plan-open-pet-platform \
  --resource-group rg-open-pet-platform \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name open-pet-platform \
  --resource-group rg-open-pet-platform \
  --plan plan-open-pet-platform \
  --runtime "NODE:18-lts"

# Configure deployment from GitHub
az webapp deployment source config \
  --name open-pet-platform \
  --resource-group rg-open-pet-platform \
  --repo-url https://github.com/YOUR-USERNAME/open-pet-platform \
  --branch main \
  --manual-integration
```

### Step 3: Configure GitHub Actions

### Step 3: Configure GitHub Actions

1. In Azure Portal, go to your Web App → **Deployment Center**
2. Download the **Publish Profile** (XML file)
3. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
4. Click **"New repository secret"**
5. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
6. Value: Paste the entire contents of the publish profile XML
7. Click **"Add secret"**

The GitHub Actions workflow (`.github/workflows/azure-appservice-deploy.yml`) is already configured in your project.

### Step 4: Deploy!

Every push to `main` will automatically trigger a deployment:

```bash
git add .
git commit -m "Deploy to Azure App Service"
git push origin main
```

Watch the deployment:
- Go to **GitHub** → **Actions** tab
- Click on the running workflow to see logs
- Deployment takes ~3-5 minutes

### Step 5: Access Your App

Once deployed, your app will be at: `https://open-pet-platform.azurewebsites.net`

Get your URL:

```bash
az webapp show \
  --name open-pet-platform \
  --resource-group rg-open-pet-platform \
  --query "defaultHostName" \
  --output tsv
```

---

## 🔧 Configuration & Best Practices

### Environment Variables

To add environment variables (e.g., API keys):

1. Go to Azure Portal → Your Web App
2. Click **Configuration** in the left menu
3. Under **Application settings**, click **New application setting**
4. Add your variables:
   - `NEXT_PUBLIC_API_URL`
   - `SHELTERLUV_API_KEY` (if using real Shelterluv API)
5. Click **Save** → **Continue**
6. The app will restart automatically

Or via CLI:

```bash
az webapp config appsettings set \
  --name open-pet-platform \
  --resource-group rg-open-pet-platform \
  --settings NEXT_PUBLIC_API_URL=https://api.example.com SHELTERLUV_API_KEY=your_key_here
```

### Custom Domain (Optional)

1. In Azure Portal → Your Web App → **Custom domains**
2. Click **Add custom domain**
3. Enter your domain (e.g., `openpetplatform.com`)
4. Azure provides DNS records to add
5. Update your DNS provider with:
   - CNAME record or A record (Azure provides the values)
6. Click **Validate** → **Add**
7. Enable **HTTPS** (free SSL certificate)

---

## 💰 Cost Breakdown

### Option 1: Free Tier (For Testing Only)
- **App Service Free F1:** FREE
  - 60 minutes/day compute
  - 1 GB RAM
  - No custom domains
  - No auto-scaling
- **Limitations:** Not suitable for production
- **Estimated Cost:** **$0/month**

### Option 2: Basic Tier (Recommended to Start)
- **App Service Basic B1:** $13/month
  - 1.75 GB RAM
  - 1 core
  - Custom domains + SSL
  - Always-on (no cold starts)
  - 10 GB storage
- **Estimated Cost:** **$13/month**

### Option 3: Standard Tier (Production with Scaling)
- **App Service Standard S1:** $55/month
  - 1.75 GB RAM
  - 1 core
  - Auto-scaling up to 10 instances
  - Deployment slots (staging)
  - Daily backups
  - 50 GB storage
- **Application Insights (optional):** ~$2-5/month
- **Estimated Cost:** **$55-60/month**

### When to Upgrade:
- **F1 → B1:** When you go live (always-on, custom domain)
- **B1 → S1:** When you need auto-scaling or staging environments
- **S1 → P1V2:** When you need more than 10 concurrent users or better performance

---

## 🔄 CI/CD Workflow

The GitHub Actions workflow automatically:

1. **Triggers on:**
   - Push to `main` branch
   - Pull request to `main` (creates preview environment)

2. **Build process:**
   - Installs Node.js dependencies
   - Runs `npm run build`
   - Generates static export
   - Deploys to Azure

3. **Preview environments:**
   - Each PR gets its own preview URL
   - Automatically deleted when PR is closed

---

## 🛠️ Troubleshooting

### Build Fails

Check the GitHub Actions logs:

**Common issues:**
- Missing dependencies: `npm install` locally first
- Environment variables: Add to Azure Static Web App settings
- Build errors: Run `npm run build` locally to debug

### App Shows 404

1. Ensure `output: 'export'` is in `next.config.ts`
2. Check `output_location` is set to `out` in workflow
3. Verify `staticwebapp.config.json` is present

### API Routes Not Working

Azure Static Web Apps has limited support for Next.js API routes. Options:

1. **Use Azure Functions** (add `api/` folder with serverless functions)
2. **Use external API** (recommended - deploy API separately)
3. **Use static data** (current approach with mock adapters)

---

## 🚀 Advanced: Alternative Azure Options

If you need full Next.js features (SSR, ISR, API routes):

### Option A: Azure App Service (Linux)
- **Cost:** ~$13/month (Basic B1 tier)
- **Supports:** Full Next.js with SSR
- **Deploy via:** Docker or direct Node.js

### Option B: Azure Container Apps
- **Cost:** ~$15-25/month (with autoscaling)
- **Supports:** Full Next.js, serverless containers
- **Best for:** Production apps with variable traffic

### Option C: Azure Functions + Static Web Apps
- **Cost:** Free tier + consumption-based Functions
- **Supports:** Static front-end + serverless API
- **Best for:** Hybrid static + dynamic

---

## 📚 Resources

- [Azure Static Web Apps Docs](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Azure Free Account](https://azure.microsoft.com/free/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)

---

## 🎉 Quick Deploy Checklist

- [ ] Update `next.config.ts` with `output: 'export'`
- [ ] Push code to GitHub
- [ ] Create Azure Static Web App (Free tier)
- [ ] Authorize GitHub connection
- [ ] Wait for first deployment (~3 min)
- [ ] Access your app at `*.azurestaticapps.net`
- [ ] (Optional) Add custom domain
- [ ] (Optional) Add environment variables

---

## 🆘 Need Help?

- **Azure Support:** [Open a support ticket](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)
- **GitHub Issues:** Check Actions logs for detailed errors
- **Community:** [Azure Static Web Apps GitHub Discussions](https://github.com/Azure/static-web-apps/discussions)
