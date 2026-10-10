import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins'
import type { Bindings } from '../types'
import { sendTransactionalEmail, resetPasswordEmail, verificationEmail, otpEmail } from './email'

export function createAuth(env: Bindings) {
  const isProd = env.BETTER_AUTH_URL?.startsWith('https://');

  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    user: {
      additionalFields: {
        phone: { type: 'string', required: false, defaultValue: '' },
        address: { type: 'string', required: false, defaultValue: '' }
      }
    },
    trustedOrigins: [env.APP_ORIGIN, 'http://localhost:8788', 'http://localhost:8787'],
    advanced: {
      useSecureCookies: isProd,
      defaultCookieAttributes: { 
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd 
      }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, 
      minPasswordLength: 8,            
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendTransactionalEmail(env, { to: user.email, ...resetPasswordEmail(user.name, url) })
      }
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      sendVerificationEmail: async ({ user, url }) => {
        await sendTransactionalEmail(env, { to: user.email, ...verificationEmail(user.name, url) })
      }
    },
    plugins: [
      twoFactor({
        otpOptions: {
          async sendOTP({ user, otp }) {
            await sendTransactionalEmail(env, { 
              to: user.email, 
              ...otpEmail(otp) 
            });
          }
        }
      })
    ]
  })
}
