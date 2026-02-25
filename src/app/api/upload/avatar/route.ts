import { NextResponse } from 'next/server'
import { getAuthUser, createServiceClient } from '@/lib/apiAuth'

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req)
    if ('error' in auth) return auth.error

    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = typeof formData.get('userId') === 'string' ? formData.get('userId') as string : ''

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Missing file or userId' },
        { status: 400 }
      )
    }
    if (userId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceClient()
    const filename = `${userId}/${Date.now()}-${file.name}`
    const buffer = await file.arrayBuffer()

    console.log('Uploading avatar:', filename)

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filename, Buffer.from(buffer), {
        upsert: true,
        contentType: file.type,
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
      .from('avatars')
      .getPublicUrl(filename)

    return NextResponse.json({
      url: publicUrl.publicUrl,
      path: filename,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    )
  }
}
