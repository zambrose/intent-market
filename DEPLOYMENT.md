# Vercel Deployment Guide

## Prerequisites
- Vercel account (free at vercel.com)
- Vercel CLI installed (you have it!)

## Database Setup Options

### Option 1: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Select your project (after initial deployment)
3. Go to "Storage" tab
4. Click "Create Database" → Select "Postgres"
5. Follow the setup wizard
6. Vercel will automatically add the `DATABASE_URL` to your environment

### Option 2: Supabase (Free tier)
1. Create account at supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy the connection string (use the "Prisma" format)
5. Add to Vercel environment variables as `DATABASE_URL`

### Option 3: Neon (Free tier)
1. Create account at neon.tech
2. Create new project
3. Copy the Prisma connection string
4. Add to Vercel environment variables as `DATABASE_URL`

## Deployment Steps

### 1. Initial Deploy
```bash
vercel
```
- Select your scope/team
- Link to existing project? No
- Project name: intent-market
- Directory: ./
- Override settings? No

### 2. Set Environment Variables
After deployment, go to Vercel dashboard:
1. Select your project
2. Go to "Settings" → "Environment Variables"
3. Add these variables:

```env
# Database (automatically added if using Vercel Postgres)
DATABASE_URL="your-database-url"

# Coinbase CDP
COINBASE_CDP_API_KEY="your-cdp-api-key"
COINBASE_CDP_API_SECRET="your-cdp-api-secret"
CDP_NETWORK="base-sepolia"
USDC_CONTRACT_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"

# OpenAI
OPENAI_API_KEY="your-openai-key"

# NextAuth (generate a secret)
NEXTAUTH_SECRET="generate-random-secret"
NEXTAUTH_URL="https://your-app.vercel.app"

# App URL
APP_BASE_URL="https://your-app.vercel.app"
```

### 3. Run Database Migrations
After setting up the database:

```bash
# Push your schema to the new database
pnpm prisma migrate deploy
```

Or use Vercel's UI:
1. Go to your project
2. Functions tab
3. Run the build command which includes migrations

### 4. Production Deploy
```bash
vercel --prod
```

## Important Notes

### Database Connection
- Vercel Postgres automatically handles connection pooling
- If using external DB, ensure you use the pooling connection string
- Add `?pgbouncer=true&connection_limit=1` to external DB URLs

### Environment Variables
- Set different values for Production, Preview, and Development
- Vercel automatically injects these at build time
- Never commit `.env` files

### CDP API Keys
- Add your Vercel domains to CDP allowlist:
  - `https://intent-market.vercel.app`
  - `https://*.vercel.app` (for preview deployments)
  - Your custom domain if you have one

### Prisma Configuration
- Already configured with:
  - `prisma generate` in build command
  - Migrations run on deploy
  - Generated client output to app directory

## Monitoring
- Check Functions tab for API logs
- Check Build logs for deployment issues
- Use Vercel Analytics for performance monitoring

## Troubleshooting

### Database Connection Issues
- Ensure DATABASE_URL is properly set
- Check if migrations ran successfully
- Verify connection string format matches your provider

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify Node version compatibility

### Environment Variables
- Double-check all required vars are set
- Use Vercel CLI to pull env vars locally: `vercel env pull`