# Lumière — Cloudflare Pages + Hono Workers

Lumière is a storefront built with Cloudflare Pages, Hono Workers, D1, and Better Auth.

The Lumière frontend design rules are in [Design.md](Design.md).

## Quick start: frontend + backend

```bash
node -e "require('node:fs').copyFileSync('.env.example', '.env')"
npm install --prefix backend
npm run check
npm run start
```

From PowerShell, use:

```powershell
Copy-Item .env.example .env
npm install --prefix backend
npm run check
npm run start
```

Before starting, replace the `BETTER_AUTH_SECRET` and `BREVO_API_KEY`
placeholders in `.env` with your local values. `BETTER_AUTH_SECRET` must be at
least 32 characters. Brevo must authorize the caller IP and verify `EMAIL_FROM`
before verification and password-reset emails will work.

Generate a fresh Better Auth secret with Node.js:

```bash
node -e "const fs=require('node:fs'),crypto=require('node:crypto'),p='.env'; let s=fs.readFileSync(p,'utf8'); s=s.replace(/^BETTER_AUTH_SECRET=.*$/m, 'BETTER_AUTH_SECRET='+crypto.randomBytes(32).toString('hex')); fs.writeFileSync(p,s)"
```

`npm run start` applies local D1 migrations, runs the Hono Worker at
`http://localhost:8787`, and serves `frontend/` at `http://localhost:8788`.
Open `http://localhost:8788` in your browser and stop both servers with
`Ctrl-C`.

## Rebuild in four milestones

Run the check after each milestone. The checks are intentionally small and
dependency-free so students can read them.

```bash
npm run check:stage1  # HTML, CSS, responsive storefront
npm run check:stage2  # D1 product seed, catalogue and cart
npm run check:stage3  # Hono API, auth and trusted checkout
npm run check:stage4  # Pages, Worker, D1 and security configuration
```

The architecture notes in `ARCHITECTURE.md` explain the browser, Pages, Worker and D1 boundaries.

A beginner-friendly full e-commerce starter using:

- **Frontend:** plain HTML, CSS, JavaScript and Tailwind CSS Browser/Play CDN
- **Frontend hosting:** Cloudflare Pages
- **Backend:** Hono on Cloudflare Workers
- **Database:** Cloudflare D1
- **Email verification/password reset:** Brevo API
- **CI/CD:** GitHub Actions validates first, then deploys the Worker and Pages frontend in separate jobs
- **Payment:** intentionally omitted; checkout creates a dummy confirmed order

## Features

- Responsive product listing with search/category filtering
- Product detail page
- Local browser cart with quantity management
- Registration
- Email verification
- Login/logout
- Forgot/reset password
- Account page and order history
- Dummy checkout with shipping address
- Server-side price/tax/shipping calculation
- D1-backed Better Auth users/sessions, products and orders
- Rate limiting for registration/login/reset flows
- GitHub Actions validation + D1 migrations + Worker + Pages deployments

## Architecture

```text
Browser
  |
  | HTTPS
  v
Cloudflare Pages
  |  HTML + JS + Tailwind Browser CDN
  |
  | fetch(credentials: include)
  v
Hono API on Cloudflare Worker
  |-- Better Auth session and origin middleware
  |-- Product + checkout business rules
  |
  +--> Cloudflare D1
  |
  +--> Brevo API (verification/reset email only)
```

## Security model

### Passwords

Passwords are **never encrypted or stored in plaintext**.

Better Auth validates and hashes 12–128 character passwords, storing password
credentials in its D1 `account` table. The Worker never handles plaintext
password storage.

### Important Workers Free CPU caveat

Cloudflare Workers Free currently allows **10 ms CPU time per HTTP request**. A strong adaptive password hash can exceed that budget. Do **not** silently reduce the work factor just to fit the free CPU limit.

For a classroom/hobby project you can test the supplied implementation, but for reliable production password authentication choose one of:

1. **Workers Paid** for sufficient CPU headroom; or
2. a managed authentication service on its own free tier; or
3. redesign to passwordless/passkey authentication.

Everything else in this starter is designed to stay small enough for the normal Workers/D1 free-tier envelope.

### Sessions

- 256-bit random opaque session token
- browser receives only the token in an **HttpOnly** cookie
- D1 stores only `SHA-256(session_token)`, not the raw token
- `Secure` in production
- `SameSite=None; Secure; Partitioned` in production so the hobby `pages.dev` → `workers.dev` setup can use CHIPS where supported
- for production, custom subdomains such as `shop.example.com` and `api.example.com` are strongly preferred
- 7-day default expiry
- logout deletes the D1 session
- password reset deletes all existing sessions

### CSRF

Better Auth validates trusted origins and secure cookies. Checkout additionally
requires an exact `Origin === CORS_ORIGIN` match. CORS is restricted to one
configured `CORS_ORIGIN`.

### XSS / browser controls

`frontend/_headers` adds:

- CSP
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- strict referrer policy
- permissions policy
- HSTS

The UI avoids inline event handlers and escapes user/API text before inserting it into generated HTML.

### SQL injection

All D1 values use prepared statements and `.bind(...)`. User input is never concatenated into values. The only dynamic SQL fragment is the number of `?` placeholders created from a server-bounded product-ID list.

### Checkout tampering

The cart is stored in localStorage for simple UX, but the API **does not trust client prices**. Checkout sends only product IDs and quantities; the Worker reloads current products from D1 and recalculates subtotal, shipping, tax and total.

### Email tokens

Verification and reset links use 256-bit random tokens. D1 stores only a SHA-256 hash of each token. Verification expires after 60 minutes; password reset after 30 minutes.

### Abuse controls

- D1-backed per-IP rate limits
- generic forgot-password response to reduce account enumeration
- request-body limits
- bounded string lengths and cart quantities
- idempotency key on checkout

## Email delivery

As of August 2026, **Cloudflare Email Sending to arbitrary recipients requires Workers Paid**. Free accounts can send only to verified destination addresses, which is not sufficient for normal customer signups.

The Worker sends verification and reset mail through Brevo. The sender address is configured with `EMAIL_FROM` in `backend/wrangler.jsonc` for production and `.env` locally.

## Tailwind CDN note

You asked specifically for Tailwind CDN, so this project uses the current Tailwind Browser/Play CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

Tailwind documents this CDN as **development-only, not intended for production**. It is excellent for learning and a no-build prototype. Before a serious public launch, compile Tailwind to a static CSS file and tighten the CSP further.

---

# Local setup

## 1. Prerequisites

- Node.js 22+ (CI uses Node 22)
- Cloudflare account
- Wrangler authenticated locally
- Brevo account with a verified sender for real email

## 2. Install backend dependencies

```bash
cd backend
npm install
```

## 3. Create D1 database

```bash
npx wrangler d1 create lumiere-db
```

Copy the returned database ID into:

```text
backend/wrangler.jsonc
```

## 4. Apply migrations locally

```bash
cd backend
npm run db:migrate:local
```

Migration `0002_seed_products.sql` is applied automatically by Wrangler migrations.

## 5. Configure local secrets

Set the local Worker values in the repository-root `.env` file.

Authentication email uses the `BREVO_API_KEY` from `.env`.

## 6. Start Worker

```bash
cd backend
npm run dev
```

Default API:

```text
http://localhost:8787
```

## 7. Serve frontend

Use any static server from the repository root, for example:

```bash
npx serve frontend -l 8788
```

Local frontend:

```text
http://localhost:8788
```

`frontend/js/config.js` already points to `http://localhost:8787`.

---

# Cloudflare deployment

## 1. Create Pages project once

This repository uses **Direct Upload** from GitHub Actions. Two workflow files keep the deploy targets separate: `deploy-backend.yml` publishes the Hono Worker and applies D1 migrations, while `deploy-frontend.yml` uploads only `frontend/` to Pages.

```bash
npx wrangler pages project create lumiere-bpk --production-branch main
```

Choose `main` as production branch.

## 2. Create D1 database

```bash
cd backend
npx wrangler d1 create lumiere-db
```

Put the ID in `backend/wrangler.jsonc` and commit the file.

## 3. Configure Brevo

Verify your sending address or domain in Brevo.

Recommended:

```text
EMAIL_FROM = dehoulworker@gmail.com
```

Store the Brevo API key as GitHub secret `BREVO_API_KEY` for deployment. GitHub
does not allow downloading existing Actions secret values into a local `.env`.

## 5. Create a least-privilege Cloudflare API token

GitHub CI needs a Cloudflare API token and Account ID.

Use a **custom token** limited to your account with the minimum permissions needed for your deployment, including:

- Workers Scripts: Edit
- Cloudflare Pages: Edit
- D1: Edit

Avoid using your Global API Key.

## 6. GitHub Actions secrets

Repository:

```text
Settings -> Secrets and variables -> Actions -> Secrets
```

This repository uses:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
BETTER_AUTH_SECRET
BREVO_API_KEY
```

The backend deploy job writes the two runtime secrets to the Worker. The frontend deploy job needs only the Cloudflare token and account ID; it does not receive application secrets.

## 7. Production origins

The production origins are committed in `backend/wrangler.jsonc` and `frontend/js/config.js`:

```text
APP_ORIGIN=https://lumiere-bpk-cba.pages.dev
PUBLIC_API_BASE=https://lumiere-api.velozz.workers.dev
```

For stronger cookie/CSP ergonomics, use a custom domain:

```text
APP_ORIGIN=https://shop.example.com
PUBLIC_API_BASE=https://api.example.com
```

Then replace the broad `https://*.workers.dev` entry in `frontend/_headers` with your exact API origin.

## 8. Push to `main`

The two workflows run independently:

1. `deploy-backend.yml` runs `test-backend`, then validates secrets, applies D1 migrations and deploys `backend/` to Workers.
2. `deploy-frontend.yml` runs `test-frontend`, then deploys only `frontend/` to Cloudflare Pages.

Pull requests run the relevant test job only. Deployment jobs on `main` remain
disabled until the repository variable `ENABLE_LUMIERE_DEPLOY` is set to `true`.
Before enabling it, verify the Cloudflare token/account, `lumiere-db` ID,
`lumiere-bpk` Pages project, Worker URL, Brevo sender and egress IP policy, and
add the `BETTER_AUTH_SECRET` and `BREVO_API_KEY` repository secrets.

Cloudflare credentials, the Better Auth secret, and the Brevo key belong in
GitHub secrets. Worker authentication and transactional email need both runtime
secrets after deployment.

---

# API overview

```text
GET    /health

POST   /api/auth/register
POST   /api/auth/resend-verification
POST   /api/auth/verify-email
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

GET    /api/products
GET    /api/products/:id

POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
```

# Project structure

```text
nimble-commerce/
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml
│       └── deploy-frontend.yml
├── backend/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   └── 0002_seed_products.sql
│   ├── src/
│   │   ├── lib/
│   │   │   ├── email.ts
│   │   │   ├── http.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── orders.ts
│   │   │   └── products.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.jsonc
├── frontend/
│   ├── _headers
│   ├── assets/
│   │   └── images/
│   ├── js/
│   ├── index.html
│   ├── products/index.html
│   ├── product/index.html
│   ├── cart/index.html
│   ├── checkout/index.html
│   ├── register/index.html
│   ├── login/index.html
│   ├── forgot-password/index.html
│   ├── reset-password/index.html
│   ├── verify/index.html
│   ├── verification/index.html
│   ├── resend-verification/index.html
│   └── account/index.html
├── ARCHITECTURE.md
├── PRODUCT_DESIGN.md
├── SECURITY.md
└── README.md
```

## Production hardening before real money

This starter intentionally has **no payment gateway**. Before handling real payments/orders, add:

- compiled Tailwind instead of Browser CDN
- managed inventory reservation/transaction strategy for concurrency
- shipping/tax service or explicit rules
- admin authorization and audit logs
- order lifecycle/state machine
- observability/alerts
- database cleanup for expired auth tokens/rate-limit buckets
- privacy policy/data retention process
- backup/restore drill
- real payment provider using hosted payment fields/checkout; never store card numbers yourself
- dependency pinning/lockfile and automated dependency scanning
