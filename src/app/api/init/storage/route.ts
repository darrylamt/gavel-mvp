import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const buckets = ['avatars', 'auction-images']

    for (const bucketName of buckets) {
      // Check if bucket exists
      const { data: existingBuckets } = await supabase.storage.listBuckets()
      const bucketExists = existingBuckets?.some((b) => b.name === bucketName)

      if (!bucketExists) {
        console.log(`Creating bucket: ${bucketName}`)
        const { error: createErr } = await supabase.storage.createBucket(bucketName, {
          public: true,
        })

        if (createErr) {
          console.error(`Error creating bucket ${bucketName}:`, createErr)
          return NextResponse.json(
            { error: `Failed to create ${bucketName} bucket`, details: createErr.message },
            { status: 500 }
          )
        }
      } else {
        console.log(`Bucket ${bucketName} already exists`)
      }
    }

    return NextResponse.json({
      message: 'Storage buckets initialized successfully',
      buckets,
    })
  } catch (err: any) {
    console.error('Bucket initialization error:', err)
    return NextResponse.json(
      { error: 'Failed to initialize storage', details: err.message },
      { status: 500 }
    )
  }
}
