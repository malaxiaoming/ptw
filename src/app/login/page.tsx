'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from './actions'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      router.replace('/reset-password' + window.location.hash)
    }
  }, [router])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    try {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch (err) {
      if (isRedirectError(err)) {
        throw err
      }
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="relative lg:w-[45%] bg-[#0F4C5C] text-white px-8 py-12 lg:py-0 lg:px-16 flex flex-col justify-center overflow-hidden">
        {/* Geometric pattern overlay */}
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

        {/* Diagonal accent line */}
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

          {/* Status indicators */}
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
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-8">Enter your credentials to continue</p>

          <form action={handleSubmit} className="space-y-5">
            <Input
              name="identifier"
              label="Email or Phone Number"
              type="text"
              required
              autoComplete="username"
              placeholder="email@example.com or +65XXXXXXXX"
            />

            <Input
              name="password"
              label="Password"
              type="password"
              required
              autoComplete="current-password"
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
              Sign In
            </Button>

            <div className="text-center space-y-2">
              <Link href="/forgot-password" className="block text-sm text-primary-600 hover:text-primary-700 hover:underline">
                Forgot password?
              </Link>
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary-600 hover:text-primary-700 hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
