# Architecture

```text
┌────────────────────────────────────────────────────────────┐
│ Cloudflare Pages                                           │
│ HTML + CSS + JS + Tailwind Browser CDN                     │
│                                                            │
│ / /products/ /product/?id=… /cart/ /checkout/              │
│ /login/ /register/ /account/ and verification folders     │
└───────────────────────┬────────────────────────────────────┘
                        │ HTTPS fetch + credentials
                        v
┌────────────────────────────────────────────────────────────┐
│ Cloudflare Worker — Hono                                   │
│                                                            │
│ Security headers -> CORS -> Route handlers                 │
│                                                            │
│ Auth                Catalog              Orders             │
│ register            list/search          server totals      │
│ verify email        detail               idempotency        │
│ login/session                            dummy checkout     │
│ password reset                                           │
└───────────────┬────────────────────┬───────────────────────┘
                │                    │
                v                    v
      ┌─────────────────┐   ┌────────────────────┐
      │ Cloudflare D1   │   │ External email     │
      │ users           │   │ Brevo API          │
      │ sessions        │   │ verify/reset links │
      │ products        │   └────────────────────┘
      │ orders          │
      │ auth tokens     │
      │ rate limits     │
      └─────────────────┘

```

## Data trust boundaries

### Browser is untrusted

The browser may control:

- cart contents
- product IDs
- quantities
- shipping text
- request headers other than Cloudflare-controlled headers

The backend therefore validates/bounds all values and reloads current prices from D1.

### GitHub Actions is deployment authority

`.github/workflows/deploy-backend.yml` and `.github/workflows/deploy-frontend.yml` keep delivery in two focused workflows:

- The backend workflow runs `test-backend`, then `deploy-backend` validates runtime secrets, applies remote D1 migrations and deploys the Hono Worker.
- The frontend workflow runs `test-frontend`, then `deploy-frontend` uploads only `frontend/` to the Cloudflare Pages project.

Each deploy job requires its workflow's test job and `ENABLE_LUMIERE_DEPLOY=true`;
pull requests stop after validation.

Only GitHub Secrets contain:

- Cloudflare API token
- Cloudflare account ID
- Better Auth secret
- Brevo API key

Public deployment configuration is committed in `backend/wrangler.jsonc` and
`frontend/js/config.js`.

## Recommended domain layout

Best:

```text
shop.example.com -> Pages
api.example.com  -> Worker
```

This makes origin allowlisting and CSP much cleaner than broad `pages.dev` / `workers.dev` hostnames.
