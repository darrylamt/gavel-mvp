import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getAuthUserWithRole, createServiceClient } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const auth = await getAuthUserWithRole(req)
    if ('error' in auth) return auth.error

    const formData = await req.formData()
    const file = formData.get('file') as File
    const auctionId = typeof formData.get('auctionId') === 'string' ? formData.get('auctionId') as string : ''

    if (!file || !auctionId) {
      return NextResponse.json(
        { error: 'Missing file or auctionId' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('seller_id')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }
    const isOwner = auction.seller_id === auth.user.id
    const isAdmin = auth.role === 'admin'
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer())
    const safeBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')

    let uploadBuffer = originalBuffer
    let uploadContentType = file.type || 'application/octet-stream'
    let uploadExtension = file.name.split('.').pop() || 'bin'

    if (file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml') {
      const compressed = await sharp(originalBuffer)
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer()

      uploadBuffer = Buffer.from(compressed)

      uploadContentType = 'image/webp'
      uploadExtension = 'webp'
    }

    const filename = `auctions/${auctionId}/${Date.now()}-${safeBaseName}.${uploadExtension}`

    console.log('Uploading auction image:', filename)

    const { data, error } = await supabase.storage
      .from('auction-images')
      .upload(filename, uploadBuffer, {
        upsert: true,
        contentType: uploadContentType,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('Upload successful:', data)

    const { data: publicUrl } = supabase.storage
      .from('auction-images')
      .getPublicUrl(filename)

    return NextResponse.json({
      url: publicUrl.publicUrl,
      path: filename,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown upload error'
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    )
  }
}
