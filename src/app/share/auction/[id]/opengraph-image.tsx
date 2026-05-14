import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { normalizeAuctionImageUrls } from '@/lib/auctionImages'

export const runtime = 'edge'
export const alt = 'Gavel Auction'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ id: string }> }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function Image({ params }: Props) {
  const { id } = await params

  const { data } = await supabase
    .from('auctions')
    .select('id, title, current_price, description, image_url, images')
    .eq('id', id)
    .single()

  const title = data?.title || 'Auction on Gavel'
  const price = data?.current_price ?? 0
  const images = normalizeAuctionImageUrls(data?.images, data?.image_url ?? null)
  const photo = images[0] ?? null

  // Short description — first sentence only
  const rawDesc = (data?.description ?? '').replace(/\*+/g, '').replace(/\n+/g, ' ').trim()
  const shortDesc = rawDesc.length > 100 ? rawDesc.slice(0, 97) + '…' : rawDesc

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          fontFamily: 'sans-serif',
          background: '#0f172a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Product photo — left side */}
        {photo && (
          <div style={{ width: 630, height: 630, flexShrink: 0, position: 'relative', display: 'flex' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Dark gradient over image for visual merge */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, transparent 60%, #0f172a 100%)',
            }} />
          </div>
        )}

        {/* Right panel (or full-width if no image) */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: photo ? '52px 52px 52px 32px' : '52px 56px',
        }}>
          {/* Top: Logo + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316', letterSpacing: '-1px' }}>
              Gavel
            </div>
            <div style={{
              background: '#f97316',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              padding: '5px 14px',
              borderRadius: 99,
              letterSpacing: '0.05em',
            }}>
              LIVE AUCTION
            </div>
          </div>

          {/* Middle: Title + desc */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              fontSize: photo ? 32 : 42,
              fontWeight: 700,
              color: '#f1f5f9',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
            }}>
              {title}
            </div>
            {shortDesc && (
              <div style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.5 }}>
                {shortDesc}
              </div>
            )}
          </div>

          {/* Bottom: Price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Current bid
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#f97316', letterSpacing: '-1px' }}>
              GHS {price.toLocaleString()}
            </div>
            <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
              gavelgh.com
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
