import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Returns the current session's Bearer token, or undefined if not signed in. */
export async function getAuthToken(): Promise<string | undefined> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}
