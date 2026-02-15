import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Gavel Auction Share Card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type AuctionRecord = {
  id: string
  title: string
  current_price: number
}

type Props = {
  params: Promise<{ id: string }>
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function Image({ params }: Props) {
  const { id } = await params

  const { data } = await supabase
    .from('auctions')
    .select('id, title, current_price')
    .eq('id', id)
    .single()

  const auction = (data as AuctionRecord | null) ?? null

  const title = auction?.title || 'Auction on Gavel'
  const price = auction?.current_price ?? 0

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a, #111827)',
          color: 'white',
          padding: '56px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.2, maxWidth: 980 }}>{title}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 22, opacity: 0.8 }}>Current bid</div>
            <div style={{ fontSize: 56, fontWeight: 800 }}>GHS {price.toLocaleString()}</div>
          </div>

          <div style={{ fontSize: 38, fontWeight: 700 }}>Gavel</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
