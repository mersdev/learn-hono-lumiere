import { api, getCurrentUser } from './api.js';
import { renderShell, escapeHtml, money, toast } from './ui.js';

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/';
    return;
  }

  const root = document.getElementById('account-root');
  const firstName = user.name ? user.name.split(' ')[0] : 'Client';

  const sidebar = `
    <aside class="pr-8 md:border-r md:border-slate-200 min-h-[60vh]">
      <h2 class="text-3xl font-serif text-slate-900 mb-10">Welcome, ${escapeHtml(firstName)}</h2>
      <ul class="space-y-6 text-sm">
        <li><a href="/account/" class="text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">My Orders</a></li>
        <li><a href="/account/details/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Account Details</a></li>
        <li><a href="/account/saved/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Saved Items</a></li>
        <li><a href="/account/security/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Security Settings</a></li>
      </ul>
    </aside>
  `;

  let orders = [];
  try {
    const res = await api(`/api/orders?t=${Date.now()}`);
    orders = res.orders || res.data || (Array.isArray(res) ? res : []);
  } catch (err) {
    console.warn('Could not fetch orders from DB', err);
  }

  let ordersHtml = '';
  if (!orders || orders.length === 0) {
    ordersHtml = `
      <div class="text-center py-20 border border-slate-200 bg-slate-50 mt-8">
         <p class="text-slate-500 font-serif mb-8 text-lg">You have no recent orders.</p>
         <a href="/products/" class="lumiere-btn">Explore Collection</a>
      </div>
    `;
  } else {
    ordersHtml = orders.map(order => {
      const rawId = order.id || order.uuid || 'N/A';
      const displayId = rawId !== 'N/A' ? rawId.split('-')[0].toUpperCase() : 'N/A';
      
      const statusUpper = (order.status || 'CONFIRMED').toUpperCase();
      
      const localPickupKey = `lumiere_pickup_${rawId}`;
      const isPickup = 
          order.delivery_method === 'pickup' ||
          localStorage.getItem(localPickupKey) === 'true' || 
          ['PREPARING', 'READY', 'COLLECTED'].includes(statusUpper) ||
          (order.fulfillment && String(order.fulfillment).toLowerCase().includes('pick'));

      const step1 = 'CONFIRMED';
      const step2 = isPickup ? 'PREPARING' : 'PROCESSING';
      const step3 = isPickup ? 'READY' : 'SHIPPED';
      const step4 = isPickup ? 'COLLECTED' : 'DELIVERED';
      
      let activeStep = 1;
      if (statusUpper === 'PROCESSING' || statusUpper === 'PREPARING') activeStep = 2;
      else if (statusUpper === 'SHIPPED' || statusUpper === 'READY') activeStep = 3;
      else if (statusUpper === 'DELIVERED' || statusUpper === 'COLLECTED') activeStep = 4;
      else if (!isPickup && order.tracking_number && order.tracking_number !== 'Pending Tracking') activeStep = 3;

      const trackingNum = order.tracking_number || order.tracking || order.waybill || null;
      const trackingDisplay = trackingNum 
        ? `Waybill: <span class="font-bold tracking-wide text-slate-900">${escapeHtml(trackingNum)}</span>`
        : `Waybill: <span class="text-slate-400 italic">Pending Tracking</span>`;

      return `
        <div class="border border-slate-200 p-8 mb-8 bg-white hover:shadow-sm transition-shadow">
          
          <div class="flex flex-wrap gap-6 justify-between items-center pb-2">
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Order #</p>
              <p class="text-sm font-serif text-slate-900">#${escapeHtml(displayId)}</p>
            </div>
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Date</p>
              <p class="text-sm text-slate-900">${escapeHtml(order.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}</p>
            </div>
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Total</p>
              <p class="text-sm text-slate-900 lumiere-gold font-bold">${money(order.total_cents || order.total || 0)}</p>
            </div>
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Fulfillment</p>
              <p class="text-sm text-slate-900">${isPickup ? 'Boutique Pick-up' : 'Home Delivery'}</p>
            </div>
            <div>
              <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Status</p>
              <span class="inline-block px-3 py-1.5 bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] text-[9px] font-bold tracking-[0.1em] uppercase">${escapeHtml(statusUpper)}</span>
            </div>
            <div>
              <a href="/receipt/?id=${escapeHtml(rawId)}" class="inline-block border border-slate-900 text-slate-900 text-[9px] font-bold tracking-[0.2em] uppercase px-8 py-3 hover:bg-slate-900 hover:text-white transition-colors text-center w-full sm:w-auto">
                VIEW INVOICE
              </a>
            </div>
          </div>

          <!-- Removed 'open' attribute so it stays closed by default -->
          <details class="group mt-6">
            <summary class="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase cursor-pointer pt-6 border-t border-slate-200 hover:text-slate-900 transition-colors select-none flex justify-between items-center outline-none">
              Track & Manage Order
              <svg class="w-4 h-4 transform group-open:rotate-180 transition-transform text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </summary>
            
            <div class="pt-10 pb-4">
              
              <div class="relative max-w-2xl mx-auto pt-4 pb-16">
                <div class="absolute top-1/2 left-0 w-full border-t-[2px] border-dotted border-slate-200 -z-10 -translate-y-[1px]"></div>
                <div class="absolute top-1/2 left-0 border-t-[2px] border-solid border-slate-900 -z-10 -translate-y-[1px] transition-all duration-700" style="width: ${((activeStep - 1) / 3) * 100}%"></div>
                
                <div class="flex justify-between w-full">
                  <div class="flex flex-col items-center gap-4 bg-white px-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">1</div>
                    <span class="text-[9px] font-bold tracking-[0.15em] uppercase ${activeStep >= 1 ? 'text-slate-900' : 'text-slate-400'}">${step1}</span>
                  </div>
                  <div class="flex flex-col items-center gap-4 bg-white px-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">2</div>
                    <span class="text-[9px] font-bold tracking-[0.15em] uppercase ${activeStep >= 2 ? 'text-slate-900' : 'text-slate-400'}">${step2}</span>
                  </div>
                  <div class="flex flex-col items-center gap-4 bg-white px-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">3</div>
                    <span class="text-[9px] font-bold tracking-[0.15em] uppercase ${activeStep >= 3 ? 'text-slate-900' : 'text-slate-400'}">${step3}</span>
                  </div>
                  <div class="flex flex-col items-center gap-4 bg-white px-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeStep >= 4 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">4</div>
                    <span class="text-[9px] font-bold tracking-[0.15em] uppercase ${activeStep >= 4 ? 'text-slate-900' : 'text-slate-400'}">${step4}</span>
                  </div>
                </div>
              </div>

              <div class="flex flex-col items-center justify-center max-w-3xl mx-auto border-t border-slate-100 pt-8">
                 <div class="text-center">
                    <p class="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">${isPickup ? 'Pick-up Location' : 'Dispatched via DHL Express'}</p>
                    <p class="text-sm font-serif text-slate-900">${isPickup ? escapeHtml(order.location || 'Pavilion KL Boutique') : trackingDisplay}</p>
                 </div>
              </div>

            </div>
          </details>

        </div>
      `;
    }).join('');
  }

  const mainContent = `
    <div class="w-full max-w-4xl pl-0 lg:pl-12">
      <div class="mb-12 border-b border-slate-200 pb-6">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Order History</h1>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Track and manage your boutique purchases</p>
      </div>
      
      <div class="space-y-8">
        ${ordersHtml}
      </div>
    </div>
  `;

  root.innerHTML = sidebar + mainContent;
}

init().catch(console.error);
