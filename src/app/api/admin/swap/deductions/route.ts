import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/swap/deductions
// List all deduction rates with model joined. Requires admin.
export async function GET(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('swap_deduction_rates')
    .select(`
      *,
      swap_phone_models(*)
    `)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch deduction rates:', error)
    return NextResponse.json({ error: 'Failed to fetch deduction rates' }, { status: 500 })
  }

  return NextResponse.json({ deductions: data ?? [] })
}
