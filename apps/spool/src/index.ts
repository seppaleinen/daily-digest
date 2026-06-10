import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import spoolRoutes from './routes/spool.routes'

const app = new Hono()

app.route('/spool', spoolRoutes)

app.get('/', (c) => c.text('Spool service is running'))

const port = 3000
console.log(`Server is running on port ${port}`)
serve({
  fetch: app.fetch,
  port
})
