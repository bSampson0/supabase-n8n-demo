# Deployment Guide

This guide covers deploying the DevOps Hub application to production using Netlify (frontend) and Render (backend).

## Architecture Overview

The application is split into two deployable parts:
- **Client (React + Vite)**: Deployed to **Netlify** as a static site
- **Server (Express + SSE)**: Deployed to **Render** (or Railway/Heroku) to support long-lived connections

## Prerequisites

- [ ] GitHub account with repository access
- [ ] Supabase project created
- [ ] Netlify account
- [ ] Render account (or alternative: Railway, Heroku, Fly.io)
- [ ] (Optional) n8n instance for monitoring workflow

## Part 1: Deploy the Backend Server

The Express server must be deployed to a platform that supports Server-Sent Events (SSE). Netlify Functions don't support SSE, so we use Render.

### Option A: Deploy to Render (Recommended)

#### 1.1 Using Render Blueprint (Easiest)

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and configure the service
6. Set environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (from Dashboard → Settings → API)
7. Click **Apply** to deploy

#### 1.2 Manual Render Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `devops-hub-server`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `npm install --prefix server && npm run build --prefix server`
   - **Start Command**: `npm run start --prefix server`
   - **Plan**: Free (or upgrade for production)
5. Add environment variables:
   - `PORT`: `3001`
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
6. Click **Create Web Service**

#### 1.3 Get Your Server URL

After deployment completes:
- Your server will be available at: `https://devops-hub-server.onrender.com`
- Test the health endpoint: `https://devops-hub-server.onrender.com/api/health`
- Copy this URL - you'll need it for Netlify configuration

### Option B: Deploy to Railway

1. Go to [Railway](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will auto-detect Node.js
5. Add environment variables in the **Variables** tab:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PORT`: `3001`
6. Set build and start commands in **Settings**:
   - **Build Command**: `npm install --prefix server && npm run build --prefix server`
   - **Start Command**: `npm run start --prefix server`
7. Deploy and copy your Railway URL

## Part 2: Deploy the Frontend to Netlify

### 2.1 Connect GitHub Repository

1. Go to [Netlify](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** and authorize Netlify
4. Select your `supabase-n8n-demo` repository
5. Netlify will auto-detect the `netlify.toml` configuration

### 2.2 Configure Environment Variables

In Netlify site settings → **Environment variables**, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://devops-hub-server.onrender.com
```

**Important**: `VITE_API_URL` should be your deployed server URL from Step 1.3 (no trailing slash).

### 2.3 Deploy

1. Click **Deploy site**
2. Netlify will:
   - Install dependencies in `client/`
   - Build the Vite app
   - Publish `client/dist` to CDN
3. Wait for deployment to complete
4. Your site will be live at: `https://random-name.netlify.app`

### 2.4 Custom Domain (Optional)

1. Go to **Domain settings**
2. Click **Add custom domain**
3. Follow instructions to configure DNS

## Part 3: Configure n8n Webhooks

Now that both frontend and backend are deployed, update your n8n workflow:

### 3.1 Update Backend Webhook URL

1. Open your n8n workflow (from `n8n-workflows/repo-monitoring-workflow.json`)
2. Find the **"Notify Backend (SSE)"** node
3. Update the URL to: `https://devops-hub-server.onrender.com/api/webhook/n8n`
4. Save and re-activate the workflow

### 3.2 Test the Integration

1. Push a commit to GitHub
2. Check n8n executions
3. Verify the event appears in your deployed Dashboard
4. Check Supabase `event_log` table

## Part 4: Apply Database Migrations

If you haven't already applied the migrations:

```bash
# Link to your Supabase project
npm run supabase:link

# Apply migrations
npm run db:push
```

Or run the SQL files directly in Supabase SQL Editor:
1. `supabase/migrations/202604100001_create_deployments.sql`
2. `supabase/migrations/202604100002_create_event_log.sql`

## Part 5: Configure GitHub & Netlify Webhooks

Follow the instructions in `SETUP_MONITORING.md` to configure:

1. **GitHub Webhooks**: Point to your n8n GitHub webhook URL
2. **Netlify Deploy Notifications**: Point to your n8n Netlify webhook URL

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Verify `VITE_API_URL` is set correctly in Netlify environment variables
2. Check that the server URL doesn't have a trailing slash
3. Ensure the server is deployed and accessible

### SSE Connection Fails

- Check that server is running: Visit `https://your-server.onrender.com/api/health`
- Render free tier may spin down after inactivity - first request might be slow
- Check browser console for EventSource errors

### Environment Variables Not Working

- Netlify requires rebuild after changing environment variables
- Go to **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

### Build Failures

**Client build fails:**
- Check that all environment variables are set
- Verify `client/.env.example` matches your actual `.env` structure
- Check build logs for missing dependencies

**Server build fails:**
- Ensure build command is: `npm install --prefix server && npm run build --prefix server`
- Check TypeScript compilation errors in logs

## Production Checklist

- [ ] Supabase database migrations applied
- [ ] Server deployed and health check passes
- [ ] Frontend deployed to Netlify
- [ ] All environment variables configured
- [ ] n8n workflow updated with production URLs
- [ ] GitHub webhooks configured
- [ ] Netlify deploy notifications configured
- [ ] Test full flow: GitHub push → n8n → Supabase → Dashboard
- [ ] SSL/HTTPS enabled (automatic on Netlify and Render)
- [ ] Custom domain configured (optional)
- [ ] Monitoring/logging configured (Render provides logs)

## Deployment Updates

To deploy updates:

### Client Changes
Push to GitHub → Netlify auto-deploys

### Server Changes
Push to GitHub → Render/Railway auto-deploys

### Force Rebuild
- **Netlify**: Deploys → Trigger deploy → Clear cache and deploy
- **Render**: Manual Deploy → Deploy latest commit

## Alternative Server Hosting Options

If you prefer not to use Render:

- **Railway**: Similar to Render, good free tier
- **Fly.io**: Edge hosting, good for global distribution
- **Heroku**: Classic PaaS (no longer has free tier)
- **DigitalOcean App Platform**: Simple PaaS with good pricing
- **AWS Elastic Beanstalk**: If you need AWS integration

All support long-lived connections required for SSE.

## Cost Estimate

- **Supabase**: Free tier (2 projects, 500 MB database)
- **Netlify**: Free tier (100 GB bandwidth/month)
- **Render**: Free tier (750 hours/month, spins down after inactivity)
- **n8n Cloud**: $20/month (or self-host for free)

**Total monthly cost**: $0 - $20 depending on n8n setup
