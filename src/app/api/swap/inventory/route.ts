import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import type { SwapInventoryItem } from '@/types/swap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/swap/inventory
// Returns { inventory: SwapInventoryItem[], total: number }
// Query param ?model_id=<uuid> to filter by model
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const model_id = searchParams.get('model_id')

  let query = supabase
    .from('swap_inventory')
    .select('*, swap_phone_models(*)', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (model_id) {
    query = query.eq('model_id', model_id)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to fetch swap inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }

  const inventory = (data ?? []) as SwapInventoryItem[]

  return NextResponse.json({ inventory, total: count ?? inventory.length })
}
