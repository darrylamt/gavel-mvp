import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const buckets = [
      { name: 'avatars', isPublic: true },
      { name: 'auction-images', isPublic: true },
      { name: 'seller-documents', isPublic: false },
    ]

    const { data: existingBuckets } = await supabase.storage.listBuckets()

    for (const bucket of buckets) {
      const bucketExists = existingBuckets?.some((b) => b.name === bucket.name)

      if (!bucketExists) {
        console.log(`Creating bucket: ${bucket.name}`)
        const { error: createErr } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.isPublic,
        })

        if (createErr) {
          console.error(`Error creating bucket ${bucket.name}:`, createErr)
          return NextResponse.json(
            { error: `Failed to create ${bucket.name} bucket`, details: createErr.message },
            { status: 500 }
          )
        }
      } else {
        console.log(`Bucket ${bucket.name} already exists`)
      }
    }

    return NextResponse.json({
      message: 'Storage buckets initialized successfully',
      buckets: buckets.map((bucket) => bucket.name),
    })
  } catch (err: any) {
    console.error('Bucket initialization error:', err)
    return NextResponse.json(
      { error: 'Failed to initialize storage', details: err.message },
      { status: 500 }
    )
  }
}
