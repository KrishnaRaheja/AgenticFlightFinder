import { API_URL } from '@/config'
import { getAuthToken } from '@/lib/supabase'

/**
 * Fetch wrapper that automatically attaches the current user's Bearer token
 * and sets Content-Type: application/json for non-GET requests.
 *
 * Usage:
 *   const res = await apiFetch('/api/preferences/')
 *   const res = await apiFetch('/api/preferences/', { method: 'POST', body: JSON.stringify(payload) })
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken()
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}
