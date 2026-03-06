'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Handle PKCE flow: if ?code= exists, exchange it server-side style
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          router.replace('/login?error=auth_callback_error')
        } else {
          router.replace('/reset-password')
        }
      })
      return
    }

    // Handle implicit flow: hash fragment contains #error=...
    const hash = window.location.hash.substring(1)
    if (hash) {
      const hashParams = new URLSearchParams(hash)
      if (hashParams.get('error')) {
        router.replace('/login?error=auth_callback_error')
        return
      }
    }

    // Implicit flow: @supabase/ssr auto-detects #access_token=... and calls setSession
    // Listen for the auth state change event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.replace('/reset-password')
      }
    })

    // Timeout: if no auth event fires within 5 seconds, redirect to login
    const timeout = setTimeout(() => {
      setError('Unable to process authentication. The link may have expired.')
      setTimeout(() => {
        router.replace('/login?error=auth_callback_error')
      }, 2000)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <p className="text-red-600">{error}</p>
          <p className="text-gray-500 text-sm mt-2">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center text-gray-500">
        Processing invite...
      </div>
    </div>
  )
}
