import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { requireUser } from '../lib/auth-session'
import { HttpError, readJson, safeText } from '../lib/http'

type CheckoutItem = {
  productId?: string
  quantity?: number
}

const ADMIN_EMAIL = 'lumiere.csproject@gmail.com'

export const orderRoutes = new Hono<AppEnv>()

orderRoutes.post('/', async (c) => {
  if (c.req.header('Origin') !== c.env.CORS_ORIGIN) throw new HttpError(403, 'Invalid request origin.')
  const user = await requireUser(c)

  const idempotencyKey = safeText(c.req.header('Idempotency-Key'), 100)
  if (idempotencyKey.length < 8) throw new HttpError(400, 'Idempotency-Key header is required.')

  const existing = await c.env.DB
    .prepare('SELECT id FROM orders WHERE user_id = ? AND idempotency_key = ?')
    .bind(user.id, idempotencyKey)
    .first<{ id: string }>()

  if (existing) {
    return c.json({ ok: true, orderId: existing.id, duplicate: true })
  }

  const body = await readJson<{
    items?: CheckoutItem[]
    fullName?: string
    address1?: string
    address2?: string
    city?: string
    postalCode?: string
    country?: string
    state?: string
    phone?: string
    countryCode?: string
    deliveryMethod?: string
  }>(c)

  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : []
  if (items.length === 0) throw new HttpError(400, 'Your cart is empty.')

  const cleanItems = items.map((item) => ({
    productId: safeText(item.productId, 80),
    quantity: Number(item.quantity)
  }))

  if (cleanItems.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
    throw new HttpError(400, 'Cart contains an invalid item.')
  }

  const uniqueIds = [...new Set(cleanItems.map((item) => item.productId))]
  const placeholders = uniqueIds.map(() => '?').join(',')
  const result = await c.env.DB
    .prepare(
      `SELECT id, name, price_cents, stock FROM products
       WHERE active = 1 AND id IN (${placeholders})`
    )
    .bind(...uniqueIds)
    .all<{ id: string; name: string; price_cents: number; stock: number }>()

  const productMap = new Map(result.results.map((product) => [product.id, product]))
  if (productMap.size !== uniqueIds.length) throw new HttpError(400, 'One or more products are unavailable.')

  let subtotal = 0
  const normalized = cleanItems.map((item) => {
    const product = productMap.get(item.productId)!
    if (product.stock < item.quantity) throw new HttpError(409, `${product.name} does not have enough stock.`)
    subtotal += product.price_cents * item.quantity
    return { ...item, product }
  })

  const deliveryMethod = body.deliveryMethod === 'pickup' ? 'pickup' : 'delivery'
  const state = safeText(body.state, 80)
  const eastMalaysia = ['Sabah', 'Sarawak', 'W.P. Labuan'].includes(state)
  const shipping = deliveryMethod === 'pickup' ? 0 : (subtotal >= 8000 ? 0 : 799) + (eastMalaysia ? 3000 : 0)
  const tax = Math.round(subtotal * 0.06)
  const total = subtotal + shipping + tax

  const fullName = safeText(body.fullName, 80)
  const address1 = safeText(body.address1, 120)
  const address2 = safeText(body.address2, 120)
  const city = safeText(body.city, 80)
  const postalCode = safeText(body.postalCode, 20)
  const country = safeText(body.country, 60)
  const phone = `${safeText(body.countryCode, 8)}${safeText(body.phone, 30)}`

  if (!fullName || !address1 || !city || !postalCode || !country) {
    throw new HttpError(400, 'Complete the shipping address.')
  }

  // 🔥 THE FIX: Generate a short, 8-character uppercase hex string for all new orders
  const orderId = crypto.randomUUID().split('-')[0].toUpperCase()
  
  // Generate the unique 6-digit PIN
  const verificationPin = Math.floor(100000 + Math.random() * 900000).toString()
  const now = Math.floor(Date.now() / 1000)
  
  const statements: D1PreparedStatement[] = [
    c.env.DB
      .prepare(
        `INSERT INTO orders
         (id, user_id, status, subtotal_cents, shipping_cents, tax_cents, total_cents,
          shipping_name, address1, address2, city, postal_code, country, idempotency_key, created_at, verification_pin,
          delivery_method, state, phone)
         VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        orderId,
        user.id,
        subtotal,
        shipping,
        tax,
        total,
        fullName,
        address1,
        address2,
        city,
        postalCode,
        country,
        idempotencyKey,
        now,
        verificationPin,
        deliveryMethod,
        state,
        phone
      )
  ]

  for (const item of normalized) {
    statements.push(
      c.env.DB
        .prepare(
          `INSERT INTO order_items
           (id, order_id, product_id, product_name, unit_price_cents, quantity)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          orderId,
          item.product.id,
          item.product.name,
          item.product.price_cents,
          item.quantity
        )
    )
    statements.push(
      c.env.DB
        .prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .bind(item.quantity, item.product.id, item.quantity)
    )
  }

  await c.env.DB.batch(statements)

  return c.json(
    {
      ok: true,
      orderId,
      totals: { subtotal, shipping, tax, total },
      message: 'Dummy checkout complete. No payment was processed.'
    },
    201
  )
})

// ADMIN ROUTE: Must be placed BEFORE /:id
orderRoutes.get('/all', async (c) => {
  const user = await requireUser(c)
  
  if (user.email !== ADMIN_EMAIL) {
    throw new HttpError(403, 'Unauthorized. Admin access only.')
  }
  
  const result = await c.env.DB
    .prepare(
      `SELECT orders.id, orders.status, orders.tracking_number, orders.subtotal_cents, orders.shipping_cents, orders.tax_cents, orders.total_cents,
              orders.shipping_name, orders.delivery_method, orders.state, orders.phone, user.email, orders.created_at, orders.verification_pin
       FROM orders 
       LEFT JOIN user ON orders.user_id = user.id
       ORDER BY orders.created_at DESC LIMIT 100`
    )
    .all()

  return c.json({ orders: result.results })
})

orderRoutes.get('/', async (c) => {
  const user = await requireUser(c)

  const result = await c.env.DB
    .prepare(
      `SELECT id, status, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents, delivery_method, created_at, verification_pin
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(user.id)
    .all()

  return c.json({ orders: result.results })
})

orderRoutes.get('/:id', async (c) => {
  const user = await requireUser(c)
  const orderId = safeText(c.req.param('id'), 80)
  
  let order;
  if (user.email === ADMIN_EMAIL) {
    order = await c.env.DB
      .prepare(
        `SELECT id, status, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents,
                shipping_name, address1, address2, city, postal_code, country, delivery_method, state, phone, created_at, verification_pin
         FROM orders WHERE id = ?`
      )
      .bind(orderId)
      .first()
  } else {
    order = await c.env.DB
      .prepare(
        `SELECT id, status, tracking_number, subtotal_cents, shipping_cents, tax_cents, total_cents,
                shipping_name, address1, address2, city, postal_code, country, delivery_method, state, phone, created_at, verification_pin
         FROM orders WHERE id = ? AND user_id = ?`
      )
      .bind(orderId, user.id)
      .first()
  }

  if (!order) throw new HttpError(404, 'Order not found.')

  const items = await c.env.DB
    .prepare(
      `SELECT product_id, product_name, unit_price_cents, quantity
       FROM order_items WHERE order_id = ?`
    )
    .bind(orderId)
    .all()

  return c.json({ order, items: items.results })
})

orderRoutes.patch('/:id/shipping', async (c) => {
  const user = await requireUser(c)
  
  if (user.email !== ADMIN_EMAIL) {
    throw new HttpError(403, 'Unauthorized. Admin access only.')
  }
  
  const orderId = safeText(c.req.param('id'), 80)
  const body = await readJson<{ status?: string, tracking_number?: string }>(c)
  
  const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'ready', 'collected', 'preparing']
  if (!body.status || !validStatuses.includes(body.status.toLowerCase())) {
    throw new HttpError(400, 'Invalid status update.')
  }

  const result = await c.env.DB
    .prepare(`UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?`)
    .bind(body.status.toLowerCase(), body.tracking_number || null, orderId)
    .run()

  if (result.success) {
    return c.json({ ok: true, message: 'Shipping status updated successfully' })
  }
  
  throw new HttpError(500, 'Failed to update order')
})
