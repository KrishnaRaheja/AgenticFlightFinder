import { useState } from 'react'
import { useAuth, DuplicateEmailError } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Lock, ArrowRight, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthFormProps {
  onSuccess: () => void
  defaultTab?: 'signin' | 'signup'
}

export function AuthForm({ onSuccess, defaultTab = 'signup' }: AuthFormProps) {
  const { login, signup, requestPasswordReset } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupDone, setSignupDone] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      if (forgotMode) {
        await requestPasswordReset(email)
        setResetSent(true)
      } else if (tab === 'signin') {
        await login(email, password)
        onSuccess()
      } else {
        await signup(email, password)
        setSignupDone(true)
      }
    } catch (err: unknown) {
      if (err instanceof DuplicateEmailError) {
        setError('An account with this email already exists. Sign in instead.')
        setTab('signin')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  // Shared "check your email" confirmation screen
  if (signupDone || resetSent) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Mail className="h-5 w-5 text-accent" />
        </div>
        <p className="text-foreground font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          {signupDone
            ? <>We sent a confirmation link to <span className="text-foreground">{email}</span>.<br />Check your inbox or junk folder to authenticate yourself.</>
            : <>We sent a password reset link to <span className="text-foreground">{email}</span>.<br />Check your inbox or junk folder.</>
          }
        </p>
        <button
          onClick={() => { setSignupDone(false); setResetSent(false); setForgotMode(false); setTab('signin') }}
          className="text-sm text-accent hover:text-accent/80 underline underline-offset-2 cursor-pointer transition-colors"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab toggle — hidden in forgot mode */}
      {!forgotMode && (
        <div className="flex gap-1 p-1 bg-elevated rounded-lg w-fit">
          {(['signup', 'signin'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null) }}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer',
                tab === t
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'signup' ? 'Sign up' : 'Sign in'}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3 w-3" /> Email
          </Label>
          <Input
            type="email" placeholder="you@example.com" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="bg-elevated border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring"
          />
        </div>
        {!forgotMode && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Password
            </Label>
            <Input
              type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required
              className="bg-elevated border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring"
            />
            {tab === 'signin' && (
              <button
                type="button"
                onClick={() => { setForgotMode(true); setError(null) }}
                className="text-xs text-muted-foreground hover:text-accent transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            )}
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
          {forgotMode ? 'Send reset link' : tab === 'signin' ? 'Sign in' : 'Create account'}
          {!loading && <ArrowRight className="h-3.5 w-3.5 ml-2" />}
        </Button>
        {forgotMode && (
          <button
            type="button"
            onClick={() => { setForgotMode(false); setError(null) }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Back to sign in
          </button>
        )}
      </form>
      <div className="flex items-center gap-2 bg-surface/70 backdrop-blur-sm border border-amber-500/30 rounded-lg px-3 py-2 mt-4">
        <TriangleAlert className="h-3 w-3 text-amber-400 shrink-0" />
        <span className="text-xs text-muted-foreground">Your data is only used to search for flights and send you alerts, and is never sold. We cannot see your password.</span>
      </div>
    </div>
  )
}
