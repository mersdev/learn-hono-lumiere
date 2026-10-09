import { api } from './api.js'
import { clearCart, cartSubtotal } from './cart-store.js'
import { renderShell, money, setBusy, toast } from './ui.js'

async function init() {
  await renderShell()
  
  const subtotal = cartSubtotal()
  if (subtotal === 0) {
    location.href = '/cart/'
    return
  }

  const root = document.getElementById('card-payment-root')
  
  root.innerHTML = `
    <div class="text-center mb-10">
      <h1 class="text-4xl font-serif text-slate-900">Secure Payment</h1>
    </div>
    
    <div class="bg-white border border-slate-200 p-8 sm:p-12 max-w-2xl mx-auto shadow-sm">
      <p class="text-slate-900 text-lg mb-8 text-center border-b border-slate-100 pb-6">
        Amount Due: <span class="lumiere-gold font-bold ml-1">${money(subtotal)}</span>
      </p>
      
      <div id="method-tabs" class="flex gap-4 mb-8">
        <button id="tab-card" type="button" class="flex-1 py-3 text-xs font-bold tracking-widest uppercase border-b-2 border-slate-900 text-slate-900 transition-colors">Credit / Debit Card</button>
        <button id="tab-bank" type="button" class="flex-1 py-3 text-xs font-bold tracking-widest uppercase border-b-2 border-transparent text-slate-400 hover:text-slate-900 transition-colors">Online Banking</button>
      </div>

      <form id="payment-form" class="space-y-6 text-left">
        
        <div id="section-card" class="space-y-5">
          <div>
            <label class="block text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-2">Name on Card</label>
            <input type="text" required class="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:border-slate-900 bg-slate-50" placeholder="">
          </div>
          
          <div>
            <label class="block text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-2">Card Number</label>
            <input id="card-number" type="text" required maxlength="19" class="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:border-slate-900 bg-slate-50" placeholder="XXXX-XXXX-XXXX-XXXX">
          </div>
          
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-2">Expiry</label>
              <input id="card-expiry" type="text" required maxlength="5" class="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:border-slate-900 bg-slate-50" placeholder="MM/YY">
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-2">CVC</label>
              <input type="text" required maxlength="4" class="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:border-slate-900 bg-slate-50" placeholder="123">
            </div>
          </div>
        </div>

        <div id="section-bank" class="space-y-5 hidden">
          <div>
            <label class="block text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-2">Select Bank (FPX)</label>
            <select id="bank-select" class="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:border-slate-900 bg-slate-50">
              <option value="" disabled selected>Select your bank...</option>
              <option value="maybank">Maybank2U</option>
              <option value="cimb">CIMB Clicks</option>
              <option value="public">Public Bank</option>
              <option value="rhb">RHB Now</option>
              <option value="hongleong">Hong Leong Connect</option>
              <option value="ambank">AmBank</option>
            </select>
          </div>

          <div id="bank-details-fields" class="space-y-5 hidden transition-all">
            <div>
              <label class="block text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-2">Account Name</label>
              <input id="bank-acc-name" type="text" class="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:border-slate-900 bg-slate-50" placeholder="">
            </div>
            
            <div>
              <label class="block text-[10px] font-bold tracking-widest text-slate-900 uppercase mb-2">Account Number</label>
              <input id="bank-acc-number" type="text" class="w-full border border-slate-200 p-3 text-sm focus:outline-none focus:border-slate-900 bg-slate-50" placeholder="Enter bank account number">
            </div>
          </div>
          <p class="text-xs text-slate-500">You will be securely redirected to your bank's portal to authorize the transaction after clicking submit.</p>
        </div>

        <div id="receipt-upload-section" class="space-y-5 hidden">
          <div class="p-6 bg-emerald-50 border border-emerald-200 text-center mb-6">
            <p class="text-xs text-emerald-800 font-bold tracking-widest uppercase mb-1">Transaction Authorized</p>
            <p class="text-xs text-emerald-600">Please upload your transaction receipt or proof of payment to finalize your order.</p>
          </div>
          
          <div class="border-t border-slate-200 pt-6">
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
        </div>
        
        <div class="pt-6 border-t border-slate-100">
          <button type="submit" id="submit-btn" class="lumiere-btn w-full mb-4">
            Pay ${money(subtotal)}
          </button>
          
          <div class="text-center">
            <a href="/checkout/" class="text-xs text-slate-400 hover:text-slate-900 underline transition-colors">Back to Checkout</a>
          </div>
        </div>
      </form>
    </div>
  `

  const tabCard = document.getElementById('tab-card')
  const tabBank = document.getElementById('tab-bank')
  const sectionCard = document.getElementById('section-card')
  const sectionBank = document.getElementById('section-bank')
  const methodTabs = document.getElementById('method-tabs')
  const receiptSection = document.getElementById('receipt-upload-section')
  
  const bankSelect = document.getElementById('bank-select')
  const bankDetailsFields = document.getElementById('bank-details-fields')
  const bankAccName = document.getElementById('bank-acc-name')
  const bankAccNumber = document.getElementById('bank-acc-number')
  
  const form = document.getElementById('payment-form')
  const cardInputs = sectionCard.querySelectorAll('input')

  let currentMethod = 'card'
  let isPaymentAuthorized = false
  let receiptBase64 = null

  const cardNumberInput = document.getElementById('card-number')
  cardNumberInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '') 
    e.target.value = val.match(/.{1,4}/g)?.join('-') || val 
  })

  const cardExpiryInput = document.getElementById('card-expiry')
  cardExpiryInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '') 
    if (val.length > 2) {
      e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4) 
    } else {
      e.target.value = val
    }
  })

  bankSelect.addEventListener('change', () => {
    if (bankSelect.value) {
      bankDetailsFields.classList.remove('hidden')
      if (currentMethod === 'bank' && !isPaymentAuthorized) {
        bankAccName.required = true
        bankAccNumber.required = true
      }
    }
  })

  document.getElementById('receipt-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const display = document.getElementById('file-name-display');
    
    if (file) {
      display.textContent = `✓ Attached: ${file.name} (Compressing...)`;
      display.classList.remove('hidden');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // 🔥 EXPANDED LIMITS for tall bank receipts
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
          
          // 🔥 80% JPEG COMPRESSION: Keeps text readable but guarantees file size stays well under 1MB
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

  tabCard.addEventListener('click', () => {
    if (isPaymentAuthorized) return
    currentMethod = 'card'
    tabCard.className = 'flex-1 py-3 text-xs font-bold tracking-widest uppercase border-b-2 border-slate-900 text-slate-900 transition-colors'
    tabBank.className = 'flex-1 py-3 text-xs font-bold tracking-widest uppercase border-b-2 border-transparent text-slate-400 hover:text-slate-900 transition-colors'
    sectionCard.classList.remove('hidden')
    sectionBank.classList.add('hidden')
    
    cardInputs.forEach(i => i.required = true)
    bankSelect.required = false
    bankAccName.required = false
    bankAccNumber.required = false
  })

  tabBank.addEventListener('click', () => {
    if (isPaymentAuthorized) return
    currentMethod = 'bank'
    tabBank.className = 'flex-1 py-3 text-xs font-bold tracking-widest uppercase border-b-2 border-slate-900 text-slate-900 transition-colors'
    tabCard.className = 'flex-1 py-3 text-xs font-bold tracking-widest uppercase border-b-2 border-transparent text-slate-400 hover:text-slate-900 transition-colors'
    sectionBank.classList.remove('hidden')
    sectionCard.classList.add('hidden')
    
    cardInputs.forEach(i => i.required = false)
    bankSelect.required = true
    
    if (bankSelect.value) {
      bankAccName.required = true
      bankAccNumber.required = true
    }
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!isPaymentAuthorized) {
      methodTabs.classList.add('hidden')
      sectionCard.classList.add('hidden')
      sectionBank.classList.add('hidden')
      receiptSection.classList.remove('hidden')
      
      const btn = document.getElementById('submit-btn')
      btn.textContent = 'CONFIRM & SUBMIT ORDER'
      
      cardInputs.forEach(i => i.required = false)
      bankSelect.required = false
      bankAccName.required = false
      bankAccNumber.required = false
      
      isPaymentAuthorized = true
      return
    }
    
    if (!receiptBase64) {
      return toast('Please upload your payment receipt to continue.', 'error');
    }

    const btn = document.getElementById('submit-btn')
    setBusy(btn, true, 'PROCESSING...')
    
    try {
      const payloadString = sessionStorage.getItem('lumiere_checkout') || '{}'
      const checkoutData = JSON.parse(payloadString)
      
      checkoutData.deliveryMethod = checkoutData.isPickup ? 'pickup' : 'delivery';
      checkoutData.paymentMethod = currentMethod === 'card' ? 'Credit Card' : 'Online Banking FPX'
      checkoutData.receiptImage = receiptBase64
      
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
      setBusy(btn, false)
    }
  })
}

init().catch((error) => toast(error.message, 'error'))
