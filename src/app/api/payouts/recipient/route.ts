import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { createTransferRecipient } from '@/lib/paystack-transfer'
import type { PaystackRecipientPayload } from '@/lib/paystack-transfer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const {
      seller_id,
      account_type,
      account_name,
      account_number,
      bank_code,
      network_code,
      is_default,
    } = await req.json()

    if (!seller_id || !account_type || !account_name || !account_number) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (account_type !== 'bank' && account_type !== 'momo') {
      return NextResponse.json(
        { error: 'Invalid account type. Must be bank or momo' },
        { status: 400 }
      )
    }

    if (account_type === 'bank' && !bank_code) {
      return NextResponse.json(
        { error: 'Bank code required for bank accounts' },
        { status: 400 }
      )
    }

    if (account_type === 'momo' && !network_code) {
      return NextResponse.json(
        { error: 'Network code required for mobile money accounts' },
        { status: 400 }
      )
    }

    // Create recipient on Paystack
    const recipientPayload: PaystackRecipientPayload =
      account_type === 'bank'
        ? {
            type: 'ghipss',
            name: account_name,
            account_number,
            bank_code: bank_code!,
            currency: 'GHS',
          }
        : {
            type: 'mobile_money',
            name: account_name,
            account_number,
            bank_code: network_code as 'MTN' | 'VOD' | 'ATL',
            currency: 'GHS',
          }

    const paystackResponse = await createTransferRecipient(recipientPayload)

    if (!paystackResponse.data?.recipient_code) {
      return NextResponse.json(
        { error: 'Failed to create Paystack recipient' },
        { status: 500 }
      )
    }

    // If this is set as default, unset any existing default accounts
    if (is_default) {
      await supabase
        .from('seller_payout_accounts')
        .update({ is_default: false })
        .eq('seller_id', seller_id)
    }

    // Save to database
    const { data: account, error } = await supabase
      .from('seller_payout_accounts')
      .insert({
        seller_id,
        account_type,
        account_name,
        account_number,
        bank_code: account_type === 'bank' ? bank_code : null,
        network_code: account_type === 'momo' ? network_code : null,
        recipient_code: paystackResponse.data.recipient_code,
        is_default: is_default ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save payout account:', error)
      return NextResponse.json(
        { error: 'Failed to save payout account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: account })
  } catch (error) {
    console.error('Error creating payout account:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const seller_id = searchParams.get('seller_id')

    if (!seller_id) {
 return NextResponse.json(
        { error: 'Missing seller_id' },
        { status: 400 }
      )
    }

    const { data: accounts, error } = await supabase
      .from('seller_payout_accounts')
      .select('*')
      .eq('seller_id', seller_id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch payout accounts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payout accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: accounts })
  } catch (error) {
    console.error('Error fetching payout accounts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const { account_id, seller_id, is_default } = await req.json()

    if (!account_id || !seller_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('seller_payout_accounts')
        .update({ is_default: false })
        .eq('seller_id', seller_id)
    }

    const { data, error } = await supabase
      .from('seller_payout_accounts')
      .update({ is_default })
      .eq('id', account_id)
      .eq('seller_id', seller_id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update payout account:', error)
      return NextResponse.json(
        { error: 'Failed to update payout account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating payout account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const account_id = searchParams.get('account_id')
    const seller_id = searchParams.get('seller_id')

    if (!account_id || !seller_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('seller_payout_accounts')
      .delete()
      .eq('id', account_id)
      .eq('seller_id', seller_id)

    if (error) {
      console.error('Failed to delete payout account:', error)
      return NextResponse.json(
        { error: 'Failed to delete payout account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payout account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
