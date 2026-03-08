type ImageLikeRecord = {
  url?: unknown
  src?: unknown
  image_url?: unknown
  publicUrl?: unknown
  public_url?: unknown
  signedUrl?: unknown
  signed_url?: unknown
  secure_url?: unknown
  path?: unknown
  images?: unknown
}

function toPublicAuctionImageUrl(value: string): string {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '')
  if (!trimmed) return ''

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, 'https://')
  }

  if (/^\/\//.test(trimmed)) {
    return `https:${trimmed}`
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '')
  const normalizedPath = trimmed
    .replace(/^\/+/, '')
    .replace(/^auction-images\//, '')
    .replace(/^storage\/v1\/object\/public\/auction-images\//, '')

  if (!normalizedPath) return ''
  if (!supabaseUrl) return normalizedPath

  return `${supabaseUrl}/storage/v1/object/public/auction-images/${normalizedPath}`
}

function collectImageString(value: unknown): string | null {
  if (typeof value === 'string') {
    const resolved = toPublicAuctionImageUrl(value)
    return resolved || null
  }

  if (!value || typeof value !== 'object') return null

  const candidate = value as ImageLikeRecord
  const possibleValues = [
    candidate.url,
    candidate.src,
    candidate.image_url,
    candidate.publicUrl,
    candidate.public_url,
    candidate.signedUrl,
    candidate.signed_url,
    candidate.secure_url,
    candidate.path,
  ]
  for (const next of possibleValues) {
    if (typeof next === 'string' && next.trim()) {
      const resolved = toPublicAuctionImageUrl(next)
      if (resolved) return resolved
    }
  }

  if (candidate.images) {
    return collectImageString(candidate.images)
  }

  return null
}

function parseMaybeJson(raw: string): unknown | null {
  const value = raw.trim()
  if (!((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}')))) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function expandImageCandidates(value: unknown): unknown[] {
  if (value == null) return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => expandImageCandidates(item))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    const maybeJson = parseMaybeJson(trimmed)
    if (maybeJson != null) {
      return expandImageCandidates(maybeJson)
    }

    if (trimmed.includes(',')) {
      const parts = trimmed
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)

      if (parts.length > 1) {
        return parts.flatMap((part) => expandImageCandidates(part))
      }
    }

    return [trimmed]
  }

  if (typeof value === 'object') {
    const record = value as ImageLikeRecord
    return [record]
  }

  return []
}

export function normalizeAuctionImageUrls(
  images: unknown,
  fallbackImageUrl?: string | null
): string[] {
  const source = [
    ...expandImageCandidates(images),
    ...expandImageCandidates(fallbackImageUrl),
  ]

  const normalized = source
    .map((item) => collectImageString(item))
    .filter((item): item is string => Boolean(item))

  return Array.from(new Set(normalized))
}
