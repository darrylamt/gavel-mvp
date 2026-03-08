import { NextResponse } from 'next/server'
import { getAuthUserWithRole, createServiceClient } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const auth = await getAuthUserWithRole(req)
    if ('error' in auth) return auth.error

    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const supabase = createServiceClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '')

    // Find auctions with empty image fields
    const { data: emptyImageAuctions, error: selectError } = await supabase
      .from('auctions')
      .select('id')
      .or(
        `and(image_url.is.null,images.is.null),and(image_url.eq."",images.is.null),and(image_url.is.null,images.eq."{}")`,
      )
      .limit(500)

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    const auctionsToFix = emptyImageAuctions || []
    let repairedCount = 0
    const results = []

    for (const auction of auctionsToFix) {
      const { data: files, error: listError } = await supabase.storage
        .from('auction-images')
        .list(`auctions/${auction.id}`, { limit: 100, sortBy: { column: 'name', order: 'asc' } })

      if (listError || !files || files.length === 0) {
        continue
      }

      const urls = (files)
        .filter((f) => f?.name && !f.name.endsWith('/'))
        .map((f) => `${supabaseUrl}/storage/v1/object/public/auction-images/auctions/${auction.id}/${f.name}`)

      if (!urls.length) continue

      const { error: updateError } = await supabase
        .from('auctions')
        .update({ image_url: urls[0], images: urls })
        .eq('id', auction.id)

      if (!updateError) {
        repairedCount += 1
        results.push({ auction_id: auction.id, image_count: urls.length })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Repaired ${repairedCount} out of ${auctionsToFix.length} auctions with missing images`,
      repaired_count: repairedCount,
      total_checked: auctionsToFix.length,
      details: results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Repair auction images error:', err)
    return NextResponse.json({ error: `Repair failed: ${message}` }, { status: 500 })
  }
}
