import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatGhsPrice, PROPERTY_TYPE_LABELS } from '@/lib/propertyUtils'
import { createServiceRoleClient } from '@/lib/serverSupabase'
import PropertyDetailPage from './PropertyDetailPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data } = await createServiceRoleClient()
    .from('property_listings')
    .select('title, city, region, price, property_type, listing_type')
    .eq('id', id)
    .maybeSingle()

  if (!data) return { title: 'Property | Gavel Properties' }
  const priceStr = data.price ? ` — ${formatGhsPrice(data.price)}` : ''
  const typeStr = PROPERTY_TYPE_LABELS[data.property_type] ?? data.property_type
  if (data.listing_type === 'auction') {
    return { title: `${data.title} in ${data.city}, ${data.region} | Gavel Properties`, description: `${typeStr} auction in ${data.city}, ${data.region}${priceStr}` }
  }
  return { title: `${data.title} in ${data.city}, ${data.region} | Gavel Properties`, description: `${typeStr} for sale in ${data.city}, ${data.region}${priceStr}` }
}

export default async function PropertyDetailServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceRoleClient()

  const { data: listing } = await db
    .from('property_listings')
    .select('*, property_auctions(*)')
    .eq('id', id)
    .maybeSingle()

  if (!listing || listing.status === 'archived') notFound()

  const { data: profile } = await db
    .from('profiles').select('username').eq('id', listing.seller_id).maybeSingle()

  // Similar listings: same property type, same region, different id
  const { data: similar } = await db
    .from('property_listings')
    .select('id, title, city, region, price, property_type, images, listing_type')
    .eq('status', 'active')
    .eq('property_type', listing.property_type)
    .eq('region', listing.region)
    .neq('id', id)
    .limit(4)

  const auction = listing.property_auctions?.[0] ?? null

  return (
    <PropertyDetailPage
      listing={{ ...listing, profiles: profile ?? null }}
      auction={auction}
      similar={(similar ?? []) as any}
    />
  )
}
