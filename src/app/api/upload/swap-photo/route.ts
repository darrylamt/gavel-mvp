import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getAuthUser, createServiceClient } from '@/lib/apiAuth'

// POST /api/upload/swap-photo
// Uploads a swap photo to Supabase storage bucket 'swap-photos'.
// Auth required.
// FormData fields: file (File), label (string)
// Returns: { url: string, path: string }
export async function POST(req: Request) {
  try {
    const authResult = await getAuthUser(req)
    if ('error' in authResult) return authResult.error

    const { user } = authResult

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const label = typeof formData.get('label') === 'string' ? (formData.get('label') as string) : 'photo'

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer())

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

    const safeLabel = label.replace(/[^a-zA-Z0-9-_]/g, '_')
    const filename = `swaps/${user.id}/${Date.now()}-${safeLabel}.${uploadExtension}`

    const supabase = createServiceClient()

    const { data, error } = await supabase.storage
      .from('auction-images')
      .upload(filename, uploadBuffer, {
        upsert: true,
        contentType: uploadContentType,
      })

    if (error) {
      console.error('Swap photo upload error:', error)
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
    }

    console.log('Swap photo uploaded:', data)

    const { data: publicUrl } = supabase.storage.from('auction-images').getPublicUrl(filename)

    return NextResponse.json({
      url: publicUrl.publicUrl,
      path: filename,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown upload error'
    console.error('Swap photo upload error:', err)
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 })
  }
}
