import { createClient } from '@supabase/supabase-js'

// Read env vars INSIDE the function so they are resolved at request time,
// not at module initialisation (which can happen during the build phase
// before secrets like SUPABASE_SERVICE_ROLE_KEY are injected).
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
