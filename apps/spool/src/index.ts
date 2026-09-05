import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import spoolRoutes from './routes/spool.routes'

const app = new Hono()

// Request logging middleware
app.use('*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path} from ${c.req.header('x-forwarded-for') || c.req.header('host')}`)
  const start = Date.now()
  await next()
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path} → ${c.res.status} (${Date.now() - start}ms)`)
})

app.route('/spool', spoolRoutes)

app.get('/', (c) => c.text('Spool service is running'))

const port = 3001
console.log(`Server is running on port ${port}`)
serve({
  fetch: app.fetch,
  port
})
