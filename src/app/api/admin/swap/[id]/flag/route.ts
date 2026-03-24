import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/swap/[id]/flag
// Toggle account flag on a submission. Requires admin.
// Body: { flag_reason: string | null }
// If flag_reason is provided, sets account_flagged=true; if null/absent, removes flag.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })
  }

  let body: { flag_reason?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const isFlagging = body.flag_reason !== null && body.flag_reason !== undefined && body.flag_reason.trim() !== ''

  const { error: updateError } = await supabase
    .from('swap_submissions')
    .update({
      account_flagged: isFlagging,
      flag_reason: isFlagging ? body.flag_reason!.trim() : null,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update flag on swap submission:', updateError)
    return NextResponse.json({ error: 'Failed to update submission flag' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
