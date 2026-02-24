export type WhatsAppCategory = 'transactional' | 'security' | 'marketing'

export type WhatsAppTemplateKey =
  | 'account_created'
  | 'auction_starts_24h'
  | 'auction_starts_1h'
  | 'auction_starts_10m'
  | 'auction_live'
  | 'outbid'
  | 'highest_bidder'
  | 'seller_new_bid'
  | 'auction_ending_5m'
  | 'auction_ending_1m'
  | 'auction_won'
  | 'auction_lost'
  | 'seller_item_sold'
  | 'reserve_not_met'
  | 'payment_link'
  | 'payment_reminder_30m'
  | 'payment_final_reminder'
  | 'payment_received'
  | 'seller_funds_pending'
  | 'seller_ship_item'
  | 'buyer_item_shipped'
  | 'buyer_item_delivered'
  | 'buy_now_order_confirmation'
  | 'seller_application_received'
  | 'seller_application_approved'
  | 'seller_application_rejected'
  | 'suspicious_login'
  | 'failed_logins'
  | 'password_changed'
  | 'watchlist_new_bid'
  | 'watchlist_starts_1h'
  | 'watchlist_ends_10m'
  | 'tokens_purchased'
  | 'low_token_balance'

export type WhatsAppTemplateDefinition = {
  key: WhatsAppTemplateKey
  category: WhatsAppCategory
  templateName: string
  languageCode: string
  requiresTemplate: boolean
}

const DEFAULT_LANGUAGE_CODE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'

export const WHATSAPP_TEMPLATE_MAP: Record<WhatsAppTemplateKey, WhatsAppTemplateDefinition> = {
  account_created: { key: 'account_created', category: 'transactional', templateName: 'gavel_account_created', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  auction_starts_24h: { key: 'auction_starts_24h', category: 'transactional', templateName: 'gavel_auction_starts_24h', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  auction_starts_1h: { key: 'auction_starts_1h', category: 'transactional', templateName: 'gavel_auction_starts_1h', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  auction_starts_10m: { key: 'auction_starts_10m', category: 'transactional', templateName: 'gavel_auction_starts_10m', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  auction_live: { key: 'auction_live', category: 'transactional', templateName: 'gavel_auction_live', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  outbid: { key: 'outbid', category: 'transactional', templateName: 'gavel_outbid', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  highest_bidder: { key: 'highest_bidder', category: 'transactional', templateName: 'gavel_highest_bidder', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  seller_new_bid: { key: 'seller_new_bid', category: 'transactional', templateName: 'gavel_seller_new_bid', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  auction_ending_5m: { key: 'auction_ending_5m', category: 'transactional', templateName: 'gavel_auction_ending_5m', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  auction_ending_1m: { key: 'auction_ending_1m', category: 'transactional', templateName: 'gavel_auction_ending_1m', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  auction_won: { key: 'auction_won', category: 'transactional', templateName: 'gavel_auction_won', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  auction_lost: { key: 'auction_lost', category: 'transactional', templateName: 'gavel_auction_lost', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  seller_item_sold: { key: 'seller_item_sold', category: 'transactional', templateName: 'gavel_seller_item_sold', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  reserve_not_met: { key: 'reserve_not_met', category: 'transactional', templateName: 'gavel_reserve_not_met', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  payment_link: { key: 'payment_link', category: 'transactional', templateName: 'gavel_payment_link', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  payment_reminder_30m: { key: 'payment_reminder_30m', category: 'transactional', templateName: 'gavel_payment_reminder_30m', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  payment_final_reminder: { key: 'payment_final_reminder', category: 'transactional', templateName: 'gavel_payment_final_reminder', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  payment_received: { key: 'payment_received', category: 'transactional', templateName: 'gavel_payment_received', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  seller_funds_pending: { key: 'seller_funds_pending', category: 'transactional', templateName: 'gavel_seller_funds_pending', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  seller_ship_item: { key: 'seller_ship_item', category: 'transactional', templateName: 'gavel_seller_ship_item', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  buyer_item_shipped: { key: 'buyer_item_shipped', category: 'transactional', templateName: 'gavel_buyer_item_shipped', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  buyer_item_delivered: { key: 'buyer_item_delivered', category: 'transactional', templateName: 'gavel_buyer_item_delivered', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  buy_now_order_confirmation: { key: 'buy_now_order_confirmation', category: 'transactional', templateName: 'gavel_buy_now_order_confirmation', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  seller_application_received: { key: 'seller_application_received', category: 'transactional', templateName: 'gavel_seller_application_received', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  seller_application_approved: { key: 'seller_application_approved', category: 'transactional', templateName: 'gavel_seller_application_approved', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  seller_application_rejected: { key: 'seller_application_rejected', category: 'transactional', templateName: 'gavel_seller_application_rejected', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  suspicious_login: { key: 'suspicious_login', category: 'security', templateName: 'gavel_suspicious_login', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  failed_logins: { key: 'failed_logins', category: 'security', templateName: 'gavel_failed_logins', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  password_changed: { key: 'password_changed', category: 'security', templateName: 'gavel_password_changed', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  watchlist_new_bid: { key: 'watchlist_new_bid', category: 'transactional', templateName: 'gavel_watchlist_new_bid', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  watchlist_starts_1h: { key: 'watchlist_starts_1h', category: 'transactional', templateName: 'gavel_watchlist_starts_1h', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  watchlist_ends_10m: { key: 'watchlist_ends_10m', category: 'transactional', templateName: 'gavel_watchlist_ends_10m', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  tokens_purchased: { key: 'tokens_purchased', category: 'transactional', templateName: 'gavel_tokens_purchased', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
  low_token_balance: { key: 'low_token_balance', category: 'transactional', templateName: 'gavel_low_token_balance', languageCode: DEFAULT_LANGUAGE_CODE, requiresTemplate: true },
}
