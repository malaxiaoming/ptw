import { cache } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  name: string
  organization_id: string | null
  is_admin: boolean
  created_at: string
}

export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('id, email, phone, name, organization_id, is_admin, created_at')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch user profile: ${error.message}`)
  }

  return profile as UserProfile | null
})
