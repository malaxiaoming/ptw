'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup, resendVerification } from './actions'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    try {
      const result = await signup(formData)
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else if (result.success && result.email) {
        setConfirmedEmail(result.email)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!confirmedEmail) return
    setResending(true)
    setResendMessage(null)
    const result = await resendVerification(confirmedEmail)
    if (result.error) {
      setResendMessage(`Failed to resend: ${result.error}`)
    } else {
      setResendMessage('Verification email resent.')
    }
    setResending(false)
  }

  // Confirmation panel after successful signup
  if (confirmedEmail) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <BrandingPanel />
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16 bg-gray-50">
          <div className="w-full max-w-sm animate-fade-in text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Created</h2>
            <p className="text-sm text-gray-600 mb-1">
              We&apos;ve sent a verification email to:
            </p>
            <p className="text-sm font-medium text-gray-900 mb-4">{confirmedEmail}</p>
            <p className="text-sm text-gray-500 mb-6">
              Please click the link in the email to verify your account before signing in.
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleResend}
                loading={resending}
                variant="secondary"
                className="w-full"
              >
                Resend Verification Email
              </Button>

              {resendMessage && (
                <p className={`text-sm ${resendMessage.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                  {resendMessage}
                </p>
              )}

              <Link
                href="/login"
                className="block w-full text-center text-sm text-primary-600 hover:text-primary-700 hover:underline py-2"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <BrandingPanel />
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16 bg-gray-50">
        <div className="w-full max-w-sm animate-fade-in">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create an account</h2>
          <p className="text-sm text-gray-500 mb-8">Register your company to get started</p>

          <form action={handleSubmit} className="space-y-5">
            <Input
              name="name"
              label="Full Name"
              type="text"
              required
              autoComplete="name"
              placeholder="John Doe"
            />

            <Input
              name="email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              placeholder="email@example.com"
            />

            <Input
              name="password"
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Min. 6 characters"
            />

            <Input
              name="companyName"
              label="Company Name"
              type="text"
              required
              placeholder="Your company name"
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="w-full"
            >
              Create Account
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-500">Already have an account? </span>
              <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function BrandingPanel() {
  return (
    <div className="relative lg:w-[45%] bg-[#0F4C5C] text-white px-8 py-12 lg:py-0 lg:px-16 flex flex-col justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: `
          linear-gradient(30deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%, #fff),
          linear-gradient(150deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%, #fff),
          linear-gradient(30deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%, #fff),
          linear-gradient(150deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%, #fff),
          linear-gradient(60deg, rgba(255,255,255,.25) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,.25) 75%, rgba(255,255,255,.25)),
          linear-gradient(60deg, rgba(255,255,255,.25) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,.25) 75%, rgba(255,255,255,.25))
        `,
        backgroundSize: '40px 70px',
        backgroundPosition: '0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px',
      }} />
      <div className="absolute top-0 right-0 w-1 h-full bg-amber-400 hidden lg:block" />

      <div className="relative z-10 max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
            <ShieldCheck className="h-8 w-8 text-amber-400" />
          </div>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
          Permit-To-Work
          <br />
          <span className="text-amber-400">System</span>
        </h1>
        <p className="mt-4 text-white/70 text-base leading-relaxed max-w-sm">
          Safety-critical permit management for construction sites. MOM ePTW compliant.
        </p>

        <div className="mt-8 flex gap-4 text-xs font-medium text-white/50 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            System Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            MOM Compliant
          </span>
        </div>
      </div>
    </div>
  )
}
