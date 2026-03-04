'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabaseClient()

  // Determine if identifier is email or phone
  const isPhone = identifier.startsWith('+')
  const credentials = isPhone
    ? { phone: identifier, password }
    : { email: identifier, password }

  const { error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
