'use server'

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

interface SignupResult {
  error?: string
  success?: boolean
  email?: string
}

export async function signup(formData: FormData): Promise<SignupResult> {
  const name = formData.get('name') as string | null
  const email = formData.get('email') as string | null
  const password = formData.get('password') as string | null
  const companyName = formData.get('companyName') as string | null

  if (!name || !email || !password || !companyName) {
    return { error: 'All fields are required.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  const supabase = await createServerSupabaseClient()
  const serviceClient = await createServiceRoleClient()

  // Sign up the user (sends verification email)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create account.' }
  }

  const userId = authData.user.id

  // Create organization
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: companyName })
    .select('id')
    .single()

  if (orgError) {
    // Rollback: delete auth user
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: `Failed to create organization: ${orgError.message}` }
  }

  // Create user profile as org admin
  const { error: profileError } = await serviceClient
    .from('user_profiles')
    .insert({
      id: userId,
      email,
      name,
      organization_id: org.id,
      is_admin: true,
    })

  if (profileError) {
    // Rollback: delete org + auth user
    await serviceClient.from('organizations').delete().eq('id', org.id)
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: `Failed to create user profile: ${profileError.message}` }
  }

  return { success: true, email }
}

export async function resendVerification(email: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) return { error: error.message }
  return {}
}
