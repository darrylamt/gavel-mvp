import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Private auction access codes live in `auction_access_codes`, not on
 * `auctions`: the auctions table is publicly readable, so a code stored there
 * was readable by anyone with the anon key. The new table has RLS with no
 * policies, so every function here needs a service-role client.
 */

export async function getAccessCode(
  service: SupabaseClient,
  auctionId: string
): Promise<string | null> {
  const { data, error } = await service
    .from('auction_access_codes')
    .select('access_code')
    .eq('auction_id', auctionId)
    .maybeSingle()
  if (error) throw new Error(`Failed to read access code: ${error.message}`)
  return (data?.access_code as string | undefined) ?? null
}

/** All codes for the given private auctions, keyed by auction id. */
export async function getAccessCodes(
  service: SupabaseClient,
  auctionIds: string[]
): Promise<Map<string, string>> {
  const codes = new Map<string, string>()
  if (auctionIds.length === 0) return codes
  const { data, error } = await service
    .from('auction_access_codes')
    .select('auction_id, access_code')
    .in('auction_id', auctionIds)
  if (error) throw new Error(`Failed to read access codes: ${error.message}`)
  for (const row of data ?? []) codes.set(row.auction_id as string, row.access_code as string)
  return codes
}

/** Sets the code, or removes it when `code` is null/blank. */
export async function setAccessCode(
  service: SupabaseClient,
  auctionId: string,
  code: string | null
): Promise<void> {
  const trimmed = typeof code === 'string' ? code.trim() : ''
  if (!trimmed) {
    const { error } = await service.from('auction_access_codes').delete().eq('auction_id', auctionId)
    if (error) throw new Error(`Failed to clear access code: ${error.message}`)
    return
  }
  const { error } = await service
    .from('auction_access_codes')
    .upsert(
      { auction_id: auctionId, access_code: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'auction_id' }
    )
  if (error) throw new Error(`Failed to save access code: ${error.message}`)
}
