# Repository Monitoring Setup Guide

This guide walks you through setting up the complete GitHub/Netlify monitoring workflow using n8n.

## Overview

The monitoring system tracks:
- 🔀 Git pushes and commits
- 📝 Pull requests (opened, merged, closed)
- 🐛 GitHub issues
- 🚀 Netlify deployments (building, ready, failed)

Events are:
- Stored in Supabase `event_log` table
- Inserted into `deployments` table (for Netlify events)
- Broadcast to Dashboard via Server-Sent Events (SSE)
- Sent to Slack/Discord for team notifications

## Prerequisites

- [ ] Supabase project with migrations applied
- [ ] n8n instance (cloud or self-hosted)
- [ ] GitHub repository
- [ ] Netlify site linked to GitHub repo
- [ ] (Optional) Slack workspace or Discord server

## Step 1: Apply Supabase Migration

Run the event_log migration to create the table that stores all monitoring events:

```bash
npm run db:push
```

Or manually run `supabase/migrations/202604100002_create_event_log.sql` in the Supabase SQL Editor.

Verify the table exists:
```sql
SELECT * FROM public.event_log LIMIT 1;
```

## Step 2: Import n8n Workflow

### Option A: n8n Cloud
1. Log in to your n8n cloud account at https://app.n8n.cloud
2. Click **Workflows** → **Import from File**
3. Upload `n8n-workflows/repo-monitoring-workflow.json`
4. The workflow will open in the editor

### Option B: Self-Hosted n8n
1. Access your n8n instance
2. Click **Workflows** → **Import from File** or **Import from URL**
3. Upload `n8n-workflows/repo-monitoring-workflow.json`

## Step 3: Configure n8n Credentials

The workflow requires credentials for Supabase and notification services.

### 3.1 Supabase Service Role Credentials

1. In n8n, go to **Credentials** → **New**
2. Search for **Supabase**
3. Create credential with these values:
   - **Name**: `Supabase Service Role`
   - **Host**: Your Supabase URL (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Secret**: Your Supabase service role key (from Supabase Dashboard → Settings → API)

4. Save the credential

5. In the workflow, update these nodes:
   - **Insert to Event Log** node → Credentials tab → Select "Supabase Service Role"
   - **Insert to Deployments** node → Credentials tab → Select "Supabase Service Role"

### 3.2 Slack Credentials (Optional)

1. Create a Slack app at https://api.slack.com/apps
2. Add **OAuth Scopes**: `chat:write`, `chat:write.public`
3. Install app to workspace and copy **OAuth Token**
4. In n8n, create **Slack API** credential with the token
5. Update **Send Slack Notification** node → Credentials tab
6. Change the `#devops-alerts` channel to your preferred channel

### 3.3 Discord Webhook (Optional)

1. In Discord, go to Server Settings → Integrations → Webhooks
2. Create webhook for your channel and copy the URL
3. In n8n, create **Discord Webhook** credential with the URL
4. Update **Send Discord Notification** node → Credentials tab

## Step 4: Activate Workflow & Get Webhook URLs

1. In n8n workflow editor, click **Save**
2. Click **Active** toggle to enable the workflow
3. Click on the **GitHub Webhook** node
4. Copy the **Production URL** (e.g., `https://your-n8n.app.n8n.cloud/webhook/github-webhook`)
5. Click on the **Netlify Webhook** node
6. Copy the **Production URL** (e.g., `https://your-n8n.app.n8n.cloud/webhook/netlify-webhook`)

## Step 5: Configure GitHub Webhook

1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: Paste the GitHub webhook URL from n8n
   - **Content type**: `application/json`
   - **Secret**: (leave blank or set if you add signature validation)
   - **Which events**: Select individual events:
     - ✅ Pushes
     - ✅ Pull requests
     - ✅ Issues
   - ✅ Active

4. Click **Add webhook**
5. GitHub will send a test ping. Check n8n **Executions** to verify it was received.

## Step 6: Configure Netlify Deploy Notifications

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Build & deploy** → **Deploy notifications**
3. Click **Add notification** → **Outgoing webhook**
4. Configure:
   - **Event to listen for**:
     - Deploy started
     - Deploy succeeded
     - Deploy failed
   - **URL to notify**: Paste the Netlify webhook URL from n8n
5. Save

6. Trigger a deploy to test (push to your repo or click **Trigger deploy** in Netlify)

## Step 7: Update Backend Webhook URL (Production)

Once deployed to production, update the n8n workflow:

1. Open workflow in n8n
2. Click **Notify Backend (SSE)** node
3. Update the URL from `http://localhost:3001/api/webhook/n8n` to your production URL:
   - Example: `https://your-netlify-site.netlify.app/api/webhook/n8n`
4. Save the workflow

## Step 8: Test the Complete Flow

### Test GitHub Push
```bash
git commit --allow-empty -m "Test monitoring workflow"
git push
```

Check:
- ✅ n8n **Executions** tab shows successful run
- ✅ Supabase `event_log` table has new `github_push` row
- ✅ Dashboard Event Log shows the push event
- ✅ Slack/Discord receives notification (if configured)

### Test Pull Request
1. Create a new branch and open a PR on GitHub
2. Check n8n executions and Supabase `event_log` for `github_pr` event
3. Verify Dashboard and notifications

### Test Netlify Deploy
1. Push a change to trigger Netlify build
2. Check n8n executions for three events:
   - Deploy started (building)
   - Deploy succeeded (ready) or failed
3. Verify Supabase has both:
   - `event_log` row with `netlify_deploy`
   - `deployments` row (inserted when deploy finishes)
4. Check Dashboard for deployment appearing in table

## Troubleshooting

### Webhook not triggering n8n
- Verify workflow is **Active** in n8n
- Check webhook URL is correct (no trailing slash)
- Check GitHub/Netlify webhook delivery logs for errors
- For GitHub: Settings → Webhooks → Recent Deliveries

### Supabase insert failing
- Verify credentials use **Service Role Key**, not anon key
- Check n8n execution error logs
- Verify table exists: `SELECT * FROM public.event_log;`
- Check RLS policies allow service_role to insert

### Notifications not sending
- Verify Slack/Discord credentials are configured
- Check n8n node is not disabled
- Nodes are set to "Continue on Fail" so they won't break workflow

### SSE not receiving events in Dashboard
- Check backend server is running
- Verify webhook URL in n8n points to correct backend
- Check browser console for EventSource errors
- Verify CORS is enabled on server (already configured)

## Environment Variables

Make sure these are set in production:

**Server** (`.env` or Netlify environment variables):
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

**Client** (Netlify build environment):
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Architecture Diagram

```
┌─────────────┐
│   GitHub    │
│  (Push/PR)  │
└──────┬──────┘
       │ webhook
       ▼
┌─────────────────┐      ┌──────────────┐
│  Netlify Deploy │──────▶│   n8n        │
│   (Build Status)│      │  Workflow    │
└─────────────────┘      └──────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       ┌────────────┐   ┌──────────────┐  ┌────────────┐
       │  Supabase  │   │   Backend    │  │  Slack/    │
       │ event_log  │   │  SSE Stream  │  │  Discord   │
       │ deployments│   └──────┬───────┘  └────────────┘
       └────────────┘          │
                               ▼
                        ┌──────────────┐
                        │  Dashboard   │
                        │  (Realtime)  │
                        └──────────────┘
```

## Next Steps

- Add email notifications using n8n's email node
- Create aggregated daily/weekly reports
- Add custom metrics tracking
- Set up alerting for failed deployments
- Create dashboard widgets for monitoring trends

## Resources

- [n8n Documentation](https://docs.n8n.io/)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Netlify Deploy Notifications](https://docs.netlify.com/site-deploys/notifications/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
