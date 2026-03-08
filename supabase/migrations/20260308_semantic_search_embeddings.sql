-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to auctions and shop_products
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create indexes for faster similarity search
CREATE INDEX IF NOT EXISTS auctions_embedding_idx ON auctions USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS shop_products_embedding_idx ON shop_products USING ivfflat (embedding vector_cosine_ops);

-- Create function for semantic search across both auctions and products
CREATE OR REPLACE FUNCTION search_listings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  price numeric,
  image_url text,
  type text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    id, 
    title, 
    description,
    NULL::text as category,
    current_price as price,
    image_url,
    'auction' as type,
    1 - (embedding <=> query_embedding) as similarity
  FROM auctions
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
    AND status IN ('active', 'scheduled')
  UNION ALL
  SELECT 
    id, 
    title, 
    description,
    category,
    price,
    CASE 
      WHEN image_urls IS NOT NULL AND array_length(image_urls, 1) > 0 THEN image_urls[1]
      ELSE image_url
    END as image_url,
    'product' as type,
    1 - (embedding <=> query_embedding) as similarity
  FROM shop_products
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
    AND status = 'active'
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_listings TO authenticated;
GRANT EXECUTE ON FUNCTION search_listings TO anon;
