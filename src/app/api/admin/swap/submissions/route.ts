import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/swap/submissions
// Admin list of all swap submissions with optional filters.
// Query params: status (filter by status), search (search by user name/email/phone model/brand)
// Returns: { submissions: [...], total: number }
export async function GET(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  let query = supabase
    .from('swap_submissions')
    .select(
      `
      *,
      swap_phone_models(*),
      swap_inventory(
        *,
        swap_phone_models(*)
      ),
      profiles(
        id,
        full_name,
        email
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    // Search by user name, email (via profiles join) or phone model/brand
    // We use ilike on model brand/model fields; profile search handled post-fetch
    query = query.or(
      `swap_phone_models.brand.ilike.%${search}%,swap_phone_models.model.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to fetch swap submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }

  let submissions = data ?? []

  // If search provided, also filter by user name/email in memory
  if (search) {
    const lowerSearch = search.toLowerCase()
    submissions = submissions.filter((s) => {
      const profile = s.profiles as { full_name?: string | null; email?: string | null } | null
      const nameMatch = profile?.full_name?.toLowerCase().includes(lowerSearch) ?? false
      const emailMatch = profile?.email?.toLowerCase().includes(lowerSearch) ?? false
      const brandMatch =
        (s.swap_phone_models as { brand?: string } | null)?.brand
          ?.toLowerCase()
          .includes(lowerSearch) ?? false
      const modelMatch =
        (s.swap_phone_models as { model?: string } | null)?.model
          ?.toLowerCase()
          .includes(lowerSearch) ?? false
      return nameMatch || emailMatch || brandMatch || modelMatch
    })
  }

  return NextResponse.json({
    submissions,
    total: search ? submissions.length : (count ?? 0),
  })
}
