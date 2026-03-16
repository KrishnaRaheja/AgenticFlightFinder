import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/** Signs the user out and redirects to /. Use instead of calling logout() directly. */
export function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return async () => {
    try {
      await logout()
    } finally {
      navigate('/')
    }
  }
}
