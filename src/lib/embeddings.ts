/**
 * Generate OpenAI text embedding for semantic search
 * Uses text-embedding-3-small model (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  // Clean and prepare text
  const cleanText = text.trim().replace(/\s+/g, ' ')
  
  if (!cleanText) {
    throw new Error('Cannot generate embedding for empty text')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: cleanText,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API')
    }

    return data.data[0].embedding as number[]
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

/**
 * Generate embedding text from listing data
 */
export function buildEmbeddingText(params: {
  title: string
  description?: string | null
  category?: string | null
}): string {
  const parts: string[] = [params.title]
  
  if (params.description) {
    parts.push(params.description)
  }
  
  if (params.category) {
    parts.push(params.category)
  }
  
  return parts.join(' ').trim()
}

/**
 * Generate and return embedding for a listing
 */
export async function generateListingEmbedding(params: {
  title: string
  description?: string | null
  category?: string | null
}): Promise<number[]> {
  const text = buildEmbeddingText(params)
  return generateEmbedding(text)
}
