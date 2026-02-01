import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()

  const res = await fetch(
    'https://api.paystack.co/transaction/initialize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: body.amount * 100,
        email: 'customer@gavel.com',
        callback_url: 'http://localhost:3000',
      }),
    }
  )

  const data = await res.json()
  return NextResponse.json(data.data)
}
