import { useState, useEffect, useCallback, useRef } from 'react'
import { Globe } from '@/components/Globe'
import { Navbar } from '@/components/Navbar'
import { PreferenceWizard } from '@/components/PreferenceWizard'
import { PreferenceCard } from '@/components/PreferenceCard'
import { AuthModal } from '@/components/AuthModal'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { Preference, Alert } from '@/types'
import {
  Plus, PlaneTakeoff, Bell,
  ChevronRight, Loader2, X
} from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const [preferences, setPreferences] = useState<Preference[]>([])
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  // Use a ref to track the previous user so we can detect the sign-in transition
  // without adding stale-closure risk to the effect deps.
  const prevUserRef = useRef(user)
  useEffect(() => {
    const wasLoggedOut = !prevUserRef.current
    prevUserRef.current = user
    if (wasLoggedOut && user && preferences.length === 0) {
      setTimeout(() => setWizardOpen(true), 400)
    }
  }, [user, preferences.length])

  const fetchPreferences = useCallback(async () => {
    if (!user) return
    setPrefsLoading(true)
    try {
      const res = await apiFetch('/api/preferences/')
      if (res.ok) setPreferences(await res.json())
    } finally {
      setPrefsLoading(false)
    }
  }, [user])

  useEffect(() => { fetchPreferences() }, [fetchPreferences])

  const handleStatusChange = (id: string, active: boolean) => {
    setPreferences(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p))
  }

  const activePrefs = preferences.filter(p => p.is_active)
  const pausedPrefs = preferences.filter(p => !p.is_active)
  const activeCount = activePrefs.length

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <Navbar />

      {/* ── Globe ── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_40%,#020617_100%)] pointer-events-none z-10" />
        <Globe
          className={cn(
            'transition-all duration-700 ease-in-out',
            user && sidebarOpen ? '-translate-x-[18%] scale-90' : '',
          )}
        />
      </div>

      {/* ══════════════ LOGGED-OUT STATE ══════════════ */}
      {!user && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
          style={{ animation: 'fadeIn 350ms ease both' }}
        >
          <div className="text-center mb-8 pointer-events-none" style={{ animation: 'fadeUp 0.7s ease-out both' }}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-none">
              Your AI flight scout,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                always watching.
              </span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-sm mx-auto">
              Set your route once. We monitor prices around the clock and alert you about deals.
            </p>
          </div>

          <div className="pointer-events-auto" style={{ animation: 'fadeUp 0.8s 0.08s ease-out both' }}>
            <Button
              onClick={() => setWizardOpen(true)}
              className="rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground shadow-lg shadow-primary/25 gap-2 cursor-pointer transition-all duration-200 hover:shadow-primary/40 hover:-translate-y-0.5 px-6 py-5 text-base"
            >
              <Plus className="h-4 w-4" />
              Monitor a flight
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground/60 pointer-events-auto" style={{ animation: 'fadeUp 0.9s 0.15s ease-out both' }}>
            Already have an account?{' '}
            <button
              onClick={() => setAuthOpen(true)}
              className="text-accent hover:text-accent/80 underline underline-offset-2 cursor-pointer transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      )}

      {/* ══════════════ LOGGED-IN STATE ══════════════ */}
      {user && (
        <>
          {/* Status strip — top-left below navbar */}
          <div
            className="absolute top-16 left-4 z-20 pt-2"
            style={{ animation: 'fadeDown 350ms 100ms ease both' }}
          >
            <StatusStrip activeCount={activeCount} />
          </div>

          {/* "My Flights" sidebar — slides in from right */}
          <div className={cn(
            'absolute top-14 right-0 bottom-0 z-20 w-80 flex flex-col',
            'border-l border-border/40 bg-background/85 backdrop-blur-md',
            'transition-transform duration-300 ease-in-out',
            sidebarOpen ? 'translate-x-0' : 'translate-x-full',
          )}
          style={{ animation: 'slideInFromRight 300ms ease both' }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <h2 className="text-sm font-semibold text-foreground">My Flights</h2>
              </div>
              <Button
                size="sm"
                onClick={() => setWizardOpen(true)}
                className="h-7 px-2.5 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs cursor-pointer gap-1 transition-all duration-150"
              >
                <Plus className="h-3 w-3" />
                New
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {prefsLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : preferences.length === 0 ? (
                <EmptyState onNew={() => setWizardOpen(true)} />
              ) : (
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="w-full bg-elevated mb-3 h-8">
                    <TabsTrigger
                      value="active"
                      className="flex-1 text-xs cursor-pointer data-[state=active]:bg-surface data-[state=active]:text-foreground transition-all duration-150"
                    >
                      Active{activePrefs.length > 0 && <span className="ml-1 text-muted-foreground">({activePrefs.length})</span>}
                    </TabsTrigger>
                    <TabsTrigger
                      value="paused"
                      className="flex-1 text-xs cursor-pointer data-[state=active]:bg-surface data-[state=active]:text-foreground transition-all duration-150"
                    >
                      Paused{pausedPrefs.length > 0 && <span className="ml-1 text-muted-foreground">({pausedPrefs.length})</span>}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="mt-0 space-y-2">
                    {activePrefs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No active monitors.</p>
                    ) : activePrefs.map((p, i) => (
                      <div key={p.id} style={{ animation: `fadeUp 250ms ${i * 40}ms ease both` }}>
                        <PreferenceCard
                          preference={p}
                          onStatusChange={handleStatusChange}
                          onAlertSelect={a => setSelectedAlert(prev => prev?.id === a.id ? null : a)}
                          selectedAlertId={selectedAlert?.id}
                          defaultExpanded={i === 0}
                        />
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="paused" className="mt-0 space-y-2">
                    {pausedPrefs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No paused monitors.</p>
                    ) : pausedPrefs.map((p, i) => (
                      <div key={p.id} style={{ animation: `fadeUp 250ms ${i * 40}ms ease both` }}>
                        <PreferenceCard
                          preference={p}
                          onStatusChange={handleStatusChange}
                          onAlertSelect={a => setSelectedAlert(prev => prev?.id === a.id ? null : a)}
                          selectedAlertId={selectedAlert?.id}
                          defaultExpanded={i === 0}
                        />
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>

          {/* Sidebar peek tab — only when closed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-1/2 -translate-y-1/2 right-0 z-20 bg-surface border border-border rounded-l-lg px-1.5 py-4 text-muted-foreground hover:text-foreground hover:bg-elevated transition-all duration-200 cursor-pointer"
              style={{ animation: 'fadeIn 200ms ease both' }}
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          )}

          {/* Email panel — renders in globe area when an alert is selected */}
          <div className={cn(
            'absolute top-14 left-0 bottom-0 right-80 z-30 p-4',
            'flex items-stretch justify-center',
            'transition-opacity duration-200 ease-in-out pointer-events-none',
            selectedAlert && sidebarOpen ? 'opacity-100' : 'opacity-0',
          )}>
            {selectedAlert && (
              <div className={cn(
                'pointer-events-auto w-full flex flex-col bg-surface/90 backdrop-blur-md',
                'border border-border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden',
              )}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-warning/10 border border-warning/20 shrink-0">
                      <Bell className="h-3.5 w-3.5 text-warning" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug truncate">{selectedAlert.email_subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(selectedAlert.sent_at)}
                        {selectedAlert.reference_price && (
                          <span className="text-success font-mono ml-2">${Math.round(selectedAlert.reference_price)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-xs text-muted-foreground/50">Email Preview</span>
                    <button
                      onClick={() => setSelectedAlert(null)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Email iframe — fills remaining height */}
                <div className="flex-1 bg-white overflow-hidden">
                  <iframe
                    srcDoc={selectedAlert.email_body_html}
                    title="Alert email"
                    className="w-full h-full"
                    style={{ border: 'none', display: 'block' }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FAB — always visible for logged-in users.
              Anchored bottom-left so it never overlaps the sidebar. */}
          <div
            className="absolute bottom-6 left-6 z-20"
            style={{ animation: 'fadeUp 400ms 200ms ease both' }}
          >
            <Button
              onClick={() => setWizardOpen(true)}
              className="rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground shadow-lg shadow-primary/25 gap-2 cursor-pointer transition-all duration-200 hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              <span>New monitor</span>
            </Button>
          </div>
        </>
      )}

      {/* ── Wizard overlay ── */}
      <PreferenceWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={fetchPreferences} />

      {/* ── Auth modal (sign-in link on homepage / navbar) ── */}
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  )
}

// ── Status strip ──────────────────────────────────────────────────────────────

function StatusStrip({ activeCount }: { activeCount: number }) {
  return (
    <div className="flex items-center gap-2 bg-surface/70 backdrop-blur-sm border border-border/60 rounded-lg px-3 py-2 transition-all duration-300">
      <span className="relative flex h-2 w-2">
        {activeCount > 0 && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', activeCount > 0 ? 'bg-success' : 'bg-muted-foreground/40')} />
      </span>
      <span className="text-xs text-muted-foreground">
        {activeCount > 0 ? `${activeCount} monitor${activeCount !== 1 ? 's' : ''} active` : 'No active monitors'}
      </span>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-10 px-4" style={{ animation: 'fadeUp 300ms ease both' }}>
      <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center mx-auto mb-3">
        <PlaneTakeoff className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-foreground font-medium mb-1">No monitors yet</p>
      <p className="text-xs text-muted-foreground mb-4">
        Set up your first flight monitor and Claude will do the rest.
      </p>
      <Button
        size="sm"
        onClick={onNew}
        className="bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground cursor-pointer transition-all duration-150"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />Create monitor
      </Button>
    </div>
  )
}
