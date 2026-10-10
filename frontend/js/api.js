const API_BASE = window.APP_CONFIG?.API_BASE || 'http://localhost:8787'

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })

  let data = null
  try { data = await response.json() } catch { data = null }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

export async function getCurrentUser() {
  try {
    const data = await api('/api/auth/get-session', { method: 'GET' })
    
    if (!data || !data.user) {
      return null
    }
    return data.user
  } catch (error) {
    // Reveal the exact reason the session failed in the browser console (F12)
    console.error("Session Check Failed:", error.message);
    return null
  }
}
