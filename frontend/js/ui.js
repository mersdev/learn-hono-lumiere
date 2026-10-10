import { cartCount } from './cart-store.js'
import { getCurrentUser, api } from './api.js'

export function money(cents) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(cents / 100)
}

export function toast(message, type = 'info') {
  let host = document.getElementById('toast-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'toast-host'
    host.className = 'fixed right-4 bottom-4 z-50 space-y-2'
    document.body.appendChild(host)
  }
  const el = document.createElement('div')
  const tone = type === 'error' ? 'bg-red-700' : type === 'success' ? 'bg-green-700' : 'bg-slate-900'
  el.className = `toast ${tone} max-w-sm rounded-none px-6 py-4 text-sm font-medium text-white shadow-xl tracking-wide`
  el.textContent = message
  host.appendChild(el)
  setTimeout(() => el.remove(), 3200)
}

export function setBusy(button, busy, busyText = 'Please wait…') {
  if (!button) return
  if (busy) {
    button.dataset.originalText = button.textContent
    button.disabled = true
    button.textContent = busyText
  } else {
    button.disabled = false
    button.textContent = button.dataset.originalText || button.textContent
  }
}

export function updateCartBadge() {
  const count = cartCount()
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(count)
  })
}

export async function renderShell() {
  const user = await getCurrentUser()
  const header = document.getElementById('site-header')
  const footer = document.getElementById('site-footer')
  
  // Detect if the user is on an authentication page
  const isAuthPage = location.pathname.includes('/login') || 
                     location.pathname.includes('/register') || 
                     location.pathname.includes('/forgot-password');

  if (header) {
    const accountLinks = (user && !isAuthPage)
      ? `<a href="/account/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">Profile</a>
         <button data-logout class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors bg-transparent border-none p-0 cursor-pointer">Logout</button>`
      : `<a href="/login/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">Account</a>`
    header.className = 'sticky top-0 z-40 bg-white border-b border-slate-200 shrink-0';
    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-24">
          <a href="/" class="text-2xl font-serif font-bold tracking-[0.2em] text-slate-950 uppercase">LUMIÈRE</a>
          <nav class="hidden md:flex gap-8 items-center" aria-label="Main navigation">
            <a href="/products/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">The Collection</a>
            <a href="/authenticate/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">Catalog Lookup</a>
            <a href="/cart/" class="text-[10px] font-bold tracking-widest text-slate-900 uppercase hover:text-slate-500 transition-colors">Cart (<span data-cart-count>0</span>)</a>
            ${accountLinks}
          </nav>
          <details class="relative md:hidden">
            <summary class="lumiere-btn-outline list-none">Menu</summary>
            <nav class="absolute right-0 top-full mt-2 flex min-w-48 flex-col gap-5 border border-slate-200 bg-white p-5 shadow-sm" aria-label="Mobile navigation">
              <a href="/products/">The Collection</a>
              <a href="/authenticate/">Catalog Lookup</a>
              <a href="/cart/">Cart (<span data-cart-count>0</span>)</a>
              ${accountLinks}
            </nav>
          </details>
        </div>
      </div>`

    header.querySelectorAll('[data-logout]').forEach((logoutBtn) => {
      logoutBtn.addEventListener('click', async () => {
        logoutBtn.textContent = 'LOGGING OUT...';
        
        try {
          await api('/api/auth/sign-out', { method: 'POST', body: '{}' });
          sessionStorage.removeItem('lumiere_checkout');
          window.location.href = '/';
        } catch (error) {
          logoutBtn.textContent = 'Logout';
          toast(error.message, 'error');
        }
      });
    })
  }

  // Redesigned Official Luxury Footer
  if (footer) {
    footer.className = 'bg-white border-t border-slate-200 py-8 shrink-0';
    footer.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <p class="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">© 2026 LUMIÈRE. All Rights Reserved.</p>
        <div class="flex gap-6 text-[10px] text-slate-400 font-bold tracking-[0.1em] uppercase">
          <a href="/privacy/index.html" class="hover:text-slate-900 transition-colors">Privacy</a>
          <a href="/terms/index.html" class="hover:text-slate-900 transition-colors">Terms</a>
          <a href="/contact/index.html" class="hover:text-slate-900 transition-colors">Contact</a>
        </div>
      </div>`
  }

  updateCartBadge()
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]))
}

window.addEventListener('nimble:cart-changed', updateCartBadge)
