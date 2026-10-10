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

app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const path = new URL(c.req.url).pathname
  if (path.startsWith('/api/auth/two-factor/') && !['/api/auth/two-factor/send-otp', '/api/auth/two-factor/verify-otp'].includes(path)) {
    return c.json({ error: 'Only email PIN verification is available.' }, 403)
  }
  if (path === '/api/auth/two-factor/verify-otp' && c.req.method === 'POST') {
    const body = await c.req.raw.clone().json().catch(() => null) as { trustDevice?: boolean; code?: string } | null
    if (body?.trustDevice || !/^\d{6}$/.test(body?.code ?? '')) return c.json({ error: 'Enter a six-digit email PIN without trusting this device.' }, 400)
  }
  if (path === '/api/auth/two-factor/send-otp' && c.req.method === 'POST') {
    const body = await c.req.raw.clone().json().catch(() => null) as { trustDevice?: boolean } | null
    if (body?.trustDevice) return c.json({ error: 'Trusted devices are unavailable.' }, 400)
  }
  let request = c.req.raw
  if (path === '/api/auth/sign-in/email') {
    const headers = new Headers(c.req.raw.headers)
    const cookies = headers.get('cookie')?.split(';').map((cookie) => cookie.trim()).filter((cookie) => !/^(?:__Secure-)?better-auth\.trust_device=/.test(cookie))
    if (cookies) headers.set('cookie', cookies.join('; '))
    request = new Request(c.req.raw, { headers })
  }
  let deliveryFailed = false
  const response = await createAuth(c.env, () => { deliveryFailed = true }).handler(request)
  if (deliveryFailed) return c.json({ error: 'Unable to send the email PIN. Please try again.' }, 502)
  return response ?? c.json({ error: 'Authentication response unavailable.' }, 500)
})
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
