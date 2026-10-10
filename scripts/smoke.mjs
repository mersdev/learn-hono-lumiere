import assert from 'node:assert/strict'
import { globSync } from 'node:fs'

const site = process.env.SITE_URL || 'https://lumiere-bpk-cba.pages.dev'
const api = process.env.API_URL || 'https://lumiere-api.velozz.workers.dev'

for (const file of globSync('frontend/**/index.html')) {
  const route = '/' + file.slice('frontend/'.length).replace(/index\.html$/, '')
  const response = await fetch(new URL(route, site))
  assert.equal(response.status, 200, `${route} should load`)
}

const health = await fetch(`${api}/health`)
assert.equal(health.status, 200)
assert.equal((await health.json()).ok, true)

const catalog = await fetch(`${api}/api/products`)
assert.equal(catalog.status, 200)
const { products } = await catalog.json()
assert.ok(products.length > 0)
assert.ok(products.every((product) => product.active === 1))

const detail = await fetch(`${api}/api/products/${encodeURIComponent(products[0].id)}`)
assert.equal(detail.status, 200)
assert.equal((await detail.json()).product.id, products[0].id)
assert.equal((await fetch(`${api}/api/products/not-a-product`)).status, 404)
assert.equal((await fetch(`${api}/api/orders`)).status, 401)
assert.equal((await fetch(`${api}/api/user/wishlist`)).status, 401)

const verification = await fetch(`${api}/verify/?error=invalid_token`, { redirect: 'manual' })
assert.equal(verification.status, 302)
assert.equal(verification.headers.get('location'), `${site}/verify/?error=invalid_token`)

console.log(`Smoke check passed: ${globSync('frontend/**/index.html').length} pages, catalog, auth guards, and verification redirect.`)
