# Open Pet Platform - Azure App Service Deployment

## 🚀 Deploy in 10 Minutes

This app requires **Azure App Service** (not Static Web Apps) because it uses Next.js ISR (Incremental Static Regeneration) and server-side data fetching.

### Prerequisites
- Azure account ([free signup](https://azure.microsoft.com/free/) - $200 credit)
- GitHub account
- Code pushed to GitHub repository

### Deployment Steps

1. **Push to GitHub** (if not already done):

```bash
git add .
git commit -m "Ready for Azure App Service deployment"
git push origin main
```

2. **Create Azure App Service**:

**Via Azure Portal** (Easiest):
- Go to [Azure Portal](https://portal.azure.com)
- Click "Create a resource" → Search "Web App"
- Fill in:
  - Name: `open-pet-platform` (must be unique)
  - Runtime: **Node 18 LTS**
  - Operating System: **Linux**
  - Plan: **Basic B1** ($13/month) or **Free F1** (testing only)
- Click "Create"
- Go to **Deployment Center** → Choose **GitHub**
- Authorize and select your repo/branch

**Via Azure CLI**:
```bash
az login

# Create resource group
az group create --name rg-open-pet-platform --location eastus

# Create App Service plan
az appservice plan create \
  --name plan-open-pet-platform \
  --resource-group rg-open-pet-platform \
  --sku B1 --is-linux

# Create Web App
az webapp create \
  --name open-pet-platform \
  --resource-group rg-open-pet-platform \
  --plan plan-open-pet-platform \
  --runtime "NODE:18-lts"
```

3. **Configure GitHub Actions**:
   - In Azure Portal → Your Web App → **Deployment Center**
   - Download the **Publish Profile**
   - In GitHub → **Settings** → **Secrets** → **New secret**
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Paste the XML content
   
4. **Deploy**:
```bash
git push origin main
```
   - Check **GitHub Actions** tab for deployment progress
   - Takes ~3-5 minutes

5. **Access your app**: 
   `https://open-pet-platform.azurewebsites.net`

---

## 📚 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Complete deployment guide
- Cost breakdown ($0/month free tier available)
- Custom domain setup
- Environment variables
- Monitoring & analytics
- Alternative Azure deployment options
- Troubleshooting

---

## 💰 Estimated Costs

**Free Tier** (Testing only - 60 min/day limit):
- **$0/month** - Not recommended for production

**Basic B1** (Recommended to start):
- **$13/month** - Always-on, custom domains, SSL included

**Standard S1** (Production with autoscaling):
- **$55/month** - Auto-scaling, deployment slots, backups

---

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 📦 What's Included

- ✅ GitHub Actions CI/CD workflow (`.github/workflows/azure-deploy.yml`)
- ✅ Azure Static Web Apps config (`staticwebapp.config.json`)
- ✅ Environment variables template (`.env.example`)
- ✅ Azure-optimized Next.js config (`next.config.azure.ts`)
- ✅ Complete deployment documentation

---

## 🆘 Need Help?

Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting, or:
- [Azure Static Web Apps Docs](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions Logs](https://github.com/YOUR-USERNAME/open-pet-platform/actions)
