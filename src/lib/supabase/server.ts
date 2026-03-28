import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side client using the service role key — bypasses RLS for trusted
// server components. Never expose this key to the browser.
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your environment (e.g. Vercel dashboard).'
    )
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey)
}
