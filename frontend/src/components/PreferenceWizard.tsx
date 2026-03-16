import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AirportSearch from '@/components/AirportSearch'
import { AuthForm } from '@/components/AuthForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/config'
import { cn } from '@/lib/utils'
import {
  ArrowRight, ArrowLeft, Loader2, Sparkles,
  PlaneTakeoff, PlaneLanding, Calendar, X
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WizardData {
  origin: string; destination: string
  departure_period: string; return_period: string
  budget: string; max_stops: string; cabin_class: string
  date_flexibility: string; nearby_airports: boolean
  priority: string; alert_frequency: string
  additional_context: string
}

const DEFAULT_DATA: WizardData = {
  origin: '', destination: '', departure_period: '', return_period: '',
  budget: '', max_stops: '2', cabin_class: 'economy', date_flexibility: 'exact',
  nearby_airports: false, priority: 'balanced', alert_frequency: 'daily',
  additional_context: '',
}

// view drives what content is shown
// 'auth' is an inline auth form between route and preferences
type WizardView = 'route' | 'auth' | 'preferences' | 'context'

const MAIN_STEPS = ['Route', 'Preferences', 'Tell Claude']

// Map view → which step index to highlight in the progress bar
const VIEW_TO_STEP_INDEX: Record<WizardView, number> = {
  route: 0, auth: 0, preferences: 1, context: 2,
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PreferenceWizardProps {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export function PreferenceWizard({ open, onClose, onCreated }: PreferenceWizardProps) {
  const { user } = useAuth()
  const [view, setView] = useState<WizardView>('route')
  const [data, setData] = useState<WizardData>(DEFAULT_DATA)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // slide animation
  const [slideAnim, setSlideAnim] = useState<string>('')

  useEffect(() => {
    if (!open) {
      setTimeout(() => { setView('route'); setData(DEFAULT_DATA); setError(null) }, 300)
    }
  }, [open])

  const update = (patch: Partial<WizardData>) => setData(d => ({ ...d, ...patch }))

  // Animate between views. dir='forward' slides left-out/right-in, dir='backward' the reverse.
  const goTo = (nextView: WizardView, dir: 'forward' | 'backward') => {
    const exitClass = dir === 'forward' ? 'wizard-exit-left' : 'wizard-exit-right'
    const enterClass = dir === 'forward' ? 'wizard-enter-right' : 'wizard-enter-left'
    setSlideAnim(exitClass)
    setTimeout(() => {
      setView(nextView)
      setError(null)
      setSlideAnim(enterClass)
      setTimeout(() => setSlideAnim(''), 220)
    }, 170)
  }

  const handleNext = () => {
    if (view === 'route') {
      if (!user) { goTo('auth', 'forward'); return }
      goTo('preferences', 'forward')
    } else if (view === 'preferences') {
      goTo('context', 'forward')
    }
  }

  const handleBack = () => {
    if (view === 'preferences') goTo(user ? 'route' : 'auth', 'backward')
    else if (view === 'context') goTo('preferences', 'backward')
    else if (view === 'auth') goTo('route', 'backward')
  }

  const handleAuthSuccess = () => {
    goTo('preferences', 'forward')
  }

  const handleSubmit = async () => {
    if (!user) { goTo('auth', 'forward'); return }
    setSubmitting(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const body = {
        origin: data.origin, destination: data.destination,
        departure_period: data.departure_period,
        return_period: data.return_period || undefined,
        budget: data.budget ? parseInt(data.budget) : undefined,
        max_stops: parseInt(data.max_stops), cabin_class: data.cabin_class,
        date_flexibility: data.date_flexibility, nearby_airports: data.nearby_airports,
        priority: data.priority, alert_frequency: data.alert_frequency,
        additional_context: data.additional_context || undefined,
      }
      const res = await fetch(`${API_URL}/api/preferences/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ detail: 'Request failed' }))
        throw new Error(msg.detail ?? 'Request failed')
      }
      onClose()
      onCreated?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const step1Valid = data.origin.length === 3 && data.destination.length === 3 && data.departure_period.trim().length > 0
  const stepIndex = VIEW_TO_STEP_INDEX[view]
  const showBackBtn = view !== 'route'
  const showNextBtn = view === 'route' || view === 'preferences'
  const showSubmitBtn = view === 'context'
  const isAuthView = view === 'auth'

  if (!open) return null

  return (
    <>
      {/* Backdrop — dims globe gently but doesn't obscure wizard */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
        style={{ animation: 'fadeIn 200ms ease both' }}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl shadow-black/60"
          onClick={e => e.stopPropagation()}
          style={{ animation: 'scaleIn 220ms ease both' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              {MAIN_STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={cn(
                    'flex items-center gap-1.5 text-xs font-medium transition-all duration-300',
                    i === stepIndex ? 'text-foreground' : i < stepIndex ? 'text-success' : 'text-muted-foreground',
                  )}>
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300',
                      i === stepIndex
                        ? 'bg-primary border-primary text-primary-foreground'
                        : i < stepIndex
                          ? 'bg-success border-success text-white'
                          : 'border-border text-muted-foreground',
                    )}>
                      {i < stepIndex ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < MAIN_STEPS.length - 1 && (
                    <div className={cn('w-8 h-px transition-colors duration-500', i < stepIndex ? 'bg-success' : 'bg-border')} />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step content with slide animation */}
          <div className={slideAnim} style={{ minHeight: '280px' }}>
            {view === 'route'       && <StepRoute      data={data} update={update} />}
            {view === 'auth'        && <StepAuth        onSuccess={handleAuthSuccess} />}
            {view === 'preferences' && <StepPreferences data={data} update={update} />}
            {view === 'context'     && <StepContext     data={data} update={update} error={error} />}
          </div>

          {/* Footer */}
          {!isAuthView && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
              <div>
                {showBackBtn && (
                  <Button variant="ghost" size="sm" onClick={handleBack}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showNextBtn && (
                  <Button
                    onClick={handleNext}
                    disabled={view === 'route' && !step1Valid}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                  >
                    {view === 'route' && !user ? 'Continue' : 'Next'}
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                )}
                {showSubmitBtn && (
                  <Button onClick={handleSubmit} disabled={submitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                               : <Sparkles className="h-3.5 w-3.5 mr-2" />}
                    Start monitoring
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyframes for wizard slide animations */}
      <style>{`
        .wizard-exit-left    { animation: wizExitLeft  200ms cubic-bezier(0.4,0,1,1) forwards }
        .wizard-exit-right   { animation: wizExitRight 200ms cubic-bezier(0.4,0,1,1) forwards }
        .wizard-enter-right  { animation: wizEnterRight 280ms cubic-bezier(0,0,0.2,1) both }
        .wizard-enter-left   { animation: wizEnterLeft  280ms cubic-bezier(0,0,0.2,1) both }
        @keyframes wizExitLeft   { to   { opacity: 0; transform: translateX(-36px) } }
        @keyframes wizExitRight  { to   { opacity: 0; transform: translateX(36px)  } }
        @keyframes wizEnterRight { from { opacity: 0; transform: translateX(36px)  } }
        @keyframes wizEnterLeft  { from { opacity: 0; transform: translateX(-36px) } }
      `}</style>
    </>
  )
}

// ── Step: Route ────────────────────────────────────────────────────────────────

function StepRoute({ data, update }: { data: WizardData; update: (p: Partial<WizardData>) => void }) {
  return (
    <div className="px-6 py-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Where are you flying?</h3>
        <p className="text-sm text-muted-foreground">Enter your route and travel window.</p>
      </div>

      {/* Google Flights–style segmented search bar */}
      <div className="border border-border rounded-xl">
        {/* Row 1: From | To */}
        <div className="grid grid-cols-2">
          <div className="flex flex-col px-5 py-4 border-r border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <PlaneTakeoff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From</span>
            </div>
            <AirportSearch
              value={data.origin}
              onChange={v => update({ origin: v })}
              placeholder="Airport"
              className="border-0 bg-transparent px-0 py-0.5 text-sm font-medium rounded-none focus:ring-0 shadow-none"
            />
          </div>
          <div className="flex flex-col px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <PlaneLanding className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To</span>
            </div>
            <AirportSearch
              value={data.destination}
              onChange={v => update({ destination: v })}
              placeholder="Airport"
              className="border-0 bg-transparent px-0 py-0.5 text-sm font-medium rounded-none focus:ring-0 shadow-none"
            />
          </div>
        </div>

        {/* Row 2: Departure | Return */}
        <div className="grid grid-cols-2 border-t border-border">
          <div className="flex flex-col px-5 py-4 border-r border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Departure</span>
            </div>
            <input
              placeholder="e.g. June 2026 or 2026-06-15"
              value={data.departure_period}
              onChange={e => update({ departure_period: e.target.value })}
              className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
              required
            />
          </div>
          <div className="flex flex-col px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Return{' '}
                <span className="normal-case font-normal text-muted-foreground/50">(optional)</span>
              </span>
            </div>
            <input
              placeholder="e.g. July 2026 or one-way"
              value={data.return_period}
              onChange={e => update({ return_period: e.target.value })}
              className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step: Inline Auth ──────────────────────────────────────────────────────────

function StepAuth({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="px-6 py-5">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-foreground mb-0.5">Create an account</h3>
        <p className="text-sm text-muted-foreground">Your route is saved — sign in to complete setup.</p>
      </div>
      <AuthForm onSuccess={onSuccess} defaultTab="signup" />
    </div>
  )
}

// ── Step: Preferences ──────────────────────────────────────────────────────────

function StepPreferences({ data, update }: { data: WizardData; update: (p: Partial<WizardData>) => void }) {
  return (
    <div className="px-6 py-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-0.5">Your preferences</h3>
        <p className="text-sm text-muted-foreground">All optional — sensible defaults are pre-set.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Budget (USD)</Label>
          <Input type="number" placeholder="e.g. 800" value={data.budget}
            onChange={e => update({ budget: e.target.value })} min={0}
            className="bg-elevated border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus-visible:ring-ring" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Max stops</Label>
          <Select value={data.max_stops} onValueChange={v => update({ max_stops: v })}>
            <SelectTrigger className="bg-elevated border-border text-foreground text-sm focus:ring-ring cursor-pointer"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-elevated border-border">
              {[['0','Non-stop only'],['1','Up to 1 stop'],['2','Up to 2 stops'],['3','Any']].map(([v,l]) => (
                <SelectItem key={v} value={v} className="text-foreground cursor-pointer">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cabin class</Label>
          <Select value={data.cabin_class} onValueChange={v => update({ cabin_class: v })}>
            <SelectTrigger className="bg-elevated border-border text-foreground text-sm focus:ring-ring cursor-pointer"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-elevated border-border">
              {[['economy','Economy'],['premium_economy','Premium Economy'],['business','Business'],['first','First']].map(([v,l]) => (
                <SelectItem key={v} value={v} className="text-foreground cursor-pointer">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Date flexibility</Label>
          <Select value={data.date_flexibility} onValueChange={v => update({ date_flexibility: v })}>
            <SelectTrigger className="bg-elevated border-border text-foreground text-sm focus:ring-ring cursor-pointer"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-elevated border-border">
              {[['exact','Exact dates'],['plus_minus_2','±2 days'],['plus_minus_5','±5 days'],['flexible','Flexible']].map(([v,l]) => (
                <SelectItem key={v} value={v} className="text-foreground cursor-pointer">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <Select value={data.priority} onValueChange={v => update({ priority: v })}>
            <SelectTrigger className="bg-elevated border-border text-foreground text-sm focus:ring-ring cursor-pointer"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-elevated border-border">
              {[['price','Cheapest price'],['balanced','Balanced'],['convenience','Most convenient']].map(([v,l]) => (
                <SelectItem key={v} value={v} className="text-foreground cursor-pointer">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Alert frequency</Label>
          <Select value={data.alert_frequency} onValueChange={v => update({ alert_frequency: v })}>
            <SelectTrigger className="bg-elevated border-border text-foreground text-sm focus:ring-ring cursor-pointer"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-elevated border-border">
              <SelectItem value="daily" className="text-foreground cursor-pointer">Daily</SelectItem>
              <SelectItem value="weekly" className="text-foreground cursor-pointer">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="nearby" checked={data.nearby_airports}
          onChange={e => update({ nearby_airports: e.target.checked })}
          className="w-4 h-4 rounded border-border bg-elevated accent-primary cursor-pointer" />
        <Label htmlFor="nearby" className="text-sm text-muted-foreground cursor-pointer">Include nearby airports</Label>
      </div>
    </div>
  )
}

// ── Step: Tell Claude (context) ────────────────────────────────────────────────

function StepContext({
  data, update, error
}: {
  data: WizardData; update: (p: Partial<WizardData>) => void; error: string | null
}) {
  const remaining = 500 - data.additional_context.length
  return (
    <div className="px-6 py-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Tell Claude what matters <span className="font-normal text-muted-foreground text-sm">(Optional)</span></h3>
        </div>
      </div>
      <div className="relative">
        <Textarea
          placeholder="e.g. I prefer morning departures and want to avoid Spirit Airlines. Layovers under 2 hours only. Happy to fly out of Newark instead of JFK if it saves money."
          value={data.additional_context}
          onChange={e => update({ additional_context: e.target.value })}
          maxLength={500} rows={5}
          className="bg-elevated border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus-visible:ring-ring resize-none"
        />
        <span className={cn(
          'absolute bottom-2 right-3 text-xs tabular-nums',
          remaining < 50 ? 'text-warning' : 'text-muted-foreground/50',
        )}>{remaining}</span>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
