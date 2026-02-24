-- Add image_urls array column to shop_products for multiple images
alter table public.shop_products
  add column if not exists image_urls text[];

-- Migrate existing image_url to image_urls if present
update public.shop_products
set image_urls = array[image_url]
where image_url is not null and (image_urls is null or array_length(image_urls, 1) = 0);

-- (Optional) You may later remove the old image_url column after full migration
-- alter table public.shop_products drop column image_url;
