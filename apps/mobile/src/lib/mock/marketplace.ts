import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabaseClient = createClient(supabaseUrl, supabaseKey)

export type Auction = {
  id: string
  title: string
  current_price: number
  ends_at: string
  starts_at: string | null
  status: string | null
  image_url: string | null
  description?: string | null
}

export type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  stock: number
  category: string
  image_url: string | null
}

export async function getEndingSoonAuctions() {
  const nowIso = new Date().toISOString()
  const next24HoursIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabaseClient
    .from('auctions')
    .select('id, title, current_price, ends_at, starts_at, status, image_url')
    .in('status', ['active'])
    .gt('ends_at', nowIso)
    .lt('ends_at', next24HoursIso)
    .order('ends_at', { ascending: true })
    .limit(10)

  return (data ?? []) as Auction[]
}

export async function getActiveAuctions(limit = 20) {
  const nowIso = new Date().toISOString()

  const { data } = await supabaseClient
    .from('auctions')
    .select('id, title, current_price, ends_at, starts_at, status, image_url')
    .in('status', ['active'])
    .gt('ends_at', nowIso)
    .order('ends_at', { ascending: true })
    .limit(limit)

  return (data ?? []) as Auction[]
}

export async function getAuctionById(id: string) {
  const { data } = await supabaseClient
    .from('auctions')
    .select('id, title, current_price, ends_at, starts_at, status, image_url, description')
    .eq('id', id)
    .maybeSingle()

  return data as Auction | null
}

export async function getActiveProducts(limit = 20) {
  const { data } = await supabaseClient
    .from('shop_products')
    .select('id, title, description, price, stock, category, image_url')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as ShopProduct[]
}
