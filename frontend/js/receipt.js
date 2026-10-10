import { api, getCurrentUser } from './api.js'
import { imageForCartItem } from './product-images.js'
import { escapeHtml, money, renderShell } from './ui.js'

async function init() {
  await renderShell();
  
  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=' + encodeURIComponent(location.pathname + location.search);
    return;
  }
  
  const root = document.getElementById('receipt-root');
  let id = new URLSearchParams(location.search).get('id');
  
  try {
    if (!id) {
      throw new Error('Order ID is missing. Please select an order from your Order History.');
    }
    
    // STRICT DATABASE FETCH: No more dummy data bypasses
    const payload = await api(`/api/orders/${encodeURIComponent(id)}`);
    
    const order = payload.order || payload.data || payload;
    const items = payload.items || order.items || [];
    
    let dateStr = order.date || 'Pending';
    let rawDate = order.created_at || order.createdAt || order.timestamp;
    if (rawDate && !order.date) {
      if (String(rawDate).length === 10 && !isNaN(Number(rawDate))) {
        rawDate = Number(rawDate) * 1000;
      }
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }

    let amount = parseInt(order.total_cents !== undefined ? order.total_cents : (order.totalCents || order.totalAmount || order.total || 0));
    const displayOrderId = order.id ? order.id : 'N/A';
    const uuid = order.uuid || id; 

    const localPickupKey = `lumiere_pickup_${displayOrderId}`;
    const isPickup = order.delivery_method === 'pickup' || order.isPickup === true || order.isPickup === 'true' || order.fulfillment === 'pickup' || order.fulfillment === 'Boutique Pick-up' || order.deliveryMethod === 'pickup' || localStorage.getItem(localPickupKey) === 'true';

    const itemsList = items.length ? items.map(item => {
       const name = item.name || item.productName || item.product_name || (item.product && item.product.name) || 'Luxury Piece';
       
       const itemPrice = Number(item.unit_price_cents ?? item.price_cents ?? 0);
       const qty = parseInt(item.quantity || item.qty || 1);
       const pId = item.productId || item.product_id || (item.product && item.product.id) || '';
       
       let imgUrl = item.imageUrl || item.image_url || item.image || '';
       if (!imgUrl) {
           try { 
               imgUrl = imageForCartItem({ productId: pId, name: name }); 
           } catch (e) { 
               imgUrl = ''; 
           }
       }
       
       return `
         <div class="flex items-center justify-between py-8">
           <div class="flex items-center gap-8">
             <div class="w-20 h-20 bg-slate-50 border border-slate-200 p-2 shrink-0 flex items-center justify-center relative">
                <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(name)}" data-image-fallback class="w-full h-full object-contain mix-blend-multiply z-10 relative">
                <span class="absolute inset-0 hidden items-center justify-center text-slate-400 text-[9px] font-bold uppercase tracking-widest text-center leading-tight">NO<br>IMG</span>
             </div>
             <div>
                <p class="font-serif text-slate-900 text-base mb-1">${escapeHtml(name)}</p>
                <p class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">QTY: ${qty}</p>
             </div>
           </div>
           <p class="text-base font-bold text-slate-900">${money(itemPrice * qty)}</p>
         </div>
       `
    }).join('') : '<p class="text-slate-500 py-10 text-base font-serif">No items found.</p>';

    let extraSection = '';
    if (isPickup) {
        const displayId = displayOrderId.split('-')[0].toUpperCase();
        const pin = order.verification_pin ? String(order.verification_pin).split('').join(' ') : 'Unavailable';
        const ready = ['ready', 'collected'].includes(String(order.status).toLowerCase());

        extraSection = `
          <div class="mt-16 text-center">
            <p class="text-base text-slate-500 font-serif mb-10">Order <strong class="text-slate-900">#${escapeHtml(displayId)}</strong> is ${ready ? 'ready for collection' : 'being prepared for collection'} at <strong class="text-slate-900">Pavilion KL Boutique</strong>.</p>
            
            <div class="bg-slate-50 p-12 max-w-md mx-auto mb-10 border border-slate-200">
               <p class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8">Collection Protocol</p>
               
               <p class="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-3">Verification PIN</p>
               <p class="text-4xl font-mono font-bold tracking-[0.3em] text-slate-900">${escapeHtml(pin)}</p>
            </div>
            
            <p class="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed mb-10">
               Present your order number and PIN to boutique staff once your order is ready.
            </p>
            
            <button id="print-pass" class="border border-slate-900 text-slate-900 text-[10px] font-bold tracking-[0.2em] uppercase px-14 py-5 hover:bg-slate-900 hover:text-white transition-colors w-full max-w-sm mx-auto">
               Print Pass
            </button>
          </div>
        `;
    }

    root.innerHTML = `
      <div class="border border-slate-200 bg-transparent p-10 sm:p-16 max-w-4xl mx-auto mb-20">
         <!-- Header -->
         <div class="flex flex-col md:flex-row justify-between md:items-start gap-8 border-b border-slate-200 pb-10 mb-8">
            <div>
               <p class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Order Date</p>
               <p class="text-base font-serif text-slate-900">${dateStr}</p>
            </div>
            <div class="md:text-right">
               <p class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Order Number</p>
               <p class="font-mono text-sm text-slate-500 tracking-wide">${escapeHtml(uuid)}</p>
            </div>
         </div>

         <!-- Items -->
         <div class="border-b border-slate-200 pb-8 mb-8">
            ${itemsList}
         </div>

         <!-- Total -->
         <div class="space-y-2 border-b border-slate-200 pb-6 mb-6 text-sm text-slate-600">
           <div class="flex justify-between"><span>Subtotal</span><span>${money(order.subtotal_cents)}</span></div>
           <div class="flex justify-between"><span>Shipping</span><span>${money(order.shipping_cents)}</span></div>
           <div class="flex justify-between"><span>Tax</span><span>${money(order.tax_cents)}</span></div>
         </div>
         <div class="flex justify-between items-center border-b border-slate-200 pb-10">
            <h2 class="text-3xl font-serif text-slate-900">Total</h2>
            <div class="text-right">
               <p class="text-3xl font-bold lumiere-gold tracking-wide mb-3">${money(amount)}</p>
               ${isPickup ? '<span class="inline-block px-4 py-1.5 bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] text-[10px] font-bold tracking-[0.1em] uppercase mt-1">Boutique pickup</span>' : ''}
            </div>
         </div>
         
         ${extraSection}
      </div>
    `;
    root.querySelector('#print-pass')?.addEventListener('click', () => window.print());

  } catch (error) {
    root.innerHTML = `<div class="bg-white border border-red-200 p-6 text-red-500 max-w-md mx-auto text-center text-sm font-serif">${escapeHtml(error.message)}</div>`
  }
}

init().catch(console.error)
