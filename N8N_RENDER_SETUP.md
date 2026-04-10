# n8n + Render Setup Guide

## Overview

This guide explains how to configure the n8n monitoring workflow when deploying your backend to Render.

## Architecture

```
┌─────────────┐
│   GitHub    │──┐
└─────────────┘  │
                 │  Webhooks
┌─────────────┐  │
│   Netlify   │──┤
└─────────────┘  │
                 ▼
         ┌───────────────┐
         │  n8n Workflow │ (receives webhooks)
         └───────┬───────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐  ┌────────┐  ┌──────────┐
│Supabase │  │ Render │  │Slack/    │
│(Database)  │(Backend)  │Discord   │
└─────────┘  └────┬───┘  └──────────┘
                  │
                  ▼ SSE
            ┌──────────┐
            │Dashboard │
            └──────────┘
```

**Key Point**: GitHub and Netlify send webhooks to **n8n**, not to Render. n8n then forwards events to your Render backend.

## Step 1: Deploy Your Backend to Render

First, make sure your backend is deployed to Render (see DEPLOYMENT.md).

Once deployed, you'll have a URL like:
```
https://devops-hub-server.onrender.com
```

Test that it's working:
```bash
curl https://devops-hub-server.onrender.com/api/health
```

You should see: `{"status":"ok","timestamp":"..."}`

## Step 2: Import Workflow to n8n

### 2.1 Access Your n8n Instance

**If using n8n Cloud:**
- Go to https://app.n8n.cloud
- Log in to your account

**If self-hosting n8n:**
- Access your n8n instance URL
- Log in

### 2.2 Import the Workflow

1. In n8n, click **Workflows** in the sidebar
2. Click the **+** button or **Add workflow**
3. Click the **⋯** (three dots menu) → **Import from File**
4. Select `n8n-workflows/repo-monitoring-workflow.json` from your repository
5. The workflow will open in the editor

## Step 3: Configure Supabase Credentials

### 3.1 Create Supabase Credential

1. In n8n, click **Credentials** in the sidebar
2. Click **Add Credential**
3. Search for **Supabase**
4. Fill in:
   - **Name**: `Supabase Service Role` (or any name you prefer)
   - **Host**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Secret**: Your service role key from Supabase Dashboard → Settings → API
5. Click **Save**

### 3.2 Assign Credential to Nodes

The workflow has two Supabase nodes that need credentials:

1. Click on the **"Insert to Event Log"** node
2. In the right panel, click the **Credentials** tab
3. Select your **Supabase Service Role** credential
4. Repeat for the **"Insert to Deployments"** node

## Step 4: Update Backend URL for Render

This is the **key change** for Render deployment!

### 4.1 Find the "Notify Backend (SSE)" Node

1. In the workflow canvas, locate the **"Notify Backend (SSE)"** node
2. Click on it to open the configuration panel

### 4.2 Update the URL

1. In the **URL** field, you'll see: `http://localhost:3001/api/webhook/n8n`
2. Replace it with your Render backend URL:
   ```
   https://devops-hub-server.onrender.com/api/webhook/n8n
   ```
   (Replace `devops-hub-server` with your actual Render service name)

3. Make sure there's **no trailing slash**

### 4.3 Test Configuration (Optional but Recommended)

You can test this node:
1. Click the **Test** tab at the bottom
2. Click **Test node** or **Execute node**
3. Check if it successfully connects to your Render backend

## Step 5: Configure Optional Notifications

If you want Slack/Discord notifications:

### For Slack:
1. Create a Slack app at https://api.slack.com/apps
2. Add OAuth scopes: `chat:write`, `chat:write.public`
3. Install to workspace and copy OAuth token
4. In n8n: **Credentials** → **Add Credential** → **Slack API**
5. Paste your OAuth token
6. Click on **"Send Slack Notification"** node → **Credentials** → Select your Slack credential
7. Update the `#devops-alerts` channel to your preferred channel

### For Discord:
1. In Discord: Server Settings → Integrations → Webhooks → Create Webhook
2. Copy the webhook URL
3. In n8n: **Credentials** → **Add Credential** → **Discord Webhook**
4. Paste webhook URL
5. Click on **"Send Discord Notification"** node → **Credentials** → Select your Discord credential

## Step 6: Activate the Workflow

1. Click **Save** in the top-right corner
2. Toggle the **Active** switch to ON
3. The workflow is now running and waiting for webhooks!

## Step 7: Get Your n8n Webhook URLs

Now that the workflow is active, you need the webhook URLs for GitHub and Netlify:

### 7.1 Get GitHub Webhook URL

1. Click on the **"GitHub Webhook"** node
2. In the right panel, look for **Production URL** or **Webhook URL**
3. Copy the URL - it will look like:
   ```
   https://your-n8n-instance.app.n8n.cloud/webhook/github-webhook
   ```
   Or if self-hosting:
   ```
   https://your-domain.com/webhook/github-webhook
   ```

### 7.2 Get Netlify Webhook URL

1. Click on the **"Netlify Webhook"** node
2. Copy the **Production URL**:
   ```
   https://your-n8n-instance.app.n8n.cloud/webhook/netlify-webhook
   ```

**Important**: Keep these URLs handy - you'll need them in the next step!

## Step 8: Configure GitHub Webhooks

1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: Paste your n8n GitHub webhook URL
   - **Content type**: `application/json`
   - **SSL verification**: Enable SSL verification (recommended)
   - **Which events would you like to trigger this webhook?**
     - Select **Let me select individual events**
     - Check:
       - ✅ **Pushes**
       - ✅ **Pull requests**
       - ✅ **Issues**
   - ✅ **Active**
4. Click **Add webhook**

### Test GitHub Webhook

1. GitHub will send a test ping immediately
2. Go to your n8n workflow → **Executions** tab
3. You should see a successful execution
4. If not, check **Recent Deliveries** in GitHub webhook settings for errors

## Step 9: Configure Netlify Deploy Notifications

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Build & deploy** → **Deploy notifications**
3. Click **Add notification** → **Outgoing webhook**
4. Configure three separate webhooks (or at least the events you care about):

   **Webhook 1 - Deploy Started:**
   - Event: **Deploy started**
   - URL: Your n8n Netlify webhook URL

   **Webhook 2 - Deploy Succeeded:**
   - Event: **Deploy succeeded**
   - URL: Your n8n Netlify webhook URL

   **Webhook 3 - Deploy Failed:**
   - Event: **Deploy failed**
   - URL: Your n8n Netlify webhook URL

5. Save each notification

### Test Netlify Webhook

1. Trigger a deploy in Netlify (push to GitHub or click **Trigger deploy**)
2. Check n8n **Executions** tab for new executions
3. You should see events for: building → ready (or failed)

## Step 10: Verify Complete Flow

### Test End-to-End:

1. **Push a commit to GitHub:**
   ```bash
   git commit --allow-empty -m "Test n8n monitoring"
   git push
   ```

2. **Check each step:**
   - ✅ n8n execution appears in **Executions** tab
   - ✅ Supabase `event_log` table has new row:
     ```sql
     SELECT * FROM event_log ORDER BY created_at DESC LIMIT 5;
     ```
   - ✅ Dashboard shows event in Event Log (if deployed)
   - ✅ Slack/Discord notification sent (if configured)

3. **Check Render logs:**
   - Go to Render Dashboard → Your service → Logs
   - You should see: `n8n webhook received: github_push (pushed)`

## Troubleshooting

### n8n Webhook Not Triggering

**Check GitHub/Netlify webhook delivery:**
- GitHub: Settings → Webhooks → Your webhook → Recent Deliveries
- Netlify: Site settings → Deploy notifications → Check recent deliveries

**Common issues:**
- Webhook URL is incorrect or has typos
- n8n workflow is not active (check the toggle)
- SSL certificate issues (if self-hosting n8n)

### Events Not Appearing in Supabase

**Check n8n execution logs:**
1. Go to **Executions** tab in n8n
2. Click on a failed execution
3. Look for error messages in the **"Insert to Event Log"** node

**Common issues:**
- Supabase credentials are wrong
- Using anon key instead of service role key
- RLS policies blocking inserts (should allow service_role)

### Backend Not Receiving Events

**Check the "Notify Backend (SSE)" node:**
- URL is correct and points to Render
- No trailing slash in URL
- Node is set to "Continue on Fail" (so it doesn't break the workflow)

**Check Render backend logs:**
- Render Dashboard → Your service → Logs
- Look for incoming POST requests to `/api/webhook/n8n`

**Common issues:**
- Render app is sleeping (free tier spins down after inactivity)
- URL has typo or wrong service name
- CORS issues (server has CORS enabled, so this should be fine)

### Dashboard Not Showing Real-time Events

**Check SSE connection:**
- Open browser console on Dashboard
- Look for EventSource connection errors
- Verify `VITE_API_URL` is set correctly in Netlify environment variables

**Check Render backend:**
- Health endpoint works: `curl https://your-render-url.onrender.com/api/health`
- SSE endpoint is accessible: `curl https://your-render-url.onrender.com/api/events/stream`

## Important Notes for Render

### Free Tier Considerations

Render's free tier:
- ✅ Supports long-lived connections (SSE works!)
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ Cold starts can take 30+ seconds

**Impact:**
- First request after idle period will be slow
- SSE connection may drop when backend sleeps
- Dashboard will reconnect automatically on next page load

**Solutions:**
- Upgrade to paid tier ($7/month) for always-on
- Use external uptime monitor to ping health endpoint every 10 minutes
- Accept the limitation for development/demo purposes

### Monitoring Render Backend

**Check health:**
```bash
curl https://your-render-url.onrender.com/api/health
```

**View logs:**
- Render Dashboard → Your service → Logs (real-time)

**Metrics:**
- Render Dashboard → Your service → Metrics
- Shows CPU, memory, request volume

## Summary

✅ **What you did:**
1. Deployed backend to Render
2. Imported n8n workflow
3. Configured Supabase credentials
4. Updated backend URL in n8n to point to Render
5. Activated workflow and got webhook URLs
6. Configured GitHub and Netlify to send webhooks to n8n
7. Tested the complete flow

✅ **Event flow:**
```
GitHub/Netlify
    ↓ webhook
  n8n
    ├→ Supabase (event_log)
    ├→ Render Backend (SSE broadcast)
    └→ Slack/Discord (notifications)
```

**The key difference with Render**: You just update one URL in the n8n workflow. Everything else stays the same! GitHub and Netlify still send webhooks to n8n, not to Render.
