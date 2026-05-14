import { NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'

async function describeWithAnthropic(input: {
  imageBase64: string
  mediaType: string
  productName?: string
  apiKey: string
}) {
  const client = new Anthropic({ apiKey: input.apiKey })

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 300,
    system: `You are a professional listing copywriter for Gavel, Ghana's premier online auction and marketplace platform.
Your task: write a clean, compelling product description${input.productName ? ` for "${input.productName}"` : ''} based on the image.

Guidelines:
- Write in third person, as a professional marketplace listing (not first person)
- 2–3 sentences, punchy and clear — lead with the strongest feature or selling point
- Mention condition naturally (e.g., "in excellent condition", "lightly used", "brand new")
- Include key visible details: color, material, notable features or specifications
- Close with the ideal buyer or use case in one phrase
- Professional, confident tone — no filler words, no speculation
- No bullet points, asterisks, bold, or any markdown formatting
- Output only the description text — no prefix, no label, no quotes`,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: input.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: input.imageBase64,
            },
          },
          {
            type: 'text',
            text: `Write a product description for this${input.productName ? ` ${input.productName}` : ' item'}.`,
          },
        ],
      },
    ],
  })

  return message.content
    .filter((block: { type?: string }) => block.type === 'text')
    .map((block: { type?: string; text?: string }) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim()
}

async function describeWithOpenAI(input: {
  imageBase64: string
  mediaType: string
  productName?: string
  apiKey: string
}) {
  const systemPrompt = `You are a professional listing copywriter for Gavel, Ghana's premier online marketplace.
Write a 2–3 sentence product description in third person (not first person).
Lead with the strongest feature. Mention condition naturally. Close with ideal buyer.
Professional tone, no bullet points, no markdown. Output only the description text.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 220,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Write a product description for this${input.productName ? ` ${input.productName}` : ' item'}.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${input.mediaType};base64,${input.imageBase64}` },
            },
          ],
        },
      ],
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const msg = payload?.error?.message || 'OpenAI request failed'
    throw new Error(msg)
  }

  const text = payload?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('OpenAI returned an empty description')
  }

  return text.trim()
}

export async function POST(req: Request) {
  try {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    const openAIApiKey = process.env.OPENAI_API_KEY

    const { imageBase64, mediaType, productName } = await req.json()

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: 'Missing imageBase64 or mediaType' }, { status: 400 })
    }

    let responseText = ''

    if (anthropicApiKey) {
      try {
        responseText = await describeWithAnthropic({
          imageBase64,
          mediaType,
          productName,
          apiKey: anthropicApiKey,
        })
      } catch (anthropicError) {
        console.warn('Anthropic description failed; falling back to OpenAI.', anthropicError)
      }
    }

    if (!responseText && openAIApiKey) {
      responseText = await describeWithOpenAI({
        imageBase64,
        mediaType,
        productName,
        apiKey: openAIApiKey,
      })
    }

    if (!responseText) {
      return NextResponse.json(
        { error: 'AI service is not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' },
        { status: 500 }
      )
    }

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
