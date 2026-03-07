import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)
  return success(user)
}
