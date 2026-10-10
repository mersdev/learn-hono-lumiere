import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { requireUser } from '../lib/auth-session'
import { HttpError, readJson, safeText } from '../lib/http'

export const productRoutes = new Hono<AppEnv>()

productRoutes.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.header('Origin') !== c.env.CORS_ORIGIN) throw new HttpError(403, 'Invalid request origin.')
  await next()
})

const ADMIN_EMAIL = 'lumiere.csproject@gmail.com'

// PUBLIC ROUTE: Get all products for storefront and admin catalog
productRoutes.get('/', async (c) => {
  const result = await c.env.DB
    .prepare('SELECT * FROM products WHERE active = 1')
    .all()
  
  return c.json({ products: result.results })
})

productRoutes.get('/admin/all', async (c) => {
  const user = await requireUser(c)
  if (user.email !== ADMIN_EMAIL) throw new HttpError(403, 'Unauthorized. Admin access only.')
  const result = await c.env.DB.prepare('SELECT * FROM products ORDER BY name').all()
  return c.json({ products: result.results })
})

// PUBLIC ROUTE: Get a single product's details
productRoutes.get('/:id', async (c) => {
  const productId = safeText(c.req.param('id'), 80)
  const product = await c.env.DB
    .prepare('SELECT * FROM products WHERE id = ? AND active = 1')
    .bind(productId)
    .first()

  if (!product) throw new HttpError(404, 'Product not found.')
  
  return c.json({ product })
})

// ADMIN ROUTE: Create a New Product
productRoutes.post('/', async (c) => {
  const user = await requireUser(c)
  
  if (user.email !== ADMIN_EMAIL) {
    throw new HttpError(403, 'Unauthorized. Admin access only.')
  }
  
  const body = await readJson<{ name: string, description: string, category: string, price_cents: number, stock: number, image_url: string, active: number }>(c)
  const product = cleanProduct(body)

  const id = crypto.randomUUID()
  const slug = `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${id.slice(0, 8)}`
  await c.env.DB.prepare(
    `INSERT INTO products (id, slug, name, description, category, price_cents, stock, image_url, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, slug, product.name, product.description, product.category,
    product.price_cents, product.stock, product.image_url, product.active, Math.floor(Date.now() / 1000)
  ).run()

  return c.json({ ok: true, id }, 201)
})

// ADMIN ROUTE: Edit an Existing Product
productRoutes.patch('/:id', async (c) => {
  const user = await requireUser(c)
  
  if (user.email !== ADMIN_EMAIL) {
    throw new HttpError(403, 'Unauthorized. Admin access only.')
  }
  
  const productId = safeText(c.req.param('id'), 80)
  const body = await readJson<{ name: string, description: string, category: string, price_cents: number, stock: number, image_url: string, active: number }>(c)
  const product = cleanProduct(body)

  const result = await c.env.DB.prepare(
    `UPDATE products SET name = ?, description = ?, category = ?, price_cents = ?, stock = ?, image_url = ?, active = ? WHERE id = ?`
  ).bind(
    product.name, product.description, product.category, product.price_cents,
    product.stock, product.image_url, product.active, productId
  ).run()

  if (result.meta.changes) {
    return c.json({ ok: true })
  }
  
  throw new HttpError(404, 'Product not found.')
})

function cleanProduct(body: { name: string; description: string; category: string; price_cents: number; stock: number; image_url: string; active: number }) {
  const product = {
    name: safeText(body.name, 255),
    description: safeText(body.description, 1000),
    category: safeText(body.category, 40),
    price_cents: Number(body.price_cents),
    stock: Number(body.stock),
    image_url: safeText(body.image_url, 1000),
    active: Number(body.active)
  }
  if (!product.name || !product.description || !['Bags', 'Watches', 'Bangles', 'Necklaces'].includes(product.category) ||
      !Number.isInteger(product.price_cents) || product.price_cents < 0 ||
      !Number.isInteger(product.stock) || product.stock < 0 ||
      !product.image_url.startsWith('/') || ![0, 1].includes(product.active)) {
    throw new HttpError(400, 'Complete the product details with valid values.')
  }
  return product
}
