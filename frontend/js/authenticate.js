import { api } from './api.js'
import { renderShell, escapeHtml } from './ui.js'

await renderShell()

const form = document.getElementById('auth-form')
const input = document.getElementById('serial-input')
const result = document.getElementById('success-box')

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const entered = input.value.trim().toLowerCase()
  const id = entered.startsWith('prod_') || /^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(entered) ? entered : `prod_${entered}`
  const button = form.querySelector('button')
  button.disabled = true
  try {
    const { product } = await api(`/api/products/${encodeURIComponent(id)}`)
    result.classList.remove('hidden')
    result.innerHTML = `
      <h2 class="mb-3 font-serif text-xl text-slate-900">Catalog match found</h2>
      <p class="mb-2 text-sm text-slate-600">${escapeHtml(product.name)}</p>
      <p class="mb-5 text-xs text-slate-500">Catalog ID: ${escapeHtml(product.id)}</p>
      <a class="lumiere-btn inline-block" href="/product/?id=${encodeURIComponent(product.id)}">View item</a>
      <p class="mt-5 text-xs leading-5 text-slate-500">A catalog match does not verify an individual item's authenticity.</p>`
  } catch (error) {
    result.classList.remove('hidden')
    result.innerHTML = `<h2 class="mb-2 font-serif text-xl text-slate-900">No catalog match</h2><p class="text-sm text-slate-600">${escapeHtml(error.message)}</p>`
  } finally {
    button.disabled = false
  }
})
