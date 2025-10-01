# Deploying Monad Coin Flip to Vercel

## Quick Deploy (CLI)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Login to Vercel (opens browser)
vercel login

# 3. Deploy to production
vercel --prod
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Select your account
- **Link to existing project?** No
- **Project name?** monad-coin-flip (or your choice)
- **Directory?** ./ (default)
- **Override settings?** No

Your site will be live at: `https://monad-coin-flip.vercel.app` (or similar)

## Deploy via GitHub (Recommended for continuous deployment)

### Step 1: Push to GitHub
Already done! ✅

### Step 2: Connect to Vercel

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select your GitHub repository: `0xkongz/monad-flip`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

5. Click "Deploy"

### Step 3: Wait for Build
- Initial deployment takes 2-3 minutes
- You'll get a live URL like `https://monad-flip-xyz.vercel.app`

### Step 4: Set Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Environment Variables (if needed)

Currently, no environment variables are required since the contract address and RPC URL are hardcoded in the config files.

If you want to make them configurable:

1. In Vercel Dashboard → Settings → Environment Variables
2. Add variables:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x7E917915Cefc7f98d6d3cA07f21c4B950803D1dD
   NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
   ```

3. Update `config/contract.ts` and `config/chains.ts` to use these variables

## Automatic Deployments

Once connected to GitHub:
- **Every push to `main`** → Deploys to production
- **Every PR** → Creates preview deployment
- **Every branch push** → Creates preview deployment

## Vercel CLI Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# Open current deployment
vercel open

# Check logs
vercel logs
```

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Test `npm run build` locally first

### Wrong Root Directory
- Make sure Root Directory is set to `frontend`
- Vercel must build from the frontend folder

### Missing Dependencies
- Run `npm install` in frontend folder
- Commit `package-lock.json`
- Push to GitHub

### 404 on Routes
- Next.js App Router is auto-configured
- No additional configuration needed

## Post-Deployment Checklist

✅ Site is live and accessible
✅ Wallet connection works
✅ Contract interactions function
✅ Game history loads
✅ Animations work smoothly
✅ Responsive on mobile

## Custom Domain Setup

1. Buy domain (Namecheap, GoDaddy, etc.)
2. Add to Vercel:
   - Dashboard → Domains → Add
   - Enter domain: `monadflip.com`
3. Configure DNS:
   - Add A record: `76.76.21.21`
   - Add CNAME: `cname.vercel-dns.com`
4. Wait for DNS propagation (5-60 minutes)

## Performance Tips

- Images auto-optimized by Next.js
- Automatic code splitting
- Edge caching enabled
- Gzip compression enabled

Your app is now live! 🎉

**Live URL**: Check Vercel dashboard for your deployment URL

## Support

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [GitHub Issues](https://github.com/0xkongz/monad-flip/issues)
