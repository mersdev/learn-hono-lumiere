import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const stage = Number(process.argv[process.argv.indexOf('--stage') + 1] || 0)
const read = (file) => readFile(file, 'utf8')
const required = async (file, needles) => {
  if (!existsSync(file)) throw new Error(`${file} is missing`)
  const text = await read(file)
  for (const needle of needles) if (!text.includes(needle)) throw new Error(`${file} is missing “${needle}”`)
}
const pass = (message) => console.log(`✓ ${message}`)

try {
  await required('Design.md', ['# Lumière frontend design', '--color-canvas', '.lumiere-btn'])
  await required('frontend/styles.css', ['--color-canvas', '.lumiere-btn', '.lumiere-panel'])
  for (const route of ['', 'products/', 'product/', 'cart/', 'checkout/', 'login/', 'register/', 'account/', 'account/details/', 'account/saved/', 'account/security/', 'admin/', 'admin/order/', 'authenticate/', 'card-payment/', 'contact/', 'faq/', 'forgot-password/', 'payment/', 'privacy/', 'receipt/', 'resend-verification/', 'reset-password/', 'terms/', 'verification/', 'verify/']) {
    await required(`frontend/${route}index.html`, ['LUMIÈRE', '/styles.css', 'site-header'])
  }
  await required('frontend/assets/images/lumiere-hero-bag.png', [])
  await required('frontend/js/ui.js', ['LUMIÈRE', 'Mobile navigation', 'data-cart-count'])
  await required('frontend/js/product-images.js', ['prod_lv_neverfull', 'prod_bvlgari_bzero1', '/assets/images/products/'])
  await required('frontend/js/catalog-fallback.js', ['prod_lv_neverfull', 'prod_bvlgari_bzero1', 'fallbackProducts'])
  for (const image of ['lv-neverfull', 'dior-lady', 'chanel-flap', 'hermes-birkin', 'rolex-submariner', 'rolex-datejust', 'cartier-tank', 'apm-meteorites', 'cartier-love', 'vca-alhambra', 'tiffany-smile', 'bvlgari-bzero1']) await required(`frontend/assets/images/products/${image}.png`, [])
  for (const image of ['category-bag-cutout', 'category-watch-cutout', 'category-bangle-cutout', 'category-necklace-cutout']) await required(`frontend/assets/images/products/${image}.png`, [])
  await required('.env.example', ['BETTER_AUTH_SECRET', 'BREVO_API_KEY', 'CLOUDFLARE_API_TOKEN'])
  pass('Lumière storefront shell is present')

  if (!stage || stage >= 2) {
    await required('backend/migrations/0002_seed_products.sql', ['Bags', 'Watches', 'Bangles', 'Necklaces'])
    await required('frontend/js/home.js', ['renderShell'])
    await required('frontend/js/products.js', ['/api/products', 'category'])
    pass('Lumière catalogue and cart entry points are present')
  }
  if (!stage || stage >= 3) {
    await required('backend/src/index.ts', ['/api/auth', '/api/products', '/api/orders'])
    await required('backend/src/lib/auth.ts', ['betterAuth', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', "sameSite: 'none'", 'sendVerificationEmail', 'sendResetPassword'])
    await required('backend/src/routes/orders.ts', ['price_cents', 'Idempotency-Key', 'requireUser', "Origin') !== c.env.CORS_ORIGIN"])
    await required('backend/migrations/0003_better_auth_cutover.sql', ['CREATE TABLE "user"', 'CREATE TABLE session', 'CREATE TABLE account', 'CREATE TABLE verification', 'REFERENCES "user"', 'legacy_users', 'legacy_orders'])
    await required('backend/migrations/0004_reset_catalog.sql', ['DROP TABLE IF EXISTS order_items', 'DROP TABLE IF EXISTS orders', 'CREATE TABLE "user"', 'DROP TABLE IF EXISTS legacy_users'])
    await required('scripts/migration-preflight.mjs', ['FROM users', 'FROM orders', 'legacy_users', 'legacy_orders', 'refusing Better Auth cutover'])
    if (existsSync('backend/src/routes/auth.ts') || existsSync('backend/src/lib/session.ts') || existsSync('backend/src/lib/crypto.ts')) throw new Error('Legacy custom-auth code remains')
    const typecheck = spawnSync('npm', ['--prefix', 'backend', 'run', 'typecheck'], { stdio: 'inherit', shell: process.platform === 'win32' })
    if (typecheck.error) throw typecheck.error
    if (typecheck.status !== 0) throw new Error('Backend typecheck failed')
    pass('Hono routes and trusted checkout checks are present')
  }
  if (!stage || stage >= 4) {
    await required('backend/wrangler.jsonc', ['lumiere-api', 'lumiere-db', 'd1_databases', 'dehoulworker@gmail.com'])
    await required('.github/workflows/deploy-backend.yml', ['test-backend:', 'deploy-backend:', 'needs: test-backend', 'CLOUDFLARE_API_TOKEN', 'BETTER_AUTH_SECRET', 'BREVO_API_KEY', 'ENABLE_LUMIERE_DEPLOY', 'npm run deploy --prefix backend'])
    await required('.github/workflows/deploy-frontend.yml', ['test-frontend:', 'deploy-frontend:', 'needs: test-frontend', 'CLOUDFLARE_API_TOKEN', 'wrangler pages deploy frontend'])
    await required('frontend/_headers', ['Content-Security-Policy', 'frame-ancestors'])
    await required('README.md', ['Cloudflare Pages', 'Cloudflare deployment', 'deploy-backend', 'deploy-frontend', 'products/index.html'])
    await required('ARCHITECTURE.md', ['deploy-backend', 'deploy-frontend', 'Each deploy job requires'])
    pass('Cloudflare deployment configuration is present')
  }
  console.log(stage ? `Stage ${stage} ready.` : 'All Lumière checks passed.')
} catch (error) {
  console.error(`✗ ${error.message}`)
  process.exit(1)
}
