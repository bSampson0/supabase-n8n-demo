import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import webhookRouter from './routes/webhook'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api', webhookRouter)

app.listen(PORT, () => {
  console.log(`\n  Server running on http://localhost:${PORT}`)
  console.log(`  POST /api/webhook/n8n  — receive n8n callbacks`)
  console.log(`  GET  /api/events/stream — SSE stream for the dashboard\n`)
})
