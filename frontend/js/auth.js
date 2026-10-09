import { api } from './api.js';
import { renderShell, setBusy, toast } from './ui.js';

// 1. Determine the current auth state
const state = document.body.dataset.authState || new URLSearchParams(location.search).get('state') || 'signin';
const root = document.getElementById('auth-root');
const requestedNext = new URLSearchParams(location.search).get('next');
const nextUrl = requestedNext?.startsWith('/') ? new URL(requestedNext, location.origin) : null;
const afterLogin = nextUrl?.origin === location.origin ? nextUrl.pathname + nextUrl.search + nextUrl.hash : '/';

// 2. Reusable UI Components
const formHeader = (title, subtitle) => `
  <div class="text-center mb-8">
    <p class="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">${subtitle}</p>
    <h1 class="text-3xl font-serif text-slate-900">${title}</h1>
  </div>
`;

const emailInput = `
  <div class="mb-4">
    <label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Email</label>
    <input name="email" type="email" required placeholder="Enter your email" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white">
  </div>
`;

const passwordInput = `
  <div class="mb-6">
    <label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Password</label>
    <input name="password" type="password" required minlength="8" placeholder="Enter your password" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white">
  </div>
`;

// 3. Render the correct screen based on state
await renderShell();

if (state === 'verified') {
  root.innerHTML = new URLSearchParams(location.search).has('error')
    ? formHeader('Verification failed', 'Expired link') + '<p class="mb-6 text-slate-500 text-center text-sm">This link is invalid or expired. Request a new verification email.</p><a class="block w-full lumiere-btn text-center" href="/resend-verification/">Resend verification</a>'
    : formHeader('Email verified', 'Success') + '<p class="mb-6 text-slate-500 text-center text-sm">Your LUMIÈRE account is ready.</p><a class="block w-full lumiere-btn text-center" href="/login/">Log In</a>';
}
else if (state === 'sent') {
  root.innerHTML = formHeader('Check your inbox', 'Verification') + '<p class="mb-6 text-slate-500 text-center text-sm">We sent a verification link. Once confirmed, return here.</p><a class="block w-full lumiere-btn text-center" href="/login/">Log In</a>';
}
else if (state === 'resend') {
  root.innerHTML = formHeader('Resend verification', 'Account') + `
    <form id="auth-form" class="text-left">${emailInput}<button type="submit" class="w-full lumiere-btn">Send verification link</button></form>`;
}
else if (state === 'reset') {
  const token = new URLSearchParams(location.search).get('token');
  root.innerHTML = token
    ? formHeader('Choose a new password', 'Recovery') + `
      <form id="auth-form" class="text-left">
        ${passwordInput}
        <div class="mb-6"><label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Confirm password</label><input name="confirmPassword" type="password" required minlength="8" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900"></div>
        <button type="submit" class="w-full lumiere-btn">Update password</button>
      </form>`
    : formHeader('Reset link invalid', 'Recovery') + '<p class="mb-6 text-slate-500 text-center text-sm">Request a new password reset link.</p><a class="block w-full lumiere-btn text-center" href="/forgot-password/">Request reset</a>';
}
else if (state === 'signup') {
  root.innerHTML = formHeader('Create Account', 'Welcome') + `
    <form id="auth-form" class="text-left">
      <div class="mb-4">
        <label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Full Name</label>
        <input name="name" required minlength="2" placeholder="Enter your name" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white">
      </div>
      ${emailInput}
      ${passwordInput}
      <button type="submit" class="w-full lumiere-btn">Sign Up</button>
    </form>
    <div class="mt-6 text-center text-xs text-slate-500">Already have an account? <a class="underline text-slate-900 hover:text-slate-500" href="/login/">Log in</a></div>
  `;
}
else if (state === 'forgot') {
  root.innerHTML = formHeader('Reset Password', 'Recovery') + `
    <form id="auth-form" class="text-left">
      ${emailInput}
      <button type="submit" class="w-full lumiere-btn">Send reset link</button>
    </form>
    <div class="mt-6 text-center text-xs text-slate-500"><a class="underline text-slate-900 hover:text-slate-500" href="/login/">Back to Log In</a></div>
  `;
}
else {
  // Default: Sign In
  root.innerHTML = formHeader('Log In', 'Welcome Back') + `
    <form id="auth-form" class="text-left">
      ${emailInput}
      ${passwordInput}
      <button type="submit" class="w-full lumiere-btn">Log In</button>
    </form>
    <div class="mt-6 text-center text-xs text-slate-500">
      New to Lumière? <a class="underline text-slate-900 hover:text-slate-500" href="/register/">Create an account</a><br><br>
      <a class="text-slate-400 hover:text-slate-900" href="/forgot-password/">Forgot password?</a>
    </div>
  `;
}

// 4. Handle Form Submissions
const formElement = document.getElementById('auth-form');
if (formElement) {
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = formElement.querySelector('button');
    setBusy(button, true);
    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      if (state === 'reset') {
        if (data.password !== data.confirmPassword) throw new Error('Passwords do not match.');
        await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: new URLSearchParams(location.search).get('token'), newPassword: data.password }) });
        root.innerHTML = formHeader('Password updated', 'Success') + '<a class="block w-full lumiere-btn text-center" href="/login/">Log In</a>';
      }
      else if (state === 'resend') {
        await api('/api/auth/send-verification-email', { method: 'POST', body: JSON.stringify({ email: data.email, callbackURL: new URL('/verify/', location.origin).href }) });
        root.innerHTML = formHeader('Check your inbox', 'Verification') + '<p class="text-slate-500 text-center text-sm">If that address has an account, a verification link is on its way.</p>';
      }
      else if (state === 'signup') {
        await api('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ ...data, callbackURL: new URL('/verify/', location.origin).href }) });
        window.location.href = '/verification/';
      }
      else if (state === 'forgot') {
        await api('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email: data.email, redirectTo: new URL('/reset-password/', location.origin).href }) });
        root.innerHTML = formHeader('Check your inbox', 'Recovery') + '<p class="text-slate-500 text-center text-sm">If that address has an account, a reset link is on its way.</p>';
      }
      else {
        // Sign In Flow
        const userEmail = String(data.email).trim().toLowerCase();

        const response = await api('/api/auth/sign-in/email', {
          method: 'POST',
          body: JSON.stringify({ email: userEmail, password: data.password })
        });

      // 5. Returning User: 2FA is officially enabled and working
        if (response && response.twoFactorRedirect) {
          
          // Explicitly trigger OTP email dispatch on load for returning users
          try {
            await api('/api/auth/two-factor/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
          } catch (e) {
            console.warn('Initial OTP dispatch notice:', e);
          }
          
          root.innerHTML = formHeader('Two-Factor Authentication', 'Security Check') + `
            <form id="otp-form" class="text-left">
              <div class="mb-6">
                <label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">6-Digit Code</label>
                <input name="otp" type="text" required pattern="[a-zA-Z0-9]{6}" placeholder="Enter the code sent to your email" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white">
              </div>
              <button type="submit" class="w-full lumiere-btn mb-4">Verify & Log In</button>
              <button type="button" id="resend-otp-btn" class="w-full text-[10px] font-bold tracking-[0.2em] text-slate-400 hover:text-slate-900 uppercase transition-colors py-2 text-center block">Resend Code</button>
            </form>
          `;

          // Handle the Resend Button
          document.getElementById('resend-otp-btn').addEventListener('click', async (resendEvent) => {
            const btn = resendEvent.currentTarget;
            const originalText = btn.innerText;
            btn.innerText = 'SENDING...';
            btn.disabled = true;
            
            try {
              await api('/api/auth/two-factor/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              
              toast('A new 6-digit code has been sent.', 'success');
              btn.innerText = 'CODE SENT';
              
              setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
              }, 5000);
            } catch (error) {
              toast('Failed to resend: ' + error.message, 'error');
              btn.innerText = originalText;
              btn.disabled = false;
            }
          });

          // Handle the OTP Submission
          document.getElementById('otp-form').addEventListener('submit', async (otpEvent) => {
            otpEvent.preventDefault();
            const otpButton = otpEvent.currentTarget.querySelector('button[type="submit"]');
            setBusy(otpButton, true);
            const otpData = Object.fromEntries(new FormData(otpEvent.currentTarget));

            try {
              // Include method: 'otp' to prevent the 500 internal server error
              await api('/api/auth/two-factor/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  code: otpData.otp,
                  method: 'otp'
                })
              });
              
              window.location.replace(userEmail === 'lumiere.csproject@gmail.com' ? '/admin/' : afterLogin);
            } catch (error) {
              toast(error.message, 'error');
              setBusy(otpButton, false);
            }
          });
        }
        // 6. First-Time Login: Force Setup Screen
        else if (response && response.user) {

          // Skip 2FA setup entirely if it is the admin account
          if (userEmail === 'lumiere.csproject@gmail.com') {
            window.location.replace('/admin/');
            return;
          }

          // Force setup for all other users
          try {
            await api('/api/auth/two-factor/enable', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                password: data.password,
                method: 'otp'
              })
            });

            await api('/api/auth/two-factor/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });

            root.innerHTML = formHeader('Complete 2FA Setup', 'Security Check') + `
              <form id="setup-otp-form" class="text-left">
                <div class="mb-6">
                  <label class="block text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">6-Digit Code</label>
                  <input name="otp" type="text" required pattern="[a-zA-Z0-9]{6}" placeholder="Enter the code sent to your email" class="w-full border border-slate-200 p-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 rounded-none bg-white">
                </div>
                <button type="submit" class="w-full lumiere-btn">Verify & Secure Account</button>
              </form>
            `;

            document.getElementById('setup-otp-form').addEventListener('submit', async (otpEvent) => {
              otpEvent.preventDefault();
              const otpButton = otpEvent.currentTarget.querySelector('button');
              setBusy(otpButton, true);
              const otpData = Object.fromEntries(new FormData(otpEvent.currentTarget));

              try {
                await api('/api/auth/two-factor/verify-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    code: otpData.otp,
                    method: 'otp'
                  })
                });

                window.location.replace(afterLogin);
              } catch (error) {
                toast('Invalid setup code: ' + error.message, 'error');
                setBusy(otpButton, false);
              }
            });
          } catch (e) {
            toast('2FA Setup Error: ' + (e.message || 'Unknown API Error'), 'error');
            setBusy(button, false);
          }
        }
      }
    } catch (error) {
      toast(error.message, 'error');
      setBusy(button, false);
    }
  });
}
