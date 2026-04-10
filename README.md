# DevOps Hub

A deployment monitoring and automation demo using Supabase authentication and n8n workflow automation.

## Features

- 🔐 User authentication (login/signup) via Supabase
- 📊 Dashboard for monitoring deployments
- 🔗 Webhook integration for n8n automation
- ⚡ React + Vite frontend with Tailwind CSS
- 🚀 Express backend with JWT authentication

## Project Structure

```
├── auth.html          # Standalone auth page
├── dashboard.html     # Standalone dashboard
├── config.js          # Supabase credentials (gitignored)
├── client/            # React + Vite frontend
│   └── src/
│       ├── pages/     # AuthPage, Dashboard
│       ├── context/   # AuthContext
│       └── lib/       # Supabase client
└── server/            # Express backend
    └── src/
        ├── middleware/  # Auth middleware
        └── routes/      # Webhook routes
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

2. Copy the config example and add your Supabase credentials:
   ```bash
   cp config.example.js config.js
   ```
   
   Edit `config.js` with your Supabase URL and anon key from:
   **Supabase Dashboard → Project Settings → API**

3. Install dependencies:
   ```bash
   npm run install:all
   ```

4. Start the development servers:
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

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Auth:** Supabase Auth
- **Automation:** n8n webhooks

## License

MIT
