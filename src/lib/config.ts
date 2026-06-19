/**
 * Global feature flags.
 *
 * SHOP_ENABLED — master switch for the legacy fixed-price shop
 * (shop_products / cart / checkout). Gavel is now an auctions-only platform, so
 * this defaults to OFF. When false, the entire fixed-price shop experience is
 * hidden and inaccessible (nav links, homepage sections, search results, shop
 * routes, and seller product creation). Existing shop_orders are NOT affected —
 * past orders remain viewable and fulfillable regardless of this flag.
 *
 * Reversibility: set NEXT_PUBLIC_SHOP_ENABLED=true in the environment (and
 * redeploy, since NEXT_PUBLIC_* values are inlined at build time) to bring the
 * shop UI/routes back. To also re-surface the archived catalogue, run:
 *   UPDATE shop_products SET archived = false;
 *
 * Search for `SHOP_ENABLED` across the codebase to find every place the shop is
 * gated.
 */
export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED === 'true';
