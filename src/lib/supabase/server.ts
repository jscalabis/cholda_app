import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side client using the service role key — bypasses RLS for trusted
// server components. Never expose this key to the browser.
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
