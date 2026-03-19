import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import { AuthModal } from '@/components/AuthModal'
import { Button } from '@/components/ui/button'
import { PlaneTakeoff, Settings, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { user } = useAuth()
  const handleLogout = useLogout()
  const location = useLocation()
  const [authOpen, setAuthOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-3 bg-background/60 backdrop-blur-md border-b border-border/40">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-foreground hover:text-accent transition-colors duration-150"
        >
          <PlaneTakeoff className="h-5 w-5 text-accent" strokeWidth={2} />
          <span className="font-semibold text-sm tracking-tight">
            Agentic Flight Finder
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <a
            href="https://github.com/KrishnaRaheja/AgenticFlightFinder"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-colors duration-150"
            title="View on GitHub"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>

          <Link
            to="/"
            className={cn(
              'px-3 py-1.5 rounded-md text-sm transition-colors duration-150 cursor-pointer',
              isActive('/')
                ? 'text-foreground bg-surface'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface/60',
            )}
          >
            Dashboard
          </Link>

          <Link
            to="/how-it-works"
            className={cn(
              'px-3 py-1.5 rounded-md text-sm transition-colors duration-150 cursor-pointer',
              isActive('/how-it-works')
                ? 'text-foreground bg-surface'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface/60',
            )}
          >
            How it works
          </Link>

          {user ? (
            <>
              <Link
                to="/settings"
                className={cn(
                  'p-1.5 rounded-md text-sm transition-colors duration-150 cursor-pointer',
                  isActive('/settings')
                    ? 'text-foreground bg-surface'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface/60',
                )}
              >
                <Settings className="h-4 w-4" />
              </Link>
              <div className="w-px h-4 bg-border mx-1" />
              <span className="text-xs text-muted-foreground px-1 max-w-[140px] truncate">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-surface/60 transition-colors duration-150 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setAuthOpen(true)}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-colors duration-150 cursor-pointer"
              >
                Sign in
              </button>
              <Button
                size="sm"
                onClick={() => setAuthOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm cursor-pointer"
              >
                Get started
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 pt-14 bg-background/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1 p-4">
            <MobileLink to="/" onClick={() => setMobileOpen(false)}>Dashboard</MobileLink>
            <MobileLink to="/how-it-works" onClick={() => setMobileOpen(false)}>How it works</MobileLink>
            {user ? (
              <>
                <MobileLink to="/settings" onClick={() => setMobileOpen(false)}>Settings</MobileLink>
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false) }}
                  className="w-full text-left px-4 py-3 rounded-lg text-destructive hover:bg-surface transition-colors text-sm cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Button
                onClick={() => { setAuthOpen(true); setMobileOpen(false) }}
                className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  )
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="px-4 py-3 rounded-lg text-foreground hover:bg-surface transition-colors text-sm cursor-pointer"
    >
      {children}
    </Link>
  )
}
