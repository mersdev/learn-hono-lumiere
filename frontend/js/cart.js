import { getCart, removeFromCart, updateQuantity, cartSubtotal } from './cart-store.js'
import { imageForCartItem } from './product-images.js'
import { escapeHtml, money, renderShell } from './ui.js'

function render() {
  const items = getCart()
  const host = document.getElementById('cart-items')

  if (!items.length) {
    host.innerHTML = '<div class="border border-slate-200 bg-white p-16 text-center"><h2 class="text-3xl font-serif mb-4">Your cart is empty</h2><a href="/products/" class="lumiere-btn mt-6">Return to Collection</a></div>'
    return
  }

  const subtotal = cartSubtotal()
  
  const itemsHtml = items.map((item) => `
    <div class="flex gap-6 pb-6 mb-6 border-b border-slate-100">
      <div class="h-24 w-24 bg-slate-100 flex items-center justify-center shrink-0">
         <img src="${escapeHtml(imageForCartItem(item))}" alt="${escapeHtml(item.name)}" data-image-fallback class="h-full w-full object-contain mix-blend-multiply">
         <span class="hidden text-slate-300 text-[9px] font-bold tracking-widest">IMG</span>
      </div>
      <div class="flex-1 flex flex-col justify-center">
        <h3 class="font-serif text-lg text-slate-900">${escapeHtml(item.name)}</h3>
        <p class="text-xs text-slate-500 font-mono mt-1">SKU: ${escapeHtml(item.productId.replace('prod_', '').toUpperCase())}-D</p>
        <p class="text-xs text-slate-500 mt-1">Qty: ${item.quantity}</p>
        <button data-remove="${escapeHtml(item.productId)}" class="text-[10px] font-bold tracking-widest text-slate-400 hover:text-red-600 uppercase mt-2 text-left w-fit">Remove</button>
      </div>
      <div class="flex items-center">
        <span class="lumiere-gold font-bold">${money(item.priceCents * item.quantity)}</span>
      </div>
    </div>`).join('')

  host.innerHTML = `
    <div class="text-center mb-10">
      <h1 class="text-4xl font-serif text-slate-900">Your Cart</h1>
    </div>
    
    <div class="bg-white border border-slate-200 p-8 sm:p-12 max-w-4xl mx-auto shadow-sm">
      ${itemsHtml}
      
      <div class="text-right mt-8 text-sm text-slate-500 mb-4">
        Shipping: Calculated at next step
      </div>
      
      <div class="text-right text-xl font-serif text-slate-900 mb-8">
        Total: <span class="lumiere-gold font-sans font-bold text-xl ml-2">${money(subtotal)}</span>
      </div>
      
      <div class="flex justify-end">
         <a href="/checkout/" class="lumiere-btn block w-full sm:w-auto text-center">Proceed to Demo Checkout</a>
      </div>
    </div>`

  host.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => { removeFromCart(button.dataset.remove); render() })
  })
}

renderShell().then(render)
window.addEventListener('nimble:cart-changed', render)
