'use server'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller's delivery zones
    const { data: zones, error } = await supabase
      .from('seller_delivery_zones')
      .select('*')
      .eq('seller_id', user.id)
      .order('location_value')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ zones: zones || [] })
  } catch (error) {
    console.error('Error fetching delivery zones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, delivery_price, delivery_time_days, is_enabled } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing zone id' }, { status: 400 })
    }

    // Verify the zone belongs to the user
    const { data: zone, error: fetchError } = await supabase
      .from('seller_delivery_zones')
      .select('*')
      .eq('id', id)
      .eq('seller_id', user.id)
      .single()

    if (fetchError || !zone) {
      return NextResponse.json({ error: 'Zone not found or unauthorized' }, { status: 404 })
    }

    // Update the zone
    const { data: updatedZone, error: updateError } = await supabase
      .from('seller_delivery_zones')
      .update({
        delivery_price,
        delivery_time_days,
        is_enabled,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ zone: updatedZone })
  } catch (error) {
    console.error('Error updating delivery zone:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { location_value, delivery_price, delivery_time_days, is_enabled } = await req.json()

    if (!location_value) {
      return NextResponse.json({ error: 'Missing location_value' }, { status: 400 })
    }

    // Insert the zone
    const { data: newZone, error: insertError } = await supabase
      .from('seller_delivery_zones')
      .insert({
        seller_id: user.id,
        location_value,
        delivery_price: delivery_price || 5,
        delivery_time_days: delivery_time_days || 2,
        is_enabled: is_enabled ?? true,
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You already have a zone for this location' }, { status: 400 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ zone: newZone })
  } catch (error) {
    console.error('Error creating delivery zone:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing zone id' }, { status: 400 })
    }

    // Verify the zone belongs to the user before deleting
    const { data: zone, error: fetchError } = await supabase
      .from('seller_delivery_zones')
      .select('*')
      .eq('id', id)
      .eq('seller_id', user.id)
      .single()

    if (fetchError || !zone) {
      return NextResponse.json({ error: 'Zone not found or unauthorized' }, { status: 404 })
    }

    // Delete the zone
    const { error: deleteError } = await supabase
      .from('seller_delivery_zones')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting delivery zone:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
