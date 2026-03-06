'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // 1. Handle OTP/invite flow: ?token_hash= present
    const tokenHash = params.get('token_hash')
    const type = params.get('type') as EmailOtpType | null
    if (tokenHash) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: type || 'invite' }).then(({ error }) => {
        if (error) {
          router.replace('/login?error=auth_callback_error')
        } else {
          router.replace('/reset-password')
        }
      })
      return
    }

    // 2. Handle PKCE flow: ?code= present
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

    // 3. Handle implicit flow error: #error=...
    const hash = window.location.hash.substring(1)
    if (hash) {
      const hashParams = new URLSearchParams(hash)
      if (hashParams.get('error')) {
        router.replace('/login?error=auth_callback_error')
        return
      }

      // 4. Handle implicit flow token: #access_token=...
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
          if (error) {
            router.replace('/login?error=auth_callback_error')
          } else {
            router.replace('/reset-password')
          }
        })
        return
      }
    }

    // 5. Fallback: listen for auth state change + timeout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.replace('/reset-password')
      }
    })

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
