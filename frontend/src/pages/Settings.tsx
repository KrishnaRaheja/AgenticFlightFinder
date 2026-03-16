import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import { Settings as SettingsIcon, Mail, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Settings() {
  const { user } = useAuth()
  const handleLogout = useLogout()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-surface border border-border">
            <SettingsIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Account and notification preferences</p>
          </div>
        </div>

        {/* Account section */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-border/60">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</h2>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Account email</p>
            </div>
          </div>
        </div>

        {/* Coming soon placeholder */}
        <div className="rounded-xl border border-border/40 bg-surface/50 px-4 py-6 text-center mb-8">
          <p className="text-sm text-muted-foreground">
            More settings coming soon.
          </p>
        </div>

        {/* Sign out */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </main>
    </div>
  )
}
