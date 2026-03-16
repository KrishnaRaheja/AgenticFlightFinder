import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Thrown by signup() when the email address is already registered. */
export class DuplicateEmailError extends Error {
  constructor() {
    super('User already registered')
    this.name = 'DuplicateEmailError'
  }
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser(data.user)
  }

  const signup = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // Supabase returns a fake success with empty identities when the email is already registered
    if (data.user?.identities?.length === 0) {
      throw new DuplicateEmailError()
    }
    setUser(data.user)
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (err) {
        console.error('Error fetching session:', err)
      } finally {
        setLoading(false)
      }
    }
    getSession()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
