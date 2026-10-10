# Lumière frontend design

Use this guide for every storefront, account, checkout, payment, support, and admin screen. `frontend/styles.css` owns the shared tokens and controls. Tailwind utilities handle layout and spacing; avoid repeating brand colors or component styles in page markup or JavaScript templates.

## Visual language

| Role | Token / value | Use |
| --- | --- | --- |
| Canvas | `--color-canvas` / `#f8fafc` | Page background |
| Surface | `--color-surface` / `#fff` | Cards, forms, header, footer |
| Ink | `--color-ink` / `#111827` | Primary text and filled controls |
| Muted | `--color-muted` / `#64748b` | Supporting text and labels |
| Line | `--color-line` / `#e2e8f0` | Fine dividers and card borders |
| Gold | `--color-gold` / `#b8974a` | Small accents, prices, focus rings |

- Use Inter for body copy and controls; use Playfair Display for editorial headings (`.font-serif`). Keep body copy readable at 14–16px and avoid tiny text for essential instructions.
- Use uppercase, tracked labels only for short kickers and actions (`.lumiere-kicker`). Use sentence case for explanatory copy.
- Use square corners on cards, fields, and buttons. Reserve circles for small status indicators or avatars. Use white surfaces, fine borders, and restrained shadows instead of heavy decoration.
- Keep content within the existing `max-w-7xl` shell; use consistent 16px mobile gutters, 24px tablet gutters, and 32px desktop gutters. Stack columns on narrow screens without horizontal scrolling.

## Reusable patterns

- Use the shared navigation and footer from `frontend/js/ui.js` on storefront routes; admin routes use a compact branded header in the same palette and type. Page headings use a short kicker, a Playfair title, and optional muted supporting copy.
- Keep catalog review inside the admin shell. Show published and hidden listings separately, with the product image, price, stock, visibility, and a direct edit action so admins can see the result of a catalog change.
- Use `.lumiere-panel` for bordered white sections and `.lumiere-btn` or `.lumiere-btn-outline` for primary and secondary actions. Keep text fields and selects square, white, and bordered. Keep button labels and disabled states clear.
- Use `--color-gold` sparingly; success, warning, and error messages may use semantic colors. Do not change the canvas or card palette for those states.
- Keep keyboard focus visible, labels associated with fields, useful alt text on content images, and sufficient contrast. Respect reduced-motion settings.

## Page review

Check storefront, product, cart, checkout, payment, account, authentication, support, legal, receipt, and admin routes at mobile and desktop widths. Include content created in JavaScript, such as empty states, dialogs, toasts, forms, and order details. Update this guide and `frontend/styles.css` together when the shared visual language changes.
