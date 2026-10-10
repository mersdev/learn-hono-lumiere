import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { AppEnv } from './types'
import { createAuth } from './lib/auth'
import { productRoutes } from './routes/products'
import { orderRoutes } from './routes/orders'
import { wishlistRoutes } from './routes/wishlist'
import { HttpError } from './lib/http'

const app = new Hono<AppEnv>()

app.use('*', secureHeaders())

app.use('/api/*', async (c, next) => {
  const middleware = cors({
    origin: (origin) => {
      if (origin === 'http://localhost:8788' || origin === c.env.CORS_ORIGIN) {
        return origin
      }
      return c.env.CORS_ORIGIN
    },
    // CRITICAL: Ensure 'PATCH' is in this array to allow database updates
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Captcha-Response', 'Idempotency-Key', 'Authorization'],
    credentials: true,
    maxAge: 86400
  })
  return middleware(c, next)
})

app.get('/health', (c) => c.json({ ok: true, service: 'lumiere-api' }))

// Links sent before the storefront callback URLs were made absolute.
app.get('/verify/', (c) => c.redirect(new URL(`/verify/${new URL(c.req.url).search}`, c.env.APP_ORIGIN).toString()))
app.get('/reset-password/', (c) => c.redirect(new URL(`/reset-password/${new URL(c.req.url).search}`, c.env.APP_ORIGIN).toString()))

app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))
app.route('/api/products', productRoutes)
app.route('/api/orders', orderRoutes)
app.route('/api/user/wishlist', wishlistRoutes)

app.notFound((c) => c.json({ error: 'Not found.' }, 404))

app.onError((error, c) => {
  if (error instanceof HttpError) {
    return c.json({ error: error.message }, error.status as any)
  }

  console.error(error)
  return c.json({ error: 'Internal server error.' }, 500)
})

export default app
