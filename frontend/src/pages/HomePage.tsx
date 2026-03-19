import { useState, useEffect, useCallback, useRef } from 'react'
import { Globe } from '@/components/Globe'
import { Navbar } from '@/components/Navbar'
import { PreferenceWizard } from '@/components/PreferenceWizard'
import { PreferenceCard } from '@/components/PreferenceCard'
import { AuthModal } from '@/components/AuthModal'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useLoadingText } from '@/hooks/useLoadingText'
import { apiFetch } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { Preference, Alert } from '@/types'
import {
  Plus, PlaneTakeoff, Bell, Info, ArrowLeftRight,
  ChevronRight, Loader2, X, Clock, TriangleAlert
} from 'lucide-react'

// ── Panel content type ─────────────────────────────────────────────────────────
// The left panel is a stable region that renders different content based on
// what the user interacts with in the sidebar.

type PanelContent =
  | { type: 'alert'; data: Alert }
  | { type: 'preference'; data: Preference }

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, loading } = useAuth()
  const loadingText = useLoadingText()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const [preferences, setPreferences] = useState<Preference[]>([])
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelContent, setPanelContent] = useState<PanelContent | null>(null)

  // panelVisible keeps the panel in the DOM during its exit animation.
  // panelClosing drives the fadeOut keyframe before unmount.
  const [panelVisible, setPanelVisible] = useState(true)
  const [panelClosing, setPanelClosing] = useState(false)

  useEffect(() => {
    if (sidebarOpen) {
      setPanelClosing(false)
      setPanelVisible(true)
    } else {
      setPanelClosing(true)
      const t = setTimeout(() => { setPanelVisible(false); setPanelClosing(false) }, 280)
      return () => clearTimeout(t)
    }
  }, [sidebarOpen])

  // contentClosing drives the exit animation on the active panel card before
  // it unmounts — used for close and cross-fade when switching between items.
  const [contentClosing, setContentClosing] = useState(false)

  const closeContent = () => {
    setContentClosing(true)
    setTimeout(() => { setPanelContent(null); setContentClosing(false) }, 200)
  }

  const showContent = (next: PanelContent) => {
    if (panelContent === null) {
      setPanelContent(next)
    } else {
      setContentClosing(true)
      setTimeout(() => { setPanelContent(next); setContentClosing(false) }, 180)
    }
  }

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

  const handleAlertSelect = (a: Alert) => {
    if (panelContent?.type === 'alert' && panelContent.data.id === a.id) {
      closeContent()
    } else {
      showContent({ type: 'alert', data: a })
    }
  }

  const handleInfoOpen = (p: Preference) => {
    if (panelContent?.type === 'preference' && panelContent.data.id === p.id) {
      closeContent()
    } else {
      showContent({ type: 'preference', data: p })
    }
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setPanelContent(null)
    setContentClosing(false)
  }

  const activePrefs = preferences.filter(p => p.is_active)
  const pausedPrefs = preferences.filter(p => !p.is_active)
  const activeCount = activePrefs.length
  const selectedAlertId = panelContent?.type === 'alert' ? panelContent.data.id : null

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">{loadingText}</span>
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
              Track a flight
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

          {/* Spam notice — bottom-left */}
          <div
            className="absolute bottom-4 left-4 z-20"
            style={{ animation: 'fadeUp 350ms 150ms ease both' }}
          >
            <SpamNotice />
          </div>

          {/* Watchlist sidebar — slides in from right */}
          <div className={cn(
            'absolute top-14 right-0 bottom-0 z-20 w-96 flex flex-col',
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
                  onClick={closeSidebar}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <h2 className="text-sm font-semibold text-foreground">Watchlist</h2>
              </div>
              <Button
                size="sm"
                onClick={() => setWizardOpen(true)}
                className="h-7 px-2.5 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs cursor-pointer gap-1 transition-all duration-150"
              >
                <Plus className="h-3 w-3" />
                New Tracker
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {prefsLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {loadingText}
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
                      <p className="text-xs text-muted-foreground text-center py-6">No active trackers.</p>
                    ) : activePrefs.map((p, i) => (
                      <div key={p.id} style={{ animation: `fadeUp 250ms ${i * 40}ms ease both` }}>
                        <PreferenceCard
                          preference={p}
                          onStatusChange={handleStatusChange}
                          onAlertSelect={handleAlertSelect}
                          onInfoOpen={handleInfoOpen}
                          selectedAlertId={selectedAlertId}
                          defaultExpanded={i === 0}
                        />
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="paused" className="mt-0 space-y-2">
                    {pausedPrefs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No paused trackers.</p>
                    ) : pausedPrefs.map((p, i) => (
                      <div key={p.id} style={{ animation: `fadeUp 250ms ${i * 40}ms ease both` }}>
                        <PreferenceCard
                          preference={p}
                          onStatusChange={handleStatusChange}
                          onAlertSelect={handleAlertSelect}
                          onInfoOpen={handleInfoOpen}
                          selectedAlertId={selectedAlertId}
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

          {/* ── Detail panel — stable left region ──────────────────────────────
              Always visible when sidebar is open. Idle state shows tracker
              stats; swaps to content when the user selects a deal or taps ⓘ. */}
          {panelVisible && (
            <div
              className="absolute top-14 left-0 bottom-0 right-96 z-20 p-4 flex items-stretch justify-center pointer-events-none"
              style={{ animation: panelClosing ? 'fadeOut 280ms ease both' : 'fadeIn 300ms ease both' }}
            >
              {panelContent === null && (
                <IdlePanel
                  preferences={preferences}
                  prefsLoading={prefsLoading}
                />
              )}
              {panelContent?.type === 'alert' && (
                <AlertPanel
                  alert={panelContent.data}
                  onClose={closeContent}
                  closing={contentClosing}
                />
              )}
              {panelContent?.type === 'preference' && (
                <PreferenceDetailPanel
                  preference={panelContent.data}
                  onClose={closeContent}
                  closing={contentClosing}
                />
              )}
            </div>
          )}

        </>
      )}

      {/* ── Wizard overlay ── */}
      <PreferenceWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={fetchPreferences} />

      {/* ── Auth modal ── */}
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  )
}

// ── Alert panel ────────────────────────────────────────────────────────────────
// Fills the full panel area — email needs the space.

function AlertPanel({ alert, onClose, closing }: { alert: Alert; onClose: () => void; closing: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-auto w-full flex flex-col bg-surface/90 backdrop-blur-md',
        'border border-border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden',
      )}
      style={{ animation: closing ? 'fadeOut 180ms ease both' : 'fadeUp 250ms ease both' }}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-warning/10 border border-warning/20 shrink-0">
            <Bell className="h-3.5 w-3.5 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug truncate">{alert.email_subject}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(alert.sent_at)}
              {alert.reference_price && (
                <span className="text-success font-mono ml-2">${Math.round(alert.reference_price)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="text-xs text-muted-foreground/50">Email Preview</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white overflow-hidden">
        <iframe
          srcDoc={alert.email_body_html}
          title="Alert email"
          className="w-full h-full"
          style={{ border: 'none', display: 'block' }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}

// ── Preference detail panel ────────────────────────────────────────────────────
// Renders as a centered card — preference details don't need the full width.

function PreferenceDetailPanel({ preference, onClose, closing }: { preference: Preference; onClose: () => void; closing: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-auto self-center w-full max-w-sm flex flex-col',
        'bg-surface/90 backdrop-blur-md border border-border',
        'rounded-2xl shadow-2xl shadow-black/60 overflow-hidden',
      )}
      style={{ animation: closing ? 'fadeOut 180ms ease both' : 'fadeUp 250ms ease both' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Info className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {preference.origin} → {preference.destination}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{preference.departure_period}</p>
            {preference.return_period && (
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5">
                <ArrowLeftRight className="h-3 w-3" /> {preference.return_period}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <span className="text-xs text-muted-foreground/50">Tracker details</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-3 overflow-y-auto">
        {preference.budget && (
          <DetailRow label="Budget" value={`$${preference.budget}`} />
        )}
        <DetailRow label="Cabin" value={preference.cabin_class} />
        <DetailRow label="Stops" value={formatStops(preference.max_stops)} />
        <DetailRow label="Date flexibility" value={preference.date_flexibility} />
        <DetailRow label="Priority" value={preference.priority} />
        <DetailRow label="Alert frequency" value={preference.alert_frequency} />
        {preference.nearby_airports && (
          <DetailRow label="Nearby airports" value="Included" />
        )}
        {preference.additional_context && (
          <div className="pt-1">
            <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider mb-2">
              Context for Claude
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed bg-elevated/60 rounded-lg px-3 py-2.5 border border-border/60">
              {preference.additional_context}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Spam notice ───────────────────────────────────────────────────────────────

function SpamNotice() {
  return (
    <div className="flex items-center gap-2 bg-surface/70 backdrop-blur-sm border border-amber-500/30 rounded-lg px-3 py-2 transition-all duration-300">
      <TriangleAlert className="h-3 w-3 text-amber-400 shrink-0" />
      <span className="text-xs text-muted-foreground">
        Missing tracking emails? Check your <span className="text-amber-400">junk/spam</span> folder.
      </span>
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
        {activeCount > 0 ? `${activeCount} tracker${activeCount !== 1 ? 's' : ''} active` : 'No active trackers'}
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
      <p className="text-sm text-foreground font-medium mb-1">No trackers yet</p>
      <p className="text-xs text-muted-foreground mb-4">
        Set up your first tracker and Claude will do the rest.
      </p>
      <Button
        size="sm"
        onClick={onNew}
        className="bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground cursor-pointer transition-all duration-150"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />Add tracker
      </Button>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatStops(max_stops: number): string {
  if (max_stops === 0) return 'Non-stop only'
  if (max_stops === 1) return 'Up to 1 stop'
  if (max_stops === 2) return 'Up to 2 stops'
  return 'Any'
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground/60 shrink-0">{label}</span>
      <span className="text-xs text-foreground text-right">{value}</span>
    </div>
  )
}

// ── Idle panel ────────────────────────────────────────────────────────────────
// Shown in the left region when no alert or tracker detail is selected.

function getNextRunIn(): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const ptHour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const ptMinute = parseInt(parts.find(p => p.type === 'minute')!.value)
  const minutesUntil5am = (5 * 60 - (ptHour * 60 + ptMinute) + 1440) % 1440 || 1440
  const h = Math.floor(minutesUntil5am / 60)
  const m = minutesUntil5am % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function daysUntil(dateStr: string): number | null {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDaysUntil(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 0) return `${Math.abs(days)}d ago`
  return `in ${days} days`
}

function IdlePanel({
  preferences, prefsLoading,
}: {
  preferences: Preference[]
  prefsLoading: boolean
}) {
  const nextRun = getNextRunIn()
  const loadingText = useLoadingText()

  // Find the active tracker with the nearest upcoming departure date.
  // Gracefully skips entries whose date strings can't be parsed (older format).
  const nearest = preferences
    .filter(p => p.is_active)
    .map(p => ({ p, days: daysUntil(p.departure_period) }))
    .filter(({ days }) => days !== null)
    .sort((a, b) => a.days! - b.days!)[0] ?? null

  return (
    <div
      className="self-center pointer-events-none"
      style={{ animation: 'fadeUp 300ms 150ms ease both' }}
    >
      <div className="bg-surface/60 backdrop-blur-md border border-border/50 rounded-2xl px-7 py-5 flex flex-col gap-4 min-w-[260px]">

        {/* Soonest departure */}
        {prefsLoading ? (
          <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {loadingText}
          </div>
        ) : nearest ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              Soonest departure
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg text-foreground tracking-widest">
                {nearest.p.origin}
              </span>
              <PlaneTakeoff className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <span className="font-mono font-bold text-lg text-foreground tracking-widest">
                {nearest.p.destination}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{nearest.p.departure_period}</span>
              <span className="text-xs font-medium text-accent">
                {formatDaysUntil(nearest.days!)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/50 py-1">
            No upcoming departures found.
          </p>
        )}

        <div className="h-px bg-border/40" />

        {/* Next run */}
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <span className="text-xs text-muted-foreground">
            Next check in{' '}
            <span className="text-foreground font-medium">{nextRun}</span>
          </span>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground/35 leading-relaxed">
          Trackers are updated at 5 am Pacific Time.
        </p>

      </div>
    </div>
  )
}
