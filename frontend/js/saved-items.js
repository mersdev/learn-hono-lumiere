import { api, getCurrentUser } from './api.js';
import { renderShell, money, escapeHtml } from './ui.js';

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/saved/';
    return;
  }

  const root = document.getElementById('account-root');
  const firstName = user.name ? user.name.split(' ')[0] : 'Client';

  const sidebar = `
    <aside class="pr-8">
      <h2 class="text-3xl font-serif text-slate-900 mb-8">Welcome, ${escapeHtml(firstName)}</h2>
      <ul class="space-y-5 text-sm">
        <li><a href="/account/" class="text-slate-500 hover:text-slate-900 transition-colors">My Orders</a></li>
        <li><a href="/account/details/" class="text-slate-500 hover:text-slate-900 transition-colors">Account Details</a></li>
        <li><a href="/account/saved/" class="font-bold text-slate-900">Saved Items</a></li>
        <li><a href="/account/security/" class="text-slate-500 hover:text-slate-900 transition-colors">Security Settings</a></li>
      </ul>
    </aside>
  `;

  let savedItems = [];
  try {
    const res = await api('/api/user/wishlist');
    savedItems = res.items || [];
  } catch (e) {
    const localWishlist = JSON.parse(localStorage.getItem('lumiere_wishlist') || '[]');
    savedItems = localWishlist;
  }

  let wishlistContent = '';

  if (!savedItems.length) {
    wishlistContent = `
      <div class="col-span-full py-20 text-center bg-slate-50 border border-slate-100 mt-4">
        <p class="text-slate-500 font-serif mb-8 text-lg">Your curated selection is currently empty.</p>
        <a href="/products/" class="lumiere-btn">Explore The Collection</a>
      </div>
    `;
  } else {
    const itemsHtml = savedItems.map(item => `
      <div class="group border border-slate-200 bg-white hover:shadow-md transition-all duration-300 flex flex-col">
        <div class="aspect-square bg-slate-50 p-6 flex items-center justify-center relative overflow-hidden">
          <img src="${escapeHtml(item.imageUrl || '')}" alt="${escapeHtml(item.name)}" class="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500">
        </div>
        <div class="p-6 flex flex-col flex-1">
          <h3 class="font-serif text-lg text-slate-900 mb-2">${escapeHtml(item.name)}</h3>
          <p class="text-sm lumiere-gold font-bold tracking-wide mb-6">${money(item.price_cents || 0)}</p>
          <div class="mt-auto flex gap-3">
            <a href="/product/?id=${item.id}" class="lumiere-btn-outline flex-1 text-center py-3 text-[10px]">View Details</a>
          </div>
        </div>
      </div>
    `).join('');

    wishlistContent = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-8">${itemsHtml}</div>`;
  }

  const mainContent = `
    <div class="bg-white border border-slate-200 p-8 sm:p-12 shadow-sm w-full">
      <div class="border-b border-slate-200 pb-6 mb-10">
        <h2 class="text-3xl font-serif text-slate-900 mb-2">Curated Wishlist</h2>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Your personal selection of luxury pieces</p>
      </div>
      ${wishlistContent}
    </div>
  `;

  root.innerHTML = sidebar + mainContent;
}

init().catch(console.error);
