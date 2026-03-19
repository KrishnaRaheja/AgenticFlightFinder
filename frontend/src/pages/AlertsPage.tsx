import { useState, useEffect, useCallback } from 'react'
import { Navbar } from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/config'
import { cn } from '@/lib/utils'
import {
  Bell, ChevronDown, Loader2, PlaneTakeoff, PlaneLanding,
  CircleDot, AlertCircle, Inbox
} from 'lucide-react'

interface Alert {
  id: string
  email_subject: string
  email_body_html: string
  sent_at: string
  reasoning: string
  reference_price: number | null
  alert_type: string
}

interface PreferenceWithAlerts {
  id: string
  origin: string
  destination: string
  departure_period: string
  is_active: boolean
  alerts: Alert[]
  alertsLoading: boolean
  expanded: boolean
}

export default function AlertsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<PreferenceWithAlerts[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  const fetchPreferences = useCallback(async () => {
    if (!user) return
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await fetch(`${API_URL}/api/preferences/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const prefs = await res.json()
      setRows(prefs.map((p: PreferenceWithAlerts) => ({
        ...p,
        alerts: [],
        alertsLoading: false,
        expanded: false,
      })))
    }
    setPageLoading(false)
  }, [user])

  useEffect(() => { fetchPreferences() }, [fetchPreferences])

  const toggleRow = async (id: string) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return

    // If already expanded, just collapse
    if (row.expanded) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, expanded: false } : r))
      return
    }

    // Fetch alerts if not loaded yet
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, expanded: true, alertsLoading: true } : r))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API_URL}/api/preferences/${id}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const alerts: Alert[] = res.ok ? await res.json() : []
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, alerts, alertsLoading: false } : r))
    } catch {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, alertsLoading: false } : r))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-20 pb-16">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-surface border border-border">
            <Bell className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Deals</h1>
            <p className="text-sm text-muted-foreground">
              Claude-generated deal alerts across all your trackers
            </p>
          </div>
        </div>

        {pageLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium">No trackers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a tracker from the home page to start receiving deals.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <PreferenceAlertRow
                key={row.id}
                row={row}
                onToggle={() => toggleRow(row.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Per-preference collapsible row ────────────────────────────────────────────

function PreferenceAlertRow({
  row,
  onToggle,
}: {
  row: PreferenceWithAlerts
  onToggle: () => void
}) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-elevated/40 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-mono font-bold text-sm text-foreground">{row.origin}</span>
          <div className="flex items-center gap-1 text-muted-foreground/60">
            <PlaneTakeoff className="h-3 w-3" />
            <div className="w-5 h-px bg-border" />
            <PlaneLanding className="h-3 w-3" />
          </div>
          <span className="font-mono font-bold text-sm text-foreground">{row.destination}</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block ml-1">
            {row.departure_period}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {row.is_active && (
            <div className="flex items-center gap-1 text-xs text-success">
              <CircleDot className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Active</span>
            </div>
          )}
          {row.expanded && !row.alertsLoading && (
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              {row.alerts.length} alert{row.alerts.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            row.expanded && 'rotate-180',
          )} />
        </div>
      </button>

      {/* Alert list */}
      {row.expanded && (
        <div className="border-t border-border/60">
          {row.alertsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            </div>
          ) : row.alerts.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No deals found yet for this route.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Claude checks daily at 5 AM PT.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {row.alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  expanded={expandedAlert === alert.id}
                  onToggle={() =>
                    setExpandedAlert(expandedAlert === alert.id ? null : alert.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Individual alert row ──────────────────────────────────────────────────────

function AlertRow({
  alert,
  expanded,
  onToggle,
}: {
  alert: Alert
  expanded: boolean
  onToggle: () => void
}) {
  const sentDate = new Date(alert.sent_at)
  const formattedDate = sentDate.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const formattedTime = sentDate.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    timeZone: 'America/Los_Angeles',
  })

  return (
    <div className="px-4 py-3">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 text-left cursor-pointer"
      >
        <div className="mt-0.5 p-1 rounded bg-warning/10 border border-warning/20 shrink-0">
          <Bell className="h-3 w-3 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{alert.email_subject}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{formattedDate} · {formattedTime}</span>
            {alert.reference_price && (
              <Badge variant="outline" className="text-xs border-success/30 text-success bg-success/5 px-1.5 py-0">
                ${Math.round(alert.reference_price)}
              </Badge>
            )}
          </div>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground mt-0.5 shrink-0 transition-transform duration-200',
          expanded && 'rotate-180',
        )} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Claude reasoning */}
          <div className="p-3 rounded-lg bg-elevated/60 border border-border/60">
            <p className="text-xs text-accent font-medium mb-1 flex items-center gap-1">
              <span className="opacity-70">✦</span> Claude's reasoning
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{alert.reasoning}</p>
          </div>

          {/* Email preview */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 bg-elevated border-b border-border flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
              </div>
              <span className="text-xs text-muted-foreground/60 ml-1">Email preview</span>
            </div>
            <div className="bg-white max-h-80 overflow-y-auto">
              <iframe
                srcDoc={alert.email_body_html}
                title="Alert email preview"
                className="w-full min-h-[200px]"
                style={{ height: '320px', border: 'none' }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
