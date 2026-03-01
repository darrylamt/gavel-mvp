-- Ensure legacy image_url is populated from image_urls for storefront compatibility
update public.shop_products
set image_url = coalesce(image_url, image_urls[1])
where image_url is null
  and image_urls is not null
  and array_length(image_urls, 1) > 0;
