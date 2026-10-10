import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins'
import type { Bindings } from '../types'
import { sendTransactionalEmail, resetPasswordEmail, verificationEmail, otpEmail } from './email'

export function createAuth(env: Bindings, onOtpDeliveryError?: () => void) {
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
      requireEmailVerification: true,
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
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, twoFactorEnabled: true } })
        }
      }
    },
    plugins: [
      twoFactor({
        totpOptions: { disable: true },
        otpOptions: {
          digits: 6,
          period: 5,
          async sendOTP({ user, otp }) {
            try {
              await sendTransactionalEmail(env, {
                to: user.email,
                ...otpEmail(otp)
              });
            } catch (error) {
              onOtpDeliveryError?.()
              throw error
            }
          }
        }
      })
    ]
  })
}
