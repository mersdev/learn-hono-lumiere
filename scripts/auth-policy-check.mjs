import assert from 'node:assert/strict'

const api = process.env.API_URL || 'http://localhost:8787'
const post = (path, body) => fetch(`${api}${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
})

for (const path of ['/api/auth/two-factor/disable', '/api/auth/two-factor/verify-totp', '/api/auth/two-factor/verify-backup-code']) {
  assert.equal((await post(path, {})).status, 403, `${path} must be unavailable`)
}
assert.equal((await post('/api/auth/two-factor/send-otp', { trustDevice: true })).status, 400)
assert.equal((await post('/api/auth/two-factor/verify-otp', { code: '123456', trustDevice: true })).status, 400)
assert.equal((await fetch(`${api}/api/orders`)).status, 401)
assert.equal(await (await fetch(`${api}/api/auth/get-session`)).json(), null)

console.log('Email PIN route policy passed.')
