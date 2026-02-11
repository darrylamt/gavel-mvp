import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Missing file or userId' },
        { status: 400 }
      )
    }

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
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: `Upload failed: ${err.message}` },
      { status: 500 }
    )
  }
}
