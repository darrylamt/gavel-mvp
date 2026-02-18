import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer())
    const safeBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')

    let uploadBuffer = originalBuffer
    let uploadContentType = file.type || 'application/octet-stream'
    let uploadExtension = file.name.split('.').pop() || 'bin'

    if (file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml') {
      const compressed = await sharp(originalBuffer)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer()

      uploadBuffer = Buffer.from(compressed)
      uploadContentType = 'image/webp'
      uploadExtension = 'webp'
    }

    const filename = `products/${Date.now()}-${safeBaseName}.${uploadExtension}`

    const { error } = await supabase.storage
      .from('auction-images')
      .upload(filename, uploadBuffer, {
        upsert: true,
        contentType: uploadContentType,
      })

    if (error) {
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage
      .from('auction-images')
      .getPublicUrl(filename)

    return NextResponse.json({
      url: publicUrl.publicUrl,
      path: filename,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown upload error'
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 })
  }
}
