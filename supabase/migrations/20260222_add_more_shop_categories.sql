insert into public.shop_categories (name, slug, description, image_url, sort_order, is_active)
values
  ('Electronics', 'electronics', 'Phones, gadgets, smart devices', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80', 1, true),
  ('Home Appliances', 'home-appliances', 'Kitchen and everyday essentials', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80', 2, true),
  ('Vehicles', 'vehicles', 'Cars, bikes and accessories', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80', 3, true),
  ('Fashion', 'fashion', 'Clothing, shoes and lifestyle', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80', 4, true),
  ('Furniture', 'furniture', 'Living room and office pieces', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 5, true),
  ('Collectibles', 'collectibles', 'Unique finds and rare items', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=80', 6, true),
  ('Cosmetics', 'cosmetics', 'Beauty, skincare, and makeup', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80', 7, true),
  ('Books', 'books', 'Textbooks, novels, and learning', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80', 8, true),
  ('Sports', 'sports', 'Fitness gear and accessories', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80', 9, true),
  ('Kids', 'kids', 'Toys, essentials, and accessories', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80', 10, true),
  ('Office Supplies', 'office-supplies', 'Workstation and stationery picks', 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=80', 11, true),
  ('Jewelry', 'jewelry', 'Rings, watches, and accessories', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80', 12, true),
  ('Other', 'other', 'General products', 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=80', 99, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.shop_products
  drop constraint if exists shop_products_category_check;

update public.shop_products p
set category = 'Other'
where category is null
   or btrim(category) = ''
   or category not in (
     'Electronics',
     'Home Appliances',
     'Vehicles',
     'Fashion',
     'Furniture',
     'Collectibles',
     'Cosmetics',
     'Books',
     'Sports',
     'Kids',
     'Office Supplies',
     'Jewelry',
     'Other'
   );

alter table public.shop_products
  add constraint shop_products_category_check
  check (
    category in (
      'Electronics',
      'Home Appliances',
      'Vehicles',
      'Fashion',
      'Furniture',
      'Collectibles',
      'Cosmetics',
      'Books',
      'Sports',
      'Kids',
      'Office Supplies',
      'Jewelry',
      'Other'
    )
  );
