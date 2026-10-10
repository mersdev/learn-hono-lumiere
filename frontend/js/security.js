import { api, getCurrentUser } from './api.js';
import { renderShell, escapeHtml, toast } from './ui.js';

async function init() {
  await renderShell();

  const user = await getCurrentUser();
  if (!user) {
    location.href = '/login/?next=/account/security/';
    return;
  }

  const root = document.getElementById('account-root');
  const firstName = user.name ? user.name.split(' ')[0] : 'Client';

  // Upgraded luxury sidebar matching the details page
  const sidebar = `
    <aside class="pr-8 md:border-r md:border-slate-200 min-h-[60vh]">
      <h2 class="text-3xl font-serif text-slate-900 mb-10">Welcome, ${escapeHtml(firstName)}</h2>
      <ul class="space-y-6 text-sm">
        <li><a href="/account/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">My Orders</a></li>
        <li><a href="/account/details/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Account Details</a></li>
        <li><a href="/account/saved/" class="text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Saved Items</a></li>
        <li><a href="/account/security/" class="text-slate-900 transition-colors uppercase tracking-widest text-[10px] font-bold">Security Settings</a></li>
      </ul>
    </aside>
  `;

  const mainContent = `
    <div class="w-full max-w-3xl pl-0 lg:pl-12">
      <div class="mb-16">
        <h1 class="text-4xl font-serif text-slate-900 mb-4">Security Settings</h1>
        <p class="text-sm text-slate-500 font-serif italic">Manage your credentials and account protection.</p>
      </div>

      <div class="space-y-16">
        
        <!-- Section: Credentials -->
        <div>
          <h3 class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8 border-b border-slate-200 pb-4">Account Credentials</h3>
          
          <form id="password-form" class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div class="md:col-span-2">
              <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Current Password</label>
              <input name="currentPassword" type="password" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Enter current password" required>
            </div>
            
            <div class="md:col-span-2">
              <label class="block text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">New Password</label>
              <input name="newPassword" type="password" minlength="8" class="w-full border-b border-slate-300 py-3 bg-transparent text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder-slate-300" placeholder="Enter new password (min 8 characters)" required>
            </div>

            <div class="md:col-span-2 pt-4">
              <button type="submit" class="w-full md:w-auto bg-slate-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase px-14 py-4 hover:bg-slate-800 transition-colors">Update Password</button>
            </div>
          </form>
        </div>

        <div>
          <h3 class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8 border-b border-slate-200 pb-4">Authentication</h3>
          <p class="text-sm text-slate-500">A six-digit PIN sent to your verified email is required every time you log in.</p>
        </div>

        <!-- Section: Device History -->
        <div>
          <h3 class="text-[10px] font-bold tracking-[0.2em] text-slate-900 uppercase mb-8 border-b border-slate-200 pb-4">Device History</h3>
          
          <div class="flex justify-between items-center py-2">
            <div>
              <p class="text-sm text-slate-900 font-serif mb-1">Current Session</p>
              <p class="text-xs text-slate-400">Active right now</p>
            </div>
            <span class="text-[9px] tracking-[0.2em] font-bold uppercase text-slate-400">This Device</span>
          </div>
        </div>

      </div>
    </div>
  `;

  root.innerHTML = sidebar + mainContent;

  // --- PASSWORD UPDATE LOGIC ---
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'UPDATING...';

    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true
        })
      });
      toast('Password updated successfully.', 'success');
      e.currentTarget.reset();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  });


}

init().catch(console.error);
