import { NextResponse } from 'next/server'
import 'server-only'
import { getGhanaBanks } from '@/lib/paystack-transfer'

export async function GET() {
  try {
    const response = await getGhanaBanks()

    if (!response.data) {
      return NextResponse.json(
        { error: 'Failed to fetch banks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: response.data })
  } catch (error) {
    console.error('Error fetching banks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
