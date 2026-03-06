'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
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

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16 bg-gray-50">
        <div className="w-full max-w-sm animate-fade-in">
          {sent ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h2 className="text-base font-semibold text-green-800 mb-1">Check your email</h2>
                <p className="text-sm text-green-700">
                  We sent a password reset link to <span className="font-medium">{email}</span>.
                  Click the link in the email to set a new password.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary-600 hover:text-primary-700 hover:underline"
                >
                  try again
                </button>
                .
              </p>
              <div className="pt-2">
                <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Forgot password?</h2>
              <p className="text-sm text-gray-500 mb-8">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  name="email"
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
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
                  Send Reset Link
                </Button>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
                    ← Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
