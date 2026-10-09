import { api, getCurrentUser } from './api.js'
import { clearCart, getCart, cartSubtotal } from './cart-store.js'
import { money, renderShell, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  if (!await getCurrentUser()) {
    location.href = '/login/?next=/checkout/'
    return
  }

  const items = getCart()
  const checkoutData = JSON.parse(sessionStorage.getItem('lumiere_checkout') || 'null')
  if (!items.length || !checkoutData?.items?.length) {
    location.href = '/checkout/'
    return
  }
  if (!checkoutData.idempotencyKey) {
    checkoutData.idempotencyKey = crypto.randomUUID()
    sessionStorage.setItem('lumiere_checkout', JSON.stringify(checkoutData))
  }

  const subtotal = cartSubtotal()
  const isPickup = checkoutData.deliveryMethod === 'pickup' || checkoutData.isPickup === true
  const eastMalaysia = ['Sabah', 'Sarawak', 'W.P. Labuan'].includes(checkoutData.state)
  const shipping = isPickup ? 0 : (subtotal >= 8000 ? 0 : 799) + (eastMalaysia ? 3000 : 0)
  const tax = Math.round(subtotal * 0.06)
  const total = subtotal + shipping + tax
  const root = document.getElementById('payment-root') || document.getElementById('card-payment-root')

  root.innerHTML = `
    <div class="mx-auto max-w-xl border border-slate-200 bg-white p-8 text-center sm:p-12">
      <p class="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Checkout</p>
      <h1 class="mb-4 font-serif text-4xl text-slate-900">Review your order</h1>
      <p class="mb-8 text-sm leading-6 text-slate-500">This is a demo checkout. No payment will be taken.</p>
      <dl class="mb-8 space-y-3 border-y border-slate-200 py-6 text-sm">
        <div class="flex justify-between"><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div>
        <div class="flex justify-between"><dt>${isPickup ? 'Pickup' : 'Shipping'}</dt><dd>${shipping ? money(shipping) : 'Free'}</dd></div>
        <div class="flex justify-between pt-3 text-lg font-semibold"><dt>Total</dt><dd>${money(total)}</dd></div>
      </dl>
      <button id="complete-btn" class="lumiere-btn w-full">Place demo order</button>
      <a href="/checkout/" class="mt-6 block text-xs text-slate-500 underline">Back to checkout</a>
    </div>`

  document.getElementById('complete-btn').addEventListener('click', async (event) => {
    const button = event.currentTarget
    setBusy(button, true, 'PLACING ORDER...')
    try {
      const data = await api('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': checkoutData.idempotencyKey },
        body: JSON.stringify(checkoutData)
      })
      clearCart()
      sessionStorage.removeItem('lumiere_checkout')
      location.href = `/receipt/?id=${encodeURIComponent(data.orderId)}`
    } catch (error) {
      toast(error.message, 'error')
      setBusy(button, false)
    }
  })
}

init().catch((error) => toast(error.message, 'error'))
