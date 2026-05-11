import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatGhsPrice } from '@/lib/autoUtils'
import { createServiceRoleClient } from '@/lib/serverSupabase'
import AutoDetailPage from './AutoDetailPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data } = await createServiceRoleClient()
    .from('auto_listings')
    .select('title, make, model, year, price, city, region, listing_type')
    .eq('id', id)
    .maybeSingle()

  if (!data) return { title: 'Vehicle | Gavel Autos' }
  const priceStr = data.price ? ` – ${formatGhsPrice(data.price)}` : ''
  if (data.listing_type === 'auction') {
    return { title: `${data.year} ${data.make} ${data.model} auction | Gavel Autos`, description: `${data.title} in ${data.city ?? data.region}${priceStr}` }
  }
  return { title: `${data.year} ${data.make} ${data.model} for sale in ${data.city ?? data.region} | Gavel Autos`, description: `${data.title}${priceStr}` }
}

export default async function AutoDetailServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceRoleClient()

  const [{ data: listing }, { data: profileRow }] = await Promise.all([
    db.from('auto_listings').select('*, auto_auctions(*)').eq('id', id).maybeSingle(),
    db.from('profiles').select('username').eq('id', id).maybeSingle(), // will be re-fetched below
  ])

  if (!listing || listing.status === 'archived') notFound()

  const { data: profile } = await db
    .from('profiles').select('username').eq('id', listing.seller_id).maybeSingle()

  // Fetch similar listings (same make, different id, active)
  const { data: similar } = await db
    .from('auto_listings')
    .select('id, title, make, model, year, price, condition, images, vehicle_type')
    .eq('status', 'active')
    .eq('make', listing.make)
    .neq('id', id)
    .limit(4)

  const auction = listing.auto_auctions?.[0] ?? null

  return (
    <AutoDetailPage
      listing={{ ...listing, profiles: profile ?? null }}
      auction={auction}
      similar={(similar ?? []) as any}
    />
  )
}
