export const SHOP_CATEGORIES = [
  'For Home',
  'For Audio',
  'For Mobile',
  'Accessories',
  'Other',
] as const

export type ShopCategory = (typeof SHOP_CATEGORIES)[number]

export function isShopCategory(value: string): value is ShopCategory {
  return SHOP_CATEGORIES.includes(value as ShopCategory)
}
