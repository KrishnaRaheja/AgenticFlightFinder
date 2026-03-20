import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, CheckCircle } from 'lucide-react'

type Status = 'loading' | 'ready' | 'invalid'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl shadow-black/60 px-6 py-8">
        {children}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Only mark ready when Supabase fires PASSWORD_RECOVERY — this means the
    // URL contained a valid recovery token. A pre-existing login session is
    // intentionally ignored so that manually visiting this URL does nothing.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready')
    })

    // If no PASSWORD_RECOVERY event fires within 1.5 s, the URL had no valid
    // recovery token (manual visit, expired link, etc.).
    setTimeout(() => setStatus(s => s === 'loading' ? 'invalid' : s), 1500)

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSubmitting(true); setError(null)
    try {
      await updatePassword(password)
      setDone(true)
      // Full reload so AuthProvider re-reads the new session from Supabase
      setTimeout(() => { window.location.href = '/' }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return (
    <Card>
      <div className="flex items-center justify-center gap-2 py-4">
        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Verifying reset link…</span>
      </div>
    </Card>
  )

  if (status === 'invalid') return (
    <Card>
      <div className="text-center space-y-3 py-4">
        <p className="text-foreground font-medium">Link expired or invalid</p>
        <p className="text-sm text-muted-foreground">This reset link has already been used or has expired.</p>
        <a href="/" className="text-sm text-accent hover:text-accent/80 underline underline-offset-2 transition-colors">
          Back to home
        </a>
      </div>
    </Card>
  )

  if (done) return (
    <Card>
      <div className="text-center space-y-3 py-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <CheckCircle className="h-5 w-5 text-accent" />
        </div>
        <p className="text-foreground font-medium">Password updated</p>
        <p className="text-sm text-muted-foreground">You're being signed in…</p>
      </div>
    </Card>
  )

  return (
    <Card>
      <div className="space-y-4">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-foreground mb-0.5">Set a new password</h3>
          <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> New password
            </Label>
            <Input
              type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required
              className="bg-elevated border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Confirm password
            </Label>
            <Input
              type="password" placeholder="••••••••" value={confirm}
              onChange={e => setConfirm(e.target.value)} required
              className="bg-elevated border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Update password
          </Button>
        </form>
      </div>
    </Card>
  )
}
