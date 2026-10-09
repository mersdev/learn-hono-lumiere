import { api } from './api.js'
import { clearCart, cartSubtotal } from './cart-store.js'
import { money, renderShell, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  
  const subtotal = cartSubtotal()
  if (subtotal === 0) {
    location.href = '/cart/'
    return
  }

  if (subtotal > 500000) {
    location.href = '/card-payment/'
    return
  }
  
  const root = document.getElementById('payment-root')
  
  root.innerHTML = `
    <div class="text-center mb-10">
      <h1 class="text-4xl font-serif text-slate-900">Touch 'n Go E-Wallet</h1>
    </div>
    
    <div class="bg-white border border-slate-200 p-8 sm:p-16 max-w-xl mx-auto shadow-sm text-center">
      <p class="text-slate-900 text-lg mb-8">Amount Due: <span class="lumiere-gold font-bold ml-1">${money(subtotal)}</span></p>
      
      <div class="w-48 h-48 mx-auto mb-8">
         <img src="/assets/tngQR.png" alt="Touch n Go QR Code" class="w-full h-full object-contain" />
      </div>
      
      <p class="text-xs text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
        Open your Touch 'n Go eWallet app and scan the QR code above to complete your luxury purchase securely.
      </p>

      <div class="mb-8 border-t border-slate-200 pt-6">
        <p class="text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-4">Upload Payment Receipt</p>
        
        <label for="receipt-upload" class="cursor-pointer flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed bg-slate-50 hover:bg-slate-100 transition-colors">
          <div class="flex flex-col items-center justify-center pt-5 pb-6">
            <svg class="w-5 h-5 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
            <p class="text-[10px] text-slate-500 uppercase tracking-wide"><span class="font-bold text-slate-900">Click to upload</span> screenshot</p>
          </div>
          <input id="receipt-upload" type="file" class="hidden" accept="image/png, image/jpeg, image/jpg" />
        </label>
        
        <p id="file-name-display" class="text-[10px] tracking-wide text-emerald-600 mt-3 hidden font-bold uppercase"></p>
      </div>
      
      <button id="complete-btn" class="lumiere-btn w-full mb-6">
        I Have Completed Payment
      </button>
      
      <a href="/cart/" class="text-xs text-slate-400 hover:text-slate-900 underline transition-colors">Return to Cart</a>
    </div>
  `

  let receiptBase64 = null;

  document.getElementById('receipt-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const display = document.getElementById('file-name-display');
    
    if (file) {
      display.textContent = `✓ Attached: ${file.name} (Processing...)`;
      display.classList.remove('hidden');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // 🔥 EXPANDED LIMITS
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 2800; 
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // 🔥 80% JPEG COMPRESSION: Perfect balance of quality and <1MB file size
          receiptBase64 = canvas.toDataURL('image/jpeg', 0.8);
          display.textContent = `✓ Attached: ${file.name}`;
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      display.classList.add('hidden');
      receiptBase64 = null;
    }
  });

  document.getElementById('complete-btn').addEventListener('click', async (event) => {
    if (!receiptBase64) {
      return toast('Please upload your payment receipt to continue.', 'error');
    }

    const button = event.target
    setBusy(button, true, 'PROCESSING...')

    try {
      const payloadString = sessionStorage.getItem('lumiere_checkout') || '{}'
      const checkoutData = JSON.parse(payloadString)
      
      checkoutData.deliveryMethod = checkoutData.isPickup ? 'pickup' : 'delivery';
      checkoutData.receiptImage = receiptBase64;
      
      const data = await api('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify(checkoutData)
      })

      if (checkoutData.isPickup) {
         const orderId = data.orderId || data.id;
         localStorage.setItem(`lumiere_pickup_${orderId}`, 'true');
      }

      clearCart()
      sessionStorage.removeItem('lumiere_checkout')
      
      await new Promise(resolve => setTimeout(resolve, 800))
      location.href = `/receipt/?id=${data.orderId || data.id}`
      
    } catch (error) {
      toast(error.message, 'error')
    } finally {
      setBusy(button, false)
    }
  })
}

init().catch((error) => toast(error.message, 'error'))
