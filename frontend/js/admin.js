import { api, getCurrentUser } from './api.js'
import { money, renderShell, escapeHtml } from './ui.js'
import { imageForProduct } from './product-images.js'

const API_URL = window.APP_CONFIG?.API_BASE || 'http://localhost:8787';

let catalogData = [];
let sortColumn = 'name';
let sortAscending = true;

async function init() {
  await renderShell();
  
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
      <div class="w-full flex flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div class="flex items-center gap-4">
          <a href="/admin/" class="text-2xl font-serif text-slate-900 tracking-widest uppercase">LUMIÈRE</a>
          <span class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase border-l border-slate-300 pl-4 mt-1">Command Center</span>
        </div>
        <nav class="flex flex-wrap gap-5 sm:gap-8 text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase items-center" aria-label="Admin navigation">
          <a href="/admin/?view=preview" class="hover:text-slate-500 transition-colors">Preview Catalog</a>
          <button id="admin-logout" class="hover:text-slate-500 transition-colors uppercase tracking-[0.2em] font-bold cursor-pointer">Logout</button>
        </nav>
      </div>
    `;

    document.getElementById('admin-logout')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await api('/api/auth/sign-out', { method: 'POST', body: '{}' });
        window.location.replace('/login/');
      } catch (error) {
        button.disabled = false;
        alert(error.message);
      }
    });
  }

  const root = document.getElementById('admin-root');
  
  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/admin/';
    return;
  }
  if (user.email !== 'lumiere.csproject@gmail.com') {
    root.innerHTML = '<p class="py-12 text-center text-slate-600">Admin access required.</p>';
    return;
  }

  setupTabs();
  
  root.innerHTML = '<p class="text-slate-500 font-serif text-center py-12">Loading master order list...</p>';
  try {
    const { orders } = await api('/api/orders/all');
    renderMetrics(orders);
    renderAdminTable(root, orders);
  } catch (error) {
    root.innerHTML = `<div class="border border-red-200 bg-red-50 p-6 text-red-600">${escapeHtml(error.message)}</div>`;
  }

  const catalogRoot = document.getElementById('catalog-root');
  catalogRoot.innerHTML = '<p class="text-slate-500 font-serif text-center py-12">Loading inventory...</p>';
  document.getElementById('preview-root').innerHTML = '<p class="text-slate-500 font-serif text-center py-12">Loading catalog preview...</p>';
  try {
    const { products } = await api('/api/products/admin/all');
    catalogData = products;
    renderCatalogTable(catalogRoot);
    renderCatalogPreview();
  } catch (error) {
    catalogRoot.innerHTML = `<div class="border border-red-200 bg-red-50 p-6 text-red-600">Failed to load catalog.</div>`;
    document.getElementById('preview-root').innerHTML = `<div class="border border-red-200 bg-red-50 p-6 text-red-600">${escapeHtml(error.message)}</div>`;
  }
}

function setupTabs() {
  const views = ['logistics', 'catalog', 'preview'];
  const show = (selected) => {
    for (const view of views) {
      const active = view === selected;
      document.getElementById(`view-${view}`).classList.toggle('hidden', !active);
      const tab = document.getElementById(`tab-${view}`);
      tab.classList.toggle('border-slate-900', active);
      tab.classList.toggle('text-slate-900', active);
      tab.classList.toggle('border-transparent', !active);
      tab.classList.toggle('text-slate-500', !active);
      tab.classList.toggle('hover:border-slate-300', !active);
      tab.classList.toggle('hover:text-slate-700', !active);
      tab.setAttribute('aria-pressed', String(active));
    }
    history.replaceState(null, '', selected === 'logistics' ? '/admin/' : `/admin/?view=${selected}`);
  };
  for (const view of views) document.getElementById(`tab-${view}`).addEventListener('click', () => show(view));
  const initial = new URLSearchParams(location.search).get('view');
  show(views.includes(initial) ? initial : 'logistics');
  document.getElementById('preview-search').addEventListener('input', renderCatalogPreview);
}

function renderCatalogPreview() {
  const root = document.getElementById('preview-root');
  const query = document.getElementById('preview-search').value.trim().toLowerCase();
  const matches = catalogData.filter(product =>
    `${product.name} ${product.category} ${product.id}`.toLowerCase().includes(query)
  ).sort((a, b) => a.name.localeCompare(b.name));
  const card = (product) => `
    <article class="flex h-full flex-col border border-slate-200 bg-white p-5">
      <div class="relative mb-5 flex aspect-square items-center justify-center overflow-hidden bg-slate-50">
        <img src="${escapeHtml(imageForProduct(product))}" alt="${escapeHtml(product.name)}" class="h-3/4 w-3/4 object-contain mix-blend-multiply" loading="lazy">
        <span class="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-700">${product.active ? 'Published' : 'Hidden'}</span>
      </div>
      <p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">${escapeHtml(product.category)}</p>
      <h4 class="mb-2 font-serif text-lg text-slate-900">${escapeHtml(product.name)}</h4>
      <p class="mb-4 text-sm font-bold lumiere-gold">${money(product.price_cents)}</p>
      <p class="mb-5 text-xs text-slate-500">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
      <button type="button" data-preview-edit="${escapeHtml(product.id)}" class="lumiere-btn-outline mt-auto w-full">Edit listing</button>
    </article>`;
  const section = (products, heading, note) => `
    <section class="mb-12">
      <div class="mb-5 border-b border-slate-200 pb-4">
        <h3 class="font-serif text-xl text-slate-900">${heading} <span class="text-sm text-slate-500">(${products.length})</span></h3>
        <p class="mt-1 text-sm text-slate-500">${note}</p>
      </div>
      ${products.length
        ? `<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">${products.map(card).join('')}</div>`
        : '<p class="border border-slate-200 bg-white p-8 text-sm text-slate-500">No matching listings.</p>'}
    </section>`;
  root.innerHTML = section(matches.filter(product => product.active), 'Published catalog', 'These listings appear in the customer catalog.') +
    section(matches.filter(product => !product.active), 'Hidden listings', 'These listings remain available to admins only.');
  root.querySelectorAll('[data-preview-edit]').forEach(button => button.addEventListener('click', () => {
    const product = catalogData.find(item => item.id === button.dataset.previewEdit);
    if (product) window.openProductModal(product);
  }));
}

function renderCatalogTable(root) {
  if (!catalogData || catalogData.length === 0) {
    root.innerHTML = `<p class="text-center py-12 text-slate-500 font-serif">No products found in the database.</p>`;
    return;
  }

  const sortedProducts = [...catalogData].sort((a, b) => {
    let valA, valB;
    if (sortColumn === 'name') {
      valA = (a.name || '').toLowerCase();
      valB = (b.name || '').toLowerCase();
    } else if (sortColumn === 'price') {
      valA = Number(a.price_cents) || 0;
      valB = Number(b.price_cents) || 0;
    } else if (sortColumn === 'stock') {
      valA = Number(a.stock) || 0;
      valB = Number(b.stock) || 0;
    } else if (sortColumn === 'status') {
      valA = Number(a.active) || 0;
      valB = Number(b.active) || 0;
    }

    if (valA < valB) return sortAscending ? -1 : 1;
    if (valA > valB) return sortAscending ? 1 : -1;
    return 0;
  });

  const getArrow = (col) => {
    if (sortColumn !== col) return `<span class="text-slate-300 ml-1">↕</span>`;
    return sortAscending 
      ? `<span class="text-slate-900 ml-1">↑</span>` 
      : `<span class="text-slate-900 ml-1">↓</span>`;
  };

  const rows = sortedProducts.map(product => {
    const amount = money(product.price_cents);
    const status = product.active ? 
      '<span class="text-green-600 bg-green-50 px-2 py-1 text-[9px] font-bold tracking-widest uppercase">Active</span>' : 
      '<span class="text-slate-500 bg-slate-100 px-2 py-1 text-[9px] font-bold tracking-widest uppercase">Hidden</span>';

    return `
      <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors bg-white">
        <td class="py-4 px-4 text-sm font-medium text-slate-900">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-slate-100 object-cover overflow-hidden border border-slate-200">
              <img src="${escapeHtml(product.image_url || '')}" alt="Product" class="w-full h-full object-cover">
            </div>
            ${escapeHtml(product.name)}
          </div>
        </td>
        <td class="py-4 px-4 text-sm text-slate-900">${amount}</td>
        <td class="py-4 px-4 text-sm text-slate-900">${product.stock} units</td>
        <td class="py-4 px-4">${status}</td>
        <td class="py-4 px-4 text-right">
          <button class="edit-product-btn border border-slate-300 text-slate-500 px-4 py-2 text-[9px] font-bold tracking-widest uppercase hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors mr-2" 
                  data-product='${JSON.stringify(product).replace(/'/g, "&apos;")}'>Edit</button>
        </td>
      </tr>
    `;
  }).join('');

  root.innerHTML = `
    <div class="overflow-x-auto shadow-sm border border-slate-200">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-200">
            <th class="sort-header py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase cursor-pointer hover:bg-slate-200 select-none transition-colors" data-sort="name">
              Item Name ${getArrow('name')}
            </th>
            <th class="sort-header py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase cursor-pointer hover:bg-slate-200 select-none transition-colors" data-sort="price">
              Price ${getArrow('price')}
            </th>
            <th class="sort-header py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase cursor-pointer hover:bg-slate-200 select-none transition-colors" data-sort="stock">
              Stock Count ${getArrow('stock')}
            </th>
            <th class="sort-header py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase cursor-pointer hover:bg-slate-200 select-none transition-colors" data-sort="status">
              Status ${getArrow('status')}
            </th>
            <th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  root.querySelectorAll('.sort-header').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (sortColumn === col) {
        sortAscending = !sortAscending;
      } else {
        sortColumn = col;
        sortAscending = true;
      }
      renderCatalogTable(root);
    });
  });

  root.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = JSON.parse(btn.getAttribute('data-product'));
      window.openProductModal(product);
    });
  });
}

function renderMetrics(orders) {
  if (!orders) return;
  const totalOrders = orders.length;
  const totalRevenueCents = orders.reduce((sum, order) => sum + order.total_cents, 0);
  const pendingOrders = orders.filter(o => ['confirmed', 'processing', 'preparing'].includes(o.status)).length;
  
  const metricsRoot = document.getElementById('admin-metrics');
  if (metricsRoot) {
    metricsRoot.innerHTML = `
      <div class="bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
        <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Order Value</p>
        <h3 class="text-3xl font-serif text-slate-900">${money(totalRevenueCents)}</h3>
      </div>
      <div class="bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
        <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Total Orders</p>
        <h3 class="text-3xl font-serif text-slate-900">${totalOrders}</h3>
      </div>
      <div class="bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
        <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Action Required</p>
        <h3 class="text-3xl font-serif ${pendingOrders > 0 ? 'text-amber-600' : 'text-slate-900'}">${pendingOrders} ${pendingOrders === 1 ? 'Order' : 'Orders'}</h3>
      </div>
    `;
  }
}

function renderAdminTable(root, orders) {
  if (!orders || orders.length === 0) {
    root.innerHTML = `<p class="text-center py-12 text-slate-500 font-serif">No orders in the system.</p>`;
    return;
  }
  
  const statusColors = {
    'confirmed': 'bg-amber-100 text-amber-800',
    'processing': 'bg-blue-100 text-blue-800',
    'shipped': 'bg-indigo-100 text-indigo-800',
    'delivered': 'bg-green-100 text-green-800',
    'preparing': 'bg-blue-100 text-blue-800',
    'ready': 'bg-green-100 text-green-800',
    'collected': 'bg-green-100 text-green-800'
  };

  const rows = orders.map(order => {

    let dateStr = new Date(order.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const idShort = order.id.split('-')[0].substring(0, 8).toUpperCase();
    const currentStatus = (order.status || 'confirmed').toLowerCase();
    const badgeColor = statusColors[currentStatus] || 'bg-slate-100 text-slate-600';

    return `
      <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors bg-white">
        <td class="py-4 px-4 text-sm font-medium text-slate-900">#${idShort}</td>
        <td class="py-4 px-4 text-sm text-slate-500">${dateStr}</td>
        <td class="py-4 px-4 text-sm text-slate-900">${escapeHtml(order.shipping_name || 'Client')}</td>
        <td class="py-4 px-4 text-sm text-slate-900">${money(order.total_cents)}</td>
        <td class="py-4 px-4 text-sm"><span class="inline-block px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase ${badgeColor}">${currentStatus}</span></td>
        <td class="py-4 px-4 text-sm font-serif text-slate-700">${order.tracking_number ? `<span class="font-bold">${escapeHtml(order.tracking_number)}</span>` : '<span class="text-slate-300 italic">Unassigned</span>'}</td>
        <td class="py-4 px-4 text-right">
          <button data-order-id="${order.id}" class="update-order-btn border border-slate-900 text-slate-900 px-4 py-2 text-[9px] font-bold tracking-widest uppercase hover:bg-slate-900 hover:text-white transition-colors cursor-pointer">Update</button>
        </td>
      </tr>
    `;
  }).join('');
  
  root.innerHTML = `<div class="overflow-x-auto shadow-sm border border-slate-200"><table class="w-full text-left border-collapse min-w-[900px]"><thead><tr class="bg-slate-100 border-b border-slate-200"><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Order ID</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Date</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Customer</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Revenue</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Status</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase">Tracking</th><th class="py-4 px-4 text-[10px] font-bold tracking-widest text-slate-900 uppercase text-right">Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;

  root.querySelectorAll('.update-order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-order-id');
      window.location.href = `/admin/order/?id=${orderId}`;
    });
  });
}

const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const addProductBtn = document.getElementById('add-product-btn');

window.openProductModal = (product) => {
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('modal-product-id').value = product.id;
  document.getElementById('modal-product-name').value = product.name;
  document.getElementById('modal-product-description').value = product.description;
  document.getElementById('modal-product-category').value = product.category;
  document.getElementById('modal-product-price').value = (product.price_cents / 100).toFixed(2);
  document.getElementById('modal-product-stock').value = product.stock;
  document.getElementById('modal-product-image').value = product.image_url;
  document.getElementById('modal-product-status').value = product.active ? 1 : 0;
  productModal.classList.remove('hidden');
};

addProductBtn?.addEventListener('click', () => {
  document.getElementById('product-modal-title').textContent = 'New Listing';
  document.getElementById('modal-product-id').value = '';
  document.getElementById('modal-product-name').value = '';
  document.getElementById('modal-product-description').value = '';
  document.getElementById('modal-product-category').value = 'Bags';
  document.getElementById('modal-product-price').value = '';
  document.getElementById('modal-product-stock').value = '1';
  document.getElementById('modal-product-image').value = '';
  document.getElementById('modal-product-status').value = '1';
  productModal.classList.remove('hidden');
});

document.getElementById('close-product-btn')?.addEventListener('click', () => productModal.classList.add('hidden'));
productModal?.addEventListener('click', (e) => { if (e.target === productModal) productModal.classList.add('hidden'); });

productForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = productForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'SAVING...';
  submitBtn.disabled = true;

  const id = document.getElementById('modal-product-id').value;
  const method = id ? 'PATCH' : 'POST';
  const endpoint = id ? `${API_URL}/api/products/${id}` : `${API_URL}/api/products`;

  try {
    const response = await fetch(endpoint, {
      method: method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: document.getElementById('modal-product-name').value.trim(),
        description: document.getElementById('modal-product-description').value.trim(),
        category: document.getElementById('modal-product-category').value,
        price_cents: Math.round(parseFloat(document.getElementById('modal-product-price').value) * 100),
        stock: parseInt(document.getElementById('modal-product-stock').value, 10),
        image_url: document.getElementById('modal-product-image').value.trim(),
        active: parseInt(document.getElementById('modal-product-status').value, 10)
      })
    });
    
    if (!response.ok) throw new Error('Failed to save product.');
    
    productModal.classList.add('hidden');
    const catalogRoot = document.getElementById('catalog-root');
    catalogRoot.innerHTML = '<p class="text-slate-500 font-serif text-center py-12">Refreshing inventory...</p>';
    
    const { products } = await api('/api/products/admin/all');
    catalogData = products;
    renderCatalogTable(catalogRoot);
    document.getElementById('preview-search').value = document.getElementById('modal-product-name').value.trim();
    renderCatalogPreview();
    document.getElementById('tab-preview').click();
    document.getElementById('view-preview').scrollIntoView({ block: 'start' });
    
    submitBtn.textContent = 'SAVE PRODUCT';
    submitBtn.disabled = false;
    
  } catch (error) {
    alert(error.message);
    submitBtn.textContent = 'SAVE PRODUCT';
    submitBtn.disabled = false;
  }
});

init().catch(console.error);
