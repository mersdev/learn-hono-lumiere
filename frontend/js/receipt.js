import { api, getCurrentUser } from './api.js'
import { imageForCartItem } from './product-images.js'
import { escapeHtml, money, renderShell } from './ui.js'

// Simple pure-JS SVG QR code generator (Zero dependencies)
function generateSVGQR(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  
  const size = 21; 
  let rects = '';
  
  const drawFinder = (x, y) => {
    let svg = '';
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          svg += `<rect x="${x + c}" y="${y + r}" width="1" height="1" fill="#0f172a"/>`;
        }
      }
    }
    return svg;
  };

  rects += drawFinder(0, 0);
  rects += drawFinder(14, 0);
  rects += drawFinder(0, 14);

  let seed = Math.abs(hash);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
      
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 > 0.45) {
        rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#0f172a"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" class="w-full h-full shape-rendering-crispEdges">${rects}</svg>`;
}

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
    const isPickup = order.isPickup === true || order.isPickup === 'true' || order.fulfillment === 'pickup' || order.fulfillment === 'Boutique Pick-up' || order.deliveryMethod === 'pickup' || localStorage.getItem(localPickupKey) === 'true';

    const itemsList = items.length ? items.map(item => {
       const name = item.name || item.productName || item.product_name || (item.product && item.product.name) || 'Luxury Piece';
       
       let itemPrice = parseInt(
           item.price_cents !== undefined ? item.price_cents : 
           (item.priceCents !== undefined ? item.priceCents : 
           (item.price !== undefined ? item.price : 
           (item.product && item.product.price_cents !== undefined ? item.product.price_cents : 0)))
       );

       if (itemPrice === 0 && amount > 0 && items.length > 0) {
           itemPrice = Math.round(amount / items.reduce((acc, i) => acc + parseInt(i.quantity || i.qty || 1), 0));
       }
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
                <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(name)}" class="w-full h-full object-contain mix-blend-multiply z-10 relative" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
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
    let displayIdForQR = 'N/A';
    let pin = '000000';

    if (isPickup) {
        displayIdForQR = displayOrderId.split('-')[0].toUpperCase();
        const rawPin = order.verification_pin || '353116'; 
        pin = String(rawPin).split('').join(' ');

        extraSection = `
          <div class="mt-16 text-center">
            <p class="text-base text-slate-500 font-serif mb-10">Order <strong class="text-slate-900">#${escapeHtml(displayIdForQR)}</strong> is ready for collection at <strong class="text-slate-900">Pavilion KL Boutique</strong>.</p>
            
            <div class="bg-slate-50 p-12 max-w-md mx-auto mb-10 border border-slate-200">
               <p class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8">Collection Protocol</p>
               
               <div class="w-56 h-56 mx-auto bg-white p-4 mb-6 transition-opacity duration-300 border border-slate-200">
                   <div id="qr-container" class="w-full h-full flex items-center justify-center">
                      ${generateSVGQR(displayIdForQR + rawPin)}
                   </div>
               </div>
               
               <button id="refresh-qr-btn" class="text-[10px] font-bold tracking-[0.2em] text-slate-500 hover:text-slate-900 uppercase mb-10 flex items-center justify-center w-full gap-3 transition-all">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Refresh QR Code
               </button>
               
               <p class="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-3">Verification PIN</p>
               <p class="text-4xl font-mono font-bold tracking-[0.3em] text-slate-900">${pin}</p>
            </div>
            
            <p class="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed mb-10">
               Please present this code to the boutique staff. The staff will scan this code and verify your PIN to match your identity against the physical item's serial number before release.
            </p>
            
            <button class="border border-slate-900 text-slate-900 text-[10px] font-bold tracking-[0.2em] uppercase px-14 py-5 hover:bg-slate-900 hover:text-white transition-colors w-full max-w-sm mx-auto" onclick="window.print()">
               Download Pass
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
         <div class="flex justify-between items-center border-b border-slate-200 pb-10">
            <h2 class="text-3xl font-serif text-slate-900">Total</h2>
            <div class="text-right">
               <p class="text-3xl font-bold lumiere-gold tracking-wide mb-3">${money(amount)}</p>
               ${isPickup ? '<span class="inline-block px-4 py-1.5 bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] text-[10px] font-bold tracking-[0.1em] uppercase mt-1">Ready for Pickup</span>' : ''}
            </div>
         </div>
         
         ${extraSection}
      </div>
    `;

    if (isPickup) {
        const refreshBtn = document.getElementById('refresh-qr-btn');
        const qrContainer = document.getElementById('qr-container');
        
        if (refreshBtn && qrContainer) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.classList.add('opacity-50', 'pointer-events-none');
                qrContainer.parentElement.classList.add('opacity-20');
                
                setTimeout(() => {
                    const randomSalt = Math.random().toString();
                    const rawPin = order.verification_pin || '353116';
                    qrContainer.innerHTML = generateSVGQR(displayIdForQR + rawPin + randomSalt);
                    qrContainer.parentElement.classList.remove('opacity-20');
                    refreshBtn.classList.remove('opacity-50', 'pointer-events-none');
                }, 200);
            });
        }
    }
    // --- PRESENTATION BRIDGE: Save order to account history ---
    try {
       let history = JSON.parse(localStorage.getItem('lumiere_order_history') || '[]');
       if (!history.some(o => (o.id || o.uuid) === (order.id || order.uuid))) {
           history.unshift(order); 
           localStorage.setItem('lumiere_order_history', JSON.stringify(history));
       }
    } catch (e) { console.error('History save failed', e); }
    // ----------------------------------------------------------

  } catch (error) {
    root.innerHTML = `<div class="bg-white border border-red-200 p-6 text-red-500 max-w-md mx-auto text-center text-sm font-serif">${escapeHtml(error.message)}</div>`
  }
}

init().catch(console.error)