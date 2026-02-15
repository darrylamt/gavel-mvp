export type SaleSource = 'gavel' | 'seller'

export type AuctionMeta = {
  saleSource: SaleSource
  sellerName?: string
  sellerPhone?: string
  sellerNetAmount?: number
}

const META_PREFIX = '[[GAVEL_META]]'

export function buildAuctionDescription(
  rawDescription: string,
  meta: AuctionMeta
): string {
  const clean = rawDescription.trim()
  return `${clean}\n\n${META_PREFIX}${JSON.stringify(meta)}`
}

export function parseAuctionMeta(value: string | null | undefined): {
  description: string
  meta: AuctionMeta | null
} {
  if (!value) {
    return { description: '', meta: null }
  }

  const index = value.lastIndexOf(META_PREFIX)

  if (index === -1) {
    return { description: value.trim(), meta: null }
  }

  const description = value.slice(0, index).trim()
  const rawMeta = value.slice(index + META_PREFIX.length).trim()

  try {
    const parsed = JSON.parse(rawMeta) as AuctionMeta
    return { description, meta: parsed }
  } catch {
    return { description: value.trim(), meta: null }
  }
}
