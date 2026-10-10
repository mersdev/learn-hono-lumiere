import type { Bindings } from '../types'

type EmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendTransactionalEmail(env: Bindings, input: EmailInput): Promise<void> {
  if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY is not configured.')

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Lumière', email: env.EMAIL_FROM },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text
    })
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('Email send failed:', response.status, body)
    throw new Error('Unable to send email.')
  }
}

export function verificationEmail(name: string, url: string): Pick<EmailInput, 'subject' | 'html' | 'text'> {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  return {
    subject: 'Verify your LUMIÈRE email',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Verify your email</h2><p>Hi ${safeName},</p><p>Confirm the email address for your LUMIÈRE account.</p><p><a href="${safeUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Verify email</a></p><p>This link expires in 60 minutes.</p></div>`,
    text: `Hi ${name}, verify your LUMIÈRE email: ${url}\nThis link expires in 60 minutes.`
  }
}

export function resetPasswordEmail(name: string, url: string): Pick<EmailInput, 'subject' | 'html' | 'text'> {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  return {
    subject: 'Reset your LUMIÈRE password',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Reset your password</h2><p>Hi ${safeName},</p><p>Use the secure link below to choose a new password.</p><p><a href="${safeUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p></div>`,
    text: `Hi ${name}, reset your LUMIÈRE password: ${url}\nThis link expires in 30 minutes.`
  }
}

// NEW: Generates the OTP email format for Two-Factor Authentication
export function otpEmail(otp: string): Pick<EmailInput, 'subject' | 'html' | 'text'> {
  const safeOtp = escapeHtml(otp)
  return {
    subject: 'LUMIÈRE - Login Authentication Code',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;text-align:center;"><h2>Authentication Required</h2><p>Your secure login code is:</p><strong style="font-size:32px;letter-spacing:4px;display:block;margin:20px 0;">${safeOtp}</strong><p style="font-size:12px;color:#666;">This code will expire in 5 minutes.</p></div>`,
    text: `Your LUMIÈRE login code is: ${otp}\nThis code will expire in 5 minutes.`
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char] || char))
}
