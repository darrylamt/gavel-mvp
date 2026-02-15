export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function buildAuctionPath(id: string, title?: string | null) {
  const slug = slugify(title || 'auction')
  return `/auctions/${id}/${slug}`
}
