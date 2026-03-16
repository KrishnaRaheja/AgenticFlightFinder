import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after successful auth so the caller can continue its flow */
  onSuccess?: () => void
  /** Which tab to show first */
  defaultTab?: 'signin' | 'signup'
}

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  defaultTab = 'signin',
}: AuthModalProps) {
  const { login, signup } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        await login(email, password)
        onOpenChange(false)
        onSuccess?.()
      } else {
        await signup(email, password)
        setSignupSuccess(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    setTab(value as 'signin' | 'signup')
    setError(null)
    setSignupSuccess(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface border-border p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === 'signin'
              ? 'Sign in to view your monitors and alerts.'
              : 'Start monitoring flights in under a minute.'}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={handleTabChange} className="px-6 py-5">
          <TabsList className="w-full bg-elevated mb-5">
            <TabsTrigger value="signin" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">
              Sign up
            </TabsTrigger>
          </TabsList>

          {signupSuccess ? (
            <div className="text-center py-6" style={{ animation: 'fadeUp 250ms ease both' }}>
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <p className="text-foreground font-medium">Check your email</p>
              <p className="text-muted-foreground text-sm mt-1">
                We sent a confirmation link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <TabsContent value="signin" className="mt-0 space-y-4">
                <AuthFields
                  email={email}
                  password={password}
                  onEmail={setEmail}
                  onPassword={setPassword}
                />
              </TabsContent>
              <TabsContent value="signup" className="mt-0 space-y-4">
                <AuthFields
                  email={email}
                  password={password}
                  onEmail={setEmail}
                  onPassword={setPassword}
                />
              </TabsContent>

              {error && (
                <p className="text-destructive text-sm px-1">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tab === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function AuthFields({
  email,
  password,
  onEmail,
  onPassword,
}: {
  email: string
  password: string
  onEmail: (v: string) => void
  onPassword: (v: string) => void
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="auth-email" className="text-foreground text-sm">Email</Label>
        <Input
          id="auth-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          required
          className="bg-elevated border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="auth-password" className="text-foreground text-sm">Password</Label>
        <Input
          id="auth-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          required
          className="bg-elevated border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
        />
      </div>
    </>
  )
}
