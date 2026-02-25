import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getAuthUserWithRole, createServiceClient } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const auth = await getAuthUserWithRole(req)
    if ('error' in auth) return auth.error
    if (auth.role !== 'seller' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const files = formData.getAll('file')
    if (files.length !== 1) {
      return NextResponse.json({ error: 'Exactly one file is allowed' }, { status: 400 })
    }

    const first = files[0]
    if (!(first instanceof File)) {
      return NextResponse.json({ error: 'Invalid file payload' }, { status: 400 })
    }

    const file = first

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

    const supabase = createServiceClient()
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
