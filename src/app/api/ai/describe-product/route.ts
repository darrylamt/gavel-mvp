import { NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const { imageBase64, mediaType, productName } = await req.json()

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: 'Missing imageBase64 or mediaType' }, { status: 400 })
    }

    const client = new Anthropic()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `You are a product listing assistant for Gavel, a Ghanaian online marketplace. 
When given a product image${productName ? ` and product name "${productName}"` : ''}, write a clean, honest, and compelling product description.
- 2-4 sentences maximum
- Mention visible condition (new, used, good condition etc)
- Mention key features visible in the image
- Do not invent specs you cannot see
- Write in simple clear English
- Do not use marketing fluff like "amazing" or "incredible"
- End with one sentence about who it would suit

Return ONLY the description text, no JSON wrapper, no markdown.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Write a product description for this${productName ? ` ${productName}` : ' item'}.`,
            },
          ],
        },
      ],
    })

    const responseText = message.content
      .filter((block: { type?: string }) => block.type === 'text')
      .map((block: { type?: string; text?: string }) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim()

    return NextResponse.json({
      description: responseText,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('AI describe product error:', err)
    return NextResponse.json(
      { error: `AI description failed: ${message}` },
      { status: 500 }
    )
  }
}
