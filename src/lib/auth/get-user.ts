import { cache } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  name: string
  organization_id: string | null
  organization_name: string | null
  is_admin: boolean
  created_at: string
}

export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('id, email, phone, name, organization_id, is_admin, created_at, organizations(name)')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch user profile: ${error.message}`)
  }

  if (!profile) return null

  const org = profile.organizations as unknown as { name: string } | null
  const { organizations: _, ...rest } = profile
  return { ...rest, organization_name: org?.name ?? null } as UserProfile
})
