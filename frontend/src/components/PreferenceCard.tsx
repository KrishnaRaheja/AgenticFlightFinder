import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn, formatDate, formatShortDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import {
  PlaneTakeoff, PlaneLanding, ChevronDown,
  Loader2, Bell, BellOff, Clock
} from 'lucide-react'
import type { Preference, Alert } from '@/types'

// Re-export so existing imports from PreferenceCard still work during transition.
export type { Preference, Alert }

interface PreferenceCardProps {
  preference: Preference
  onStatusChange: (id: string, active: boolean) => void
  onAlertSelect: (alert: Alert) => void
  selectedAlertId?: string | null
  defaultExpanded?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PreferenceCard({ preference, onStatusChange, onAlertSelect, selectedAlertId, defaultExpanded = false }: PreferenceCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsLoaded, setAlertsLoaded] = useState(false)
  const [toggling, setToggling] = useState(false)

  // If this card starts expanded, load alerts immediately on mount
  const loadAlerts = async () => {
    if (alertsLoaded) return
    setAlertsLoading(true)
    try {
      const res = await apiFetch(`/api/preferences/${preference.id}/alerts`)
      if (res.ok) setAlerts(await res.json())
      setAlertsLoaded(true)
    } finally {
      setAlertsLoading(false)
    }
  }

  // Load alerts immediately when card starts expanded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (defaultExpanded) loadAlerts() }, [])

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    if (next) loadAlerts()
  }

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setToggling(true)
    try {
      const res = await apiFetch(`/api/preferences/${preference.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !preference.is_active }),
      })
      if (res.ok) onStatusChange(preference.id, !preference.is_active)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-200',
        preference.is_active
          ? 'border-border bg-surface hover:border-primary/30'
          : 'border-border/40 bg-surface/50',
      )}
    >
      {/* ── Collapsed header ── */}
      <button
        onClick={handleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-elevated/40 active:bg-elevated/60 transition-all duration-150"
      >
        {/* Status dot — no text, card is already segregated by tab */}
        <span className="relative flex h-2 w-2 shrink-0">
          {preference.is_active && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
          )}
          <span className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            preference.is_active ? 'bg-success' : 'bg-muted-foreground/40',
          )} />
        </span>

        {/* Route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-bold text-sm text-foreground tracking-widest">{preference.origin}</span>
            <div className="flex items-center gap-1 text-muted-foreground/50">
              <PlaneTakeoff className="h-3 w-3" />
              <div className="w-5 h-px bg-border" />
              <PlaneLanding className="h-3 w-3" />
            </div>
            <span className="font-mono font-bold text-sm text-foreground tracking-widest">{preference.destination}</span>
          </div>
          {/* Dates on own line — never truncated, always fully visible */}
          <p className="text-xs text-muted-foreground mt-0.5">
            {preference.departure_period}
            {preference.return_period && (
              <span className="text-muted-foreground/60"> · return {preference.return_period}</span>
            )}
            {preference.budget && (
              <span className="text-muted-foreground/60"> · ${preference.budget}</span>
            )}
          </p>
        </div>

        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
          expanded && 'rotate-180',
        )} />
      </button>

      {/* ── Expanded: alerts + controls ── */}
      {expanded && (
        <div
          className="border-t border-border/60"
          style={{ animation: 'expandDown 200ms ease both' }}
        >
          {/* Alert history section */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                Past Alerts
              </p>
              <p className="text-xs text-muted-foreground/40 italic">click to preview email</p>
            </div>

            {alertsLoading ? (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading alerts…
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex items-center gap-2 py-3">
                <div className="p-1.5 rounded-lg bg-elevated border border-border/60">
                  <BellOff className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">No deals found yet.</p>
                  <p className="text-xs text-muted-foreground/50">Claude checks daily at 5 AM PT.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {alerts.map(alert => (
                  <AlertSubCard
                    key={alert.id}
                    alert={alert}
                    selected={selectedAlertId === alert.id}
                    onSelect={() => onAlertSelect(alert)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls row */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-t border-border/40"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <Clock className="h-3 w-3" />
              Created {formatDate(preference.created_at)}
            </div>
            <Button
              size="sm"
              onClick={handleToggleStatus}
              disabled={toggling}
              className={cn(
                'text-xs h-7 px-3 cursor-pointer border font-medium transition-all duration-150 active:scale-95',
                preference.is_active
                  ? 'bg-background border-border/80 text-foreground/70 hover:bg-elevated hover:text-foreground hover:border-border'
                  : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20',
              )}
            >
              {toggling && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              {!toggling && <Bell className="h-3 w-3 mr-1.5" />}
              {preference.is_active ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes expandDown {
          from { opacity: 0; transform: translateY(-4px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}

// ── Alert sub-card ─────────────────────────────────────────────────────────────

function AlertSubCard({
  alert, selected, onSelect,
}: {
  alert: Alert; selected: boolean; onSelect: () => void
}) {
  const dateStr = formatShortDate(alert.sent_at)

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg border overflow-hidden cursor-pointer transition-all duration-150',
        selected
          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/60 bg-elevated/40 hover:border-border hover:bg-elevated/60',
      )}
    >
      <div className="flex items-start gap-2.5 px-3 py-2">
        <div className="mt-0.5 p-1 rounded bg-warning/10 border border-warning/20 shrink-0">
          <Bell className="h-2.5 w-2.5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground leading-snug line-clamp-1">{alert.email_subject}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground/60">{dateStr}</span>
            {alert.reference_price && (
              <span className="text-xs text-success font-mono">${Math.round(alert.reference_price)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
