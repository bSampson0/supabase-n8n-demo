# DevOps Hub

A deployment monitoring and automation demo using Supabase authentication and n8n workflow automation.

## Features

- 🔐 **User authentication** (login/signup) via Supabase
- 📊 **Dashboard** for monitoring deployments with real-time updates
- 🔗 **n8n workflow integration** for GitHub and Netlify monitoring
- 🚀 **Automated deployment tracking** - monitors pushes, PRs, issues, and Netlify builds
- 📡 **Real-time notifications** via Server-Sent Events (SSE)
- 💬 **Team notifications** to Slack/Discord
- ⚡ **React + Vite frontend** with Tailwind CSS
- 🔧 **Express backend** with SSE streaming and webhook endpoints

## Project Structure

```
├── client/                 # React + Vite frontend
│   └── src/
│       ├── pages/         # AuthPage, Dashboard
│       ├── context/       # AuthContext
│       └── lib/           # Supabase client
├── server/                # Express backend
│   └── src/
│       ├── middleware/    # Auth middleware
│       └── routes/        # Webhook routes (SSE + n8n)
├── supabase/              # Database migrations
│   └── migrations/        # SQL migration files
├── n8n-workflows/         # n8n workflow definitions
│   └── repo-monitoring-workflow.json
├── netlify.toml           # Netlify deployment config
├── render.yaml            # Render.com deployment config
└── DEPLOYMENT.md          # Production deployment guide
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project ([create one here](https://supabase.com))
- (Optional) n8n for workflow automation

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/supabase-n8n-demo.git
   cd supabase-n8n-demo
   ```

2. Create the frontend env file and add your Supabase credentials:
   ```bash
   cp client/.env.example client/.env
   ```

   Edit `client/.env` with your Supabase URL and anon key from:
   **Supabase Dashboard → Project Settings → API**

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Install dependencies:
   ```bash
   npm run install:all
   ```

4. Create the Supabase schema used by the dashboard:

   If you use the Supabase CLI, add the migration in this repo and push it:
   ```bash
   supabase db push
   ```

   If you are using the Supabase dashboard directly, open the SQL Editor and run:
   ```sql
   -- contents of supabase/deployments.sql
   ```

5. Start the development servers:
   ```bash
   npm run dev
   ```

   This runs both the client (Vite) and server (Express) concurrently.

## Environment Variables

For the server, create a `.env` file in `/server`:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=3001
```

The legacy standalone pages at the repo root still use `config.js`. The React app under `client/` uses `client/.env`.

## Supabase Migrations

The application uses two database tables:

- `supabase/migrations/202604100001_create_deployments.sql` - Main deployments table
- `supabase/migrations/202604100002_create_event_log.sql` - Event log for GitHub/Netlify monitoring
- `supabase/deployments.sql` - Convenience copy for manual SQL Editor execution

### CLI Workflow

If this repo does not have a `supabase/config.toml` yet, initialize it once:

```bash
npm run supabase:init
```

Authenticate the Supabase CLI before linking or pushing migrations:

```bash
npm run supabase:login
```

If you prefer not to use the interactive login flow, set an access token in your shell instead:

```bash
export SUPABASE_ACCESS_TOKEN=your-personal-access-token
```

Create the token in Supabase Dashboard → Account Settings → Access Tokens.

Link the repo to your Supabase project:

```bash
npm run supabase:link
```

Apply migrations:

```bash
npm run db:push
```

Create a new migration file:

```bash
npm run db:new -- add_some_table
```

Full sequence for a new machine:

```bash
npm run supabase:init
npm run supabase:login
npm run supabase:link
npm run db:push
```

## Repository Monitoring with n8n

The application includes a complete GitHub and Netlify monitoring workflow:

1. **Import the workflow**: `n8n-workflows/repo-monitoring-workflow.json`
2. **Configure webhooks**:
   - GitHub: Repository Settings → Webhooks
   - Netlify: Site Settings → Deploy notifications
3. **Track events**:
   - Git pushes and commits
   - Pull requests (opened, merged, closed)
   - GitHub issues
   - Netlify deployments (building, ready, failed)
4. **Get notifications**: Slack, Discord, or custom webhooks

See `SETUP_MONITORING.md` for detailed configuration instructions.

## Deployment

### Quick Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/supabase-n8n-demo)

**Note**: The "Deploy to Netlify" button deploys the frontend only. You'll need to separately deploy the backend server.

### Production Deployment

This application requires two separate deployments:

1. **Frontend (Netlify)**: Static React app
2. **Backend (Render/Railway)**: Express server with SSE support

See the complete deployment guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Steps

1. **Deploy Backend to Render**:
   - Connect GitHub repo
   - Render auto-detects `render.yaml`
   - Set environment variables (Supabase credentials)
   - Copy deployed server URL

2. **Deploy Frontend to Netlify**:
   - Connect GitHub repo
   - Netlify auto-detects `netlify.toml`
   - Set environment variables including `VITE_API_URL` (your Render server URL)
   - Deploy

3. **Configure n8n**:
   - Import workflow
   - Update webhook URLs
   - Configure GitHub/Netlify webhooks

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, Server-Sent Events
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **Automation:** n8n workflow engine
- **Hosting:** Netlify (frontend), Render (backend)

## Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete production deployment guide
- **[SETUP_MONITORING.md](./SETUP_MONITORING.md)** - Configure GitHub/Netlify monitoring
- **[CLAUDE.md](./CLAUDE.md)** - Architecture documentation for AI assistants

## License

MIT
