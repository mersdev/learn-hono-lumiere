import { api } from './api.js'
import { imageForProduct } from './product-images.js'
import { escapeHtml, money, renderShell } from './ui.js'

let allProducts = []

function card(product) {
  let itemPrice = parseInt(product.price_cents !== undefined ? product.price_cents : (product.priceCents || product.price || 0));
  
  return `
  <div class="bg-white border border-slate-200 p-6 text-center group flex flex-col h-full hover:shadow-sm transition-shadow">
    <a href="/product/?id=${encodeURIComponent(product.id)}" class="block bg-slate-50 aspect-square mb-6 overflow-hidden relative flex items-center justify-center">
      <img src="${escapeHtml(imageForProduct(product))}" data-image-fallback class="w-3/4 h-3/4 object-contain group-hover:scale-105 transition-transform duration-500 mix-blend-multiply" loading="lazy">
      <span class="hidden text-slate-300 text-[10px] font-bold tracking-widest uppercase">IMG</span>
    </a>
    <h3 class="font-serif text-[17px] text-slate-900 mb-2 flex-grow"><a href="/product/?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
    <p class="lumiere-gold font-bold mb-6 text-sm">${money(itemPrice)}</p>
    <a href="/product/?id=${encodeURIComponent(product.id)}" class="lumiere-btn-outline w-full block">View Details</a>
  </div>`
}

function render(products) {
  const grid = document.getElementById('product-grid')
  grid.innerHTML = products.length 
    ? products.map(card).join('') 
    : '<div class="col-span-full border border-slate-200 bg-white p-16 text-center text-slate-500 font-serif text-lg">No pieces match your current selection.</div>'
}

async function init() {
  await renderShell()
  
  const response = await api('/api/products')
  allProducts = response.products || response.data || response || []
  
  const search = document.getElementById('search')
  const catLinks = document.querySelectorAll('.cat-link')
  const priceLinks = document.querySelectorAll('.price-link')
  
  const urlParams = new URLSearchParams(location.search)
  let currentCategory = urlParams.get('category') || ''
  let currentPriceRange = urlParams.get('price') || ''
  
  const apply = () => {
    const q = search ? search.value.trim().toLowerCase() : ''
    
    let filtered = allProducts.filter((product) => {
      let itemPrice = parseInt(product.price_cents !== undefined ? product.price_cents : (product.priceCents || product.price || 0));
      
      // 1. Check Search Query
      const matchesSearch = !q || `${product.name} ${product.description}`.toLowerCase().includes(q)
      
      // 2. Check Category
      const matchesCategory = !currentCategory || product.category === currentCategory
      
      // 3. Check Price (Prices are evaluated in cents: 500000 = RM 5,000)
      let matchesPrice = true;
      if (currentPriceRange === 'under-5k') matchesPrice = itemPrice < 500000;
      else if (currentPriceRange === '5k-10k') matchesPrice = itemPrice >= 500000 && itemPrice <= 1000000;
      else if (currentPriceRange === 'over-10k') matchesPrice = itemPrice > 1000000;

      return matchesSearch && matchesCategory && matchesPrice;
    })
    
    render(filtered)
  }

  // Handle Category Clicks
  catLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      currentCategory = e.target.dataset.category;
      
      catLinks.forEach(p => p.classList.replace('font-bold', 'text-slate-500') || p.classList.replace('text-slate-900', 'text-slate-500'))
      e.target.classList.remove('text-slate-500')
      e.target.classList.add('font-bold', 'text-slate-900')

      updateUrlParams()
      apply()
    })
  })

  // Handle Price Clicks
  priceLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      currentPriceRange = e.target.dataset.price;
      
      priceLinks.forEach(p => p.classList.replace('font-bold', 'text-slate-500') || p.classList.replace('text-slate-900', 'text-slate-500'))
      e.target.classList.remove('text-slate-500')
      e.target.classList.add('font-bold', 'text-slate-900')

      updateUrlParams()
      apply()
    })
  })

  // Helper to maintain URL state for sharing/refreshing
  const updateUrlParams = () => {
      const url = new URL(location.href)
      if (currentCategory) url.searchParams.set('category', currentCategory)
      else url.searchParams.delete('category')
      
      if (currentPriceRange) url.searchParams.set('price', currentPriceRange)
      else url.searchParams.delete('price')
      
      history.replaceState(null, '', url)
  }

  // Set active visual state on initial load
  const activeCatLink = Array.from(catLinks).find(p => p.dataset.category === currentCategory) || catLinks[0]
  if (activeCatLink) {
      activeCatLink.classList.remove('text-slate-500')
      activeCatLink.classList.add('font-bold', 'text-slate-900')
  }

  const activePriceLink = Array.from(priceLinks).find(p => p.dataset.price === currentPriceRange) || priceLinks[0]
  if (activePriceLink) {
      activePriceLink.classList.remove('text-slate-500')
      activePriceLink.classList.add('font-bold', 'text-slate-900')
  }

  if (search) search.addEventListener('input', apply)
  apply()
}

init().catch((error) => { document.getElementById('product-grid').innerHTML = `<p class="col-span-full text-red-600">${escapeHtml(error.message)}</p>` })
