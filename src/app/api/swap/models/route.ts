import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import type { SwapPhoneModel } from '@/types/swap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/swap/models
// Returns { brands: string[], models: SwapPhoneModel[] }
// Query param ?brand=Apple to filter by brand
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand')

  let query = supabase
    .from('swap_phone_models')
    .select('*')
    .eq('is_active', true)
    .order('brand', { ascending: true })
    .order('model', { ascending: true })

  if (brand) {
    query = query.eq('brand', brand)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch swap phone models:', error)
    return NextResponse.json({ error: 'Failed to fetch phone models' }, { status: 500 })
  }

  const models = (data ?? []) as SwapPhoneModel[]

  const brands = Array.from(new Set(models.map((m) => m.brand))).sort()

  return NextResponse.json({ brands, models })
}
