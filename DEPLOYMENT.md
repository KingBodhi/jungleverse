# Jungleverse Deployment Guide for Vercel

## Prerequisites
- Vercel account connected to your repository
- Database URL from Prisma or your PostgreSQL provider

## Environment Variables Required in Vercel Dashboard

Go to your Vercel project settings > Environment Variables and add:

1. **DATABASE_URL** (Required)
   - Value: Your PostgreSQL connection string
   - Example: `postgres://user:password@host:5432/database?sslmode=require`
   - Environment: Production, Preview, Development

2. **NEXT_PUBLIC_MAPBOX_TOKEN** (Optional - for map features)
   - Get from: https://www.mapbox.com/
   - Environment: Production, Preview, Development

3. **NEXT_PUBLIC_APP_URL**
   - Value: Public site URL (e.g. `https://jungleverse.com`)
   - Used for metadata + Open Graph tags

4. **NEXTAUTH_URL**
   - Value: Same as your deployed base URL (e.g. `https://jungleverse.com`)
   - Required for NextAuth callback + redirect logic

5. **NEXTAUTH_SECRET**
   - Value: Output of `openssl rand -base64 32`
   - Used to encrypt cookies/tokens

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Vercel will automatically detect changes and deploy
3. Make sure environment variables are set in Vercel dashboard

### Option 2: Manual Deployment via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Important Configuration Files

- `vercel.json` - Vercel deployment configuration
- `next.config.ts` - Next.js configuration
- `package.json` - Includes `postinstall` script for Prisma

## Troubleshooting

### Build Fails with Prisma Error
- Ensure `DATABASE_URL` is set in Vercel dashboard
- Check that `postinstall` script runs: `prisma generate`

### Database Connection Issues
- Verify DATABASE_URL format includes `?sslmode=require` for SSL connections
- Check database allows connections from Vercel IPs

### Build Size Limit
- Vercel Hobby plan has 250MB deployment limit
- Check node_modules size if deployment fails

## Post-Deployment

1. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

2. Seed database if needed:
   ```bash
   npm run db:seed
   ```

## Current Configuration

✅ Build command: `prisma generate && next build`
✅ Install command: `npm install`
✅ Postinstall hook: `prisma generate`
✅ Environment: `.env.local` (local), Vercel dashboard (production)
