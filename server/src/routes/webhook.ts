import { Router, Request, Response } from 'express'

const router = Router()

// In-memory set of SSE clients
const clients = new Set<Response>()

// ── GET /api/events/stream ────────────────────────────────────────────────────
// Dashboard connects here to receive real-time n8n events via SSE
router.get('/events/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  // Send a heartbeat so the client knows it's connected
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`)

  clients.add(res)
  console.log(`SSE client connected (total: ${clients.size})`)

  // Keep connection alive with periodic pings
  const ping = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
  }, 20_000)

  req.on('close', () => {
    clearInterval(ping)
    clients.delete(res)
    console.log(`SSE client disconnected (total: ${clients.size})`)
  })
})

// ── POST /api/webhook/n8n ─────────────────────────────────────────────────────
// n8n sends a callback here after processing GitHub/Netlify/deployment events.
// The payload is broadcast to all connected dashboard clients via SSE.
router.post('/webhook/n8n', (req: Request, res: Response) => {
  const payload = req.body

  // Log event type for debugging
  const eventType = payload.event_type || 'unknown'
  const eventAction = payload.event_action || 'unknown'
  console.log(`n8n webhook received: ${eventType} (${eventAction})`)
  console.log('Payload:', JSON.stringify(payload, null, 2))

  const message = JSON.stringify({
    type: 'n8n_event',
    payload,
    timestamp: new Date().toISOString(),
  })

  let delivered = 0
  clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`)
      delivered++
    } catch (err) {
      console.error('Failed to send to SSE client:', err)
      clients.delete(client)
    }
  })

  console.log(`Broadcast to ${delivered} SSE client(s)`)
  res.json({ ok: true, delivered, event_type: eventType })
})

export default router
