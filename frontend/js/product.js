import { api } from './api.js'
import { addToCart } from './cart-store.js'
import { imageForProduct } from './product-images.js'
import { escapeHtml, money, renderShell, toast } from './ui.js'

async function init() {
  await renderShell()
  const id = new URLSearchParams(location.search).get('id')
  if (!id) throw new Error('Product ID is missing.')

  const { product } = await api(`/api/products/${encodeURIComponent(id)}`)
  document.title = `${product.name} · LUMIÈRE`
  
  // Build breadcrumb
  const categoryStr = escapeHtml(product.category || 'BAGS').toUpperCase();
  const titleStr = escapeHtml(product.name).toUpperCase();

  // Check if item is already in wishlist
  let localWishlist = JSON.parse(localStorage.getItem('lumiere_wishlist') || '[]');
  let isSaved = localWishlist.some(item => item.id === product.id);

  const wishlistBtnClass = isSaved 
    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
    : 'border-slate-300 text-slate-900 hover:bg-slate-50 transition-colors';
  const wishlistBtnText = isSaved ? 'Saved in Wishlist' : 'Save to Wishlist';
  
  document.getElementById('product-detail').innerHTML = `
    <div class="col-span-full mb-8">
      <a href="/products/" class="text-[10px] font-bold tracking-widest text-slate-400 uppercase hover:text-slate-900 transition-colors">HOME / ${categoryStr} / ${titleStr}</a>
    </div>
    
    <!-- Large Image Left -->
    <div class="bg-slate-100 aspect-[4/5] flex items-center justify-center p-10 relative overflow-hidden">
      <img src="${escapeHtml(imageForProduct(product))}" alt="${escapeHtml(product.name)}" class="w-full h-full object-contain mix-blend-multiply" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
      <span class="hidden text-slate-300 text-xs font-bold tracking-widest uppercase">Main Product Image</span>
    </div>
    
    <!-- Details Right -->
    <div class="flex flex-col justify-start pt-4 lg:pl-10 h-full">
      <h1 class="text-4xl font-serif text-slate-900 mb-3">${escapeHtml(product.name)}</h1>
      <p class="text-2xl lumiere-gold font-bold mb-6">${money(product.price_cents)}</p>
      
      <div class="mb-8">
         <span class="inline-block bg-slate-950 lumiere-gold text-[9px] font-bold tracking-[0.15em] uppercase px-3 py-1.5">
           ✓ API Authenticity Verified
         </span>
      </div>
      
      <p class="text-slate-600 mb-10 leading-relaxed text-sm">${escapeHtml(product.description || '')} Each piece is logged in our secure database with a unique serial number to guarantee authenticity and provenance.</p>
      
      <div class="text-xs text-slate-500 mb-10 space-y-1">
        <!-- THE -D HAS BEEN REMOVED FROM THE LINE BELOW -->
        <p>Serial Number: <span class="text-slate-900 font-mono tracking-wide">${escapeHtml(product.id.replace('prod_', '').toUpperCase())}</span></p>
        <p>Availability: <span class="text-slate-900">${product.stock > 0 ? 'In Stock (Boutique Collection Available)' : 'Out of Stock'}</span></p>
      </div>
      
      <!-- Split Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 items-end mt-auto">
        <div class="hidden">
           <input id="qty" type="number" min="1" max="10" value="1">
        </div>
        <button id="add" class="lumiere-btn w-full sm:flex-1 py-4" type="button">Add to Cart</button>
        
        <button id="wishlist-btn" class="w-full sm:flex-1 border text-[10px] font-bold tracking-[0.2em] uppercase py-4 flex items-center justify-center gap-3 ${wishlistBtnClass}" ${isSaved ? 'disabled' : ''} type="button">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
          <span>${wishlistBtnText}</span>
        </button>
      </div>
    </div>`

  // --- CART LOGIC ---
  document.getElementById('add').addEventListener('click', () => {
    const qty = 1; // Assuming default 1 for luxury items, or hook up the hidden input
    addToCart(product, qty)
    toast(`${product.name} added to cart.`, 'success')
  })

  // --- WISHLIST LOGIC ---
  const wishlistBtn = document.getElementById('wishlist-btn');
  wishlistBtn.addEventListener('click', () => {
    let currentWishlist = JSON.parse(localStorage.getItem('lumiere_wishlist') || '[]');
    
    if (!currentWishlist.some(item => item.id === product.id)) {
      // Push the item to local storage utilizing your specific imageForProduct import
      currentWishlist.push({
        id: product.id,
        name: product.name,
        price_cents: product.price_cents,
        imageUrl: imageForProduct(product) 
      });
      
      localStorage.setItem('lumiere_wishlist', JSON.stringify(currentWishlist));
      toast('Added to your curated wishlist.', 'success');
      
      // Update the button UI instantly
      const span = wishlistBtn.querySelector('span');
      span.innerText = 'Saved in Wishlist';
      wishlistBtn.className = 'w-full sm:flex-1 border text-[10px] font-bold tracking-[0.2em] uppercase py-4 flex items-center justify-center gap-3 bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed';
      wishlistBtn.disabled = true;
    }
  });
}

init().catch((error) => {
  document.getElementById('product-detail').innerHTML = `<p class="col-span-full text-red-600">${escapeHtml(error.message)}</p>`
})
