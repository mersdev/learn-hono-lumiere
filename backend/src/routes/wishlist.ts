import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { requireUser } from '../lib/auth-session'
import { HttpError, safeText } from '../lib/http'

export const wishlistRoutes = new Hono<AppEnv>()

wishlistRoutes.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.header('Origin') !== c.env.CORS_ORIGIN) throw new HttpError(403, 'Invalid request origin.')
  await next()
})

wishlistRoutes.get('/', async (c) => {
  const user = await requireUser(c)
  const result = await c.env.DB.prepare(
    `SELECT products.* FROM wishlist JOIN products ON products.id = wishlist.product_id
     WHERE wishlist.user_id = ? AND products.active = 1 ORDER BY products.name`
  ).bind(user.id).all()
  return c.json({ items: result.results })
})

wishlistRoutes.post('/:id', async (c) => {
  const user = await requireUser(c)
  const id = safeText(c.req.param('id'), 80)
  const product = await c.env.DB.prepare('SELECT id FROM products WHERE id = ? AND active = 1').bind(id).first()
  if (!product) throw new HttpError(404, 'Product not found.')
  await c.env.DB.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)').bind(user.id, id).run()
  return c.json({ ok: true })
})

wishlistRoutes.delete('/:id', async (c) => {
  const user = await requireUser(c)
  await c.env.DB.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').bind(user.id, safeText(c.req.param('id'), 80)).run()
  return c.json({ ok: true })
})
