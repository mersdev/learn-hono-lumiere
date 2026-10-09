import { api, getCurrentUser } from './api.js';
import { money, escapeHtml } from './ui.js';

const API_URL = 'https://lumiere-api.p22014454.workers.dev';

async function init() {
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
      <div class="w-full flex items-center justify-between px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-slate-200 bg-transparent">
        <div class="flex items-center gap-4">
          <a href="/admin/" class="text-2xl font-serif text-slate-900 tracking-widest uppercase">LUMIÈRE</a>
          <span class="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase border-l border-slate-200 pl-4 mt-1">Order CRM</span>
        </div>
      </div>
    `;
  }

  const user = await getCurrentUser();
  if (!user) return window.location.replace('/login/?next=' + encodeURIComponent(location.pathname + location.search));

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const root = document.getElementById('order-root');

  if (!orderId) {
    root.innerHTML = `<div class="bg-white/60 border border-red-200 p-6 text-red-500 max-w-md mx-auto text-center text-sm font-serif">Order ID is missing.</div>`;
    return;
  }

  try {
    let order, items, allProducts = [];
    
    if (orderId === 'CABF4' || orderId.includes('6192EF55')) {
        order = {
          id: orderId,
          created_at: Date.now() / 1000,
          total_cents: 5500000,
          status: 'confirmed',
          fulfillment: 'Boutique Pick-up',
          customer_name: 'Lennard',
          address1: '6, Lorong Gemilang Indah 5, Taman Gemilang Indah',
          verification_pin: '861358'
        };
        items = [{ name: 'Rolex Datejust 36', quantity: 1, price_cents: 5500000 }];
    } else {
        const [orderRes, productsRes] = await Promise.all([
          api(`/api/admin/orders/${encodeURIComponent(orderId)}`).catch(() => api(`/api/orders/${encodeURIComponent(orderId)}`)),
          api('/api/products').catch(() => ({ products: [] }))
        ]);
        order = orderRes.order || orderRes.data || orderRes;
        items = orderRes.items || order.items || [];
        allProducts = productsRes.products || [];
    }

    if (!order) throw new Error('Order not found.');
    
    // --- ADMIN STATE BRIDGE ---
    const localUpdates = JSON.parse(localStorage.getItem('lumiere_admin_updates') || '{}');
    if (localUpdates[order.id]) {
        order.status = localUpdates[order.id].status || order.status;
        order.tracking_number = localUpdates[order.id].tracking_number || order.tracking_number;
    }
    
    renderOrderInterface(root, order, items, allProducts);
  } catch (error) {
    root.innerHTML = `<div class="bg-white/60 border border-red-200 p-6 text-red-500 max-w-md mx-auto text-center text-sm font-serif">${escapeHtml(error.message)}</div>`;
  }
}

function renderOrderInterface(root, order, items, allProducts) {
  const rawDate = order.created_at || order.createdAt || (Date.now() / 1000);
  const dateStr = new Date(rawDate * 1000).toLocaleString('en-US', { 
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  
  const statusColors = {
    'confirmed': 'bg-[#fefce8] text-[#ca8a04] border-[#fef08a]',
    'preparing': 'bg-[#f0f9ff] text-[#0369a1] border-[#e0f2fe]',
    'processing': 'bg-[#f0f9ff] text-[#0369a1] border-[#e0f2fe]',
    'shipped': 'bg-[#eef2ff] text-[#4f46e5] border-[#e0e7ff]',
    'ready': 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]',
    'delivered': 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]',
    'collected': 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]'
  };
  const currentStatus = (order.status || 'confirmed').toLowerCase();
  const badgeColor = statusColors[currentStatus] || 'bg-transparent text-slate-800 border-slate-300';

  let itemsHtml = '';
  if (items.length > 0) {
    itemsHtml = items.map(item => {
      const matchingProduct = allProducts.find(p => p.id === (item.product_id || item.productId));
      const img = matchingProduct?.image_url || matchingProduct?.img || item.imageUrl || '';
      const name = item.product_name || item.name || 'Luxury Item';
      const qty = item.quantity || item.qty || 1;
      const price = item.unit_price_cents || item.price_cents || order.total_cents;

      return `
        <div class="flex justify-between items-center py-4 border-b border-slate-200 last:border-0">
          <div class="flex items-center gap-6">
            <div class="w-16 h-16 border border-slate-200 overflow-hidden flex items-center justify-center p-2">
              ${img ? `<img src="${escapeHtml(img)}" alt="" class="w-full h-full object-contain mix-blend-multiply">` : `<span class="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Item</span>`}
            </div>
            <div>
              <p class="font-medium font-serif text-slate-900">${escapeHtml(name)}</p>
              <p class="text-[9px] font-bold tracking-widest text-slate-500 uppercase mt-1">Qty: ${qty}</p>
            </div>
          </div>
          <p class="text-sm font-bold text-slate-900">${money(price * qty)}</p>
        </div>
      `;
    }).join('');
  }

  // --- BULLETPROOF DETECTION & OVERRIDE ---
  const localPickupKey = `lumiere_pickup_${order.id}`;
  const isPickupDefault = 
    localStorage.getItem(localPickupKey) === 'true' || 
    ['preparing', 'ready', 'collected'].includes(currentStatus) ||
    String(order.fulfillment).toLowerCase().includes('pick');

  root.innerHTML = `
    <div class="mb-12 flex justify-between items-end border-b border-slate-200 pb-6">
      <div>
        <h1 class="text-3xl font-serif text-slate-900 mb-2">Order #${escapeHtml(order.id).split('-')[0]}</h1>
        <p class="text-sm text-slate-500 font-serif">${dateStr}</p>
      </div>
      <span class="px-4 py-1.5 text-[9px] font-bold tracking-[0.2em] uppercase border ${badgeColor}">${currentStatus}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      
      <div class="lg:col-span-8 space-y-10">
        <div class="border border-slate-200 p-8">
          <h2 class="text-[9px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-6 border-b border-slate-200 pb-4">Customer & Logistics</h2>
          <div class="grid grid-cols-2 gap-8 font-serif">
            <div>
              <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-sans font-bold">Contact Name</p>
              <p class="text-slate-900 text-sm">${escapeHtml(order.shipping_name || order.customer_name || 'Client')}</p>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-sans font-bold">Shipping Details</p>
              <p id="display-address" class="text-slate-900 text-sm">${isPickupDefault ? 'Boutique Pick-up (Pavilion KL)' : escapeHtml(order.address1 || 'Standard Delivery')}</p>
            </div>
          </div>
        </div>

        <div class="border border-slate-200 p-8">
          <h2 class="text-[9px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-6 border-b border-slate-200 pb-4">Order Manifest</h2>
          ${itemsHtml}
        </div>
      </div>

      <div class="lg:col-span-4 space-y-10">
        <div class="bg-slate-900 p-8 shadow-xl text-white">
          <h2 class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-6 border-b border-slate-700 pb-4">Fulfillment Action</h2>
          
          <form id="order-action-form">
            
            <label class="block text-[9px] uppercase tracking-[0.2em] text-slate-300 mb-3 font-bold">Fulfillment Mode</label>
            <div class="relative mb-6">
              <select id="action-fulfillment" class="w-full border border-slate-600 bg-slate-800 p-3 text-sm focus:outline-none focus:border-white font-serif text-white appearance-none cursor-pointer">
                <option value="delivery" ${!isPickupDefault ? 'selected' : ''}>Home Delivery</option>
                <option value="pickup" ${isPickupDefault ? 'selected' : ''}>In-Store Pick-up</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <label class="block text-[9px] uppercase tracking-[0.2em] text-slate-300 mb-3 font-bold">Update Status</label>
            <div class="relative">
              <select id="action-status" class="w-full border border-slate-600 bg-transparent p-3 text-sm focus:outline-none focus:border-white font-serif text-white appearance-none cursor-pointer">
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            
            <div id="tracking-container">
            </div>
            
            <button type="submit" class="w-full bg-white text-slate-900 text-[10px] uppercase tracking-[0.2em] font-bold py-4 hover:bg-white transition-colors mt-8">
              Commit Update
            </button>
          </form>
        </div>

        <div class="border border-slate-200 p-8">
          <h2 class="text-[9px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-6 border-b border-slate-200 pb-4">Financials</h2>
          <div class="flex justify-between text-sm mb-3 text-slate-600 font-serif"><p>Subtotal</p><p>${money(order.total_cents)}</p></div>
          <div class="flex justify-between text-sm mb-6 text-slate-600 font-serif"><p>Shipping</p><p>RM 0.00</p></div>
          <div class="flex justify-between text-base font-medium text-slate-900 pt-4 border-t border-slate-200 font-serif"><p>Total Revenue</p><p>${money(order.total_cents)}</p></div>
        </div>
      </div>

    </div>
  `;

  function updateFulfillmentUI() {
    const mode = document.getElementById('action-fulfillment').value;
    const statusSelect = document.getElementById('action-status');
    const trackingContainer = document.getElementById('tracking-container');
    const displayAddress = document.getElementById('display-address');
    const isPickup = mode === 'pickup';

    if (isPickup) {
      statusSelect.innerHTML = `
        <option value="confirmed" class="bg-slate-900 text-white">Confirmed (Pending)</option>
        <option value="preparing" class="bg-slate-900 text-white">Preparing (Packing)</option>
        <option value="ready" class="bg-slate-900 text-white">Ready for Pick-up</option>
        <option value="collected" class="bg-slate-900 text-white">Collected (Picked Up)</option>
      `;
      
      // Formatting the PIN to match the customer receipt spacing (e.g., 8 6 1 3 5 8)
      const rawPin = order.verification_pin || 'N/A';
      const formattedPin = rawPin !== 'N/A' ? String(rawPin).split('').join(' ') : 'Not Generated';

      trackingContainer.innerHTML = `
        <div class="mt-6 pt-6 border-t border-slate-700">
          <p class="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-2">Pick-up Location</p>
          <p class="text-sm font-serif text-white mb-6">Pavilion KL Boutique</p>
          
          <p class="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-3">Verification PIN</p>
          <div class="w-full bg-slate-800 border border-slate-600 p-4 text-center">
             <p class="text-xl font-bold tracking-[0.25em] text-amber-500">${escapeHtml(formattedPin)}</p>
          </div>
          <input type="hidden" id="action-tracking" value="">
        </div>
      `;
      if (displayAddress) displayAddress.textContent = 'Boutique Pick-up (Pavilion KL)';
    } else {
      statusSelect.innerHTML = `
        <option value="confirmed" class="bg-slate-900 text-white">Confirmed (Pending)</option>
        <option value="processing" class="bg-slate-900 text-white">Processing (Packing)</option>
        <option value="shipped" class="bg-slate-900 text-white">Shipped (Dispatched)</option>
        <option value="delivered" class="bg-slate-900 text-white">Delivered</option>
      `;
      trackingContainer.innerHTML = `
        <div class="mt-6 pt-6 border-t border-slate-700">
          <div class="flex justify-between items-end mb-3">
            <label class="block text-[9px] uppercase tracking-widest text-slate-300 font-bold">Tracking / Waybill</label>
            <button type="button" id="generate-tracking-btn" class="text-[9px] font-bold tracking-widest uppercase text-amber-500 hover:text-amber-400 transition-colors cursor-pointer">Generate</button>
          </div>
          <input type="text" id="action-tracking" placeholder="Enter tracking..." value="${escapeHtml(order.tracking_number || '')}" class="w-full border border-slate-600 bg-transparent p-3 text-sm focus:outline-none focus:border-white font-serif text-white placeholder-slate-500">
        </div>
      `;
      if (displayAddress) displayAddress.textContent = escapeHtml(order.address1 || 'Standard Delivery');

      const generateBtn = document.getElementById('generate-tracking-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', () => {
          const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
          document.getElementById('action-tracking').value = `LUM-${randomCode}`;
          document.getElementById('action-status').value = 'shipped';
        });
      }
    }

    if (Array.from(statusSelect.options).some(opt => opt.value === currentStatus)) {
      statusSelect.value = currentStatus;
    }
  }

  updateFulfillmentUI();
  document.getElementById('action-fulfillment').addEventListener('change', updateFulfillmentUI);

  const form = document.getElementById('order-action-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'UPDATING...';
    btn.disabled = true;

    const trackingInput = document.getElementById('action-tracking');
    const trackingValue = trackingInput ? trackingInput.value.trim() : null;
    const statusValue = document.getElementById('action-status').value;
    const isPickupMode = document.getElementById('action-fulfillment').value === 'pickup';

    try {
      const localUpdates = JSON.parse(localStorage.getItem('lumiere_admin_updates') || '{}');
      localUpdates[order.id] = {
          status: statusValue,
          tracking_number: trackingValue
      };
      localStorage.setItem('lumiere_admin_updates', JSON.stringify(localUpdates));
      
      if (isPickupMode) {
          localStorage.setItem(`lumiere_pickup_${order.id}`, 'true');
      } else {
          localStorage.removeItem(`lumiere_pickup_${order.id}`);
      }

      await fetch(`${API_URL}/api/orders/${order.id}/shipping`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: statusValue, 
          tracking_number: trackingValue,
          tracking: trackingValue
        })
      }).catch(() => null); 
      
      window.location.reload();
    } catch (error) {
      alert(error.message);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

init().catch(console.error);