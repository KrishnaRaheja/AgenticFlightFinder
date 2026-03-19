import { Navbar } from '@/components/Navbar'
import { PlaneTakeoff, Bot, Mail, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    icon: PlaneTakeoff,
    title: 'Tell it where you want to go',
    description:
      'Set your origin, destination, and travel window as specific or flexible as you like. Add a budget, preferred cabin, max stops, or just describe what you want in plain English.',
    detail: 'You can say things like "No red-eyes, prefer Star Alliance airlines, and I\'m flexible on dates by a week." Claude understands context, not just checkboxes.',
  },
  {
    icon: Bot,
    title: 'We monitor prices every day',
    description:
      'A Claude agent runs daily at 5 AM PT, searching flights for each of your active monitors. It analyzes results against your preferences, taking into account price trends, schedule, and your specific context.',
    detail: 'Claude doesn\'t just check if a price is below your budget, it reasons about whether a deal is genuinely good given current market rates, your flexibility, and your stated priorities.',
  },
  {
    icon: Mail,
    title: 'You get alerted when a deal appears',
    description:
      'When Claude finds something worth flagging, it composes a clear, human-readable email explaining exactly why it thinks this is a good deal and what you should know before booking.',
    detail: 'Alerts include the reasoning, a reference price (so you can see what "normal" looks like), and the key flight details. No noise. Only alerts when something genuinely stands out. Check your spam or junk folder if you\'re not seeing them.',
  },
]

export default function HowItWorks() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        {/* Header */}
        <div className="mb-14">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">How it works</h1>
          <p className="text-muted-foreground mt-2 text-base">
            Agentic Flight Finder is a set-it-and-forget-it system. You define what you're looking
            for once, and an AI agent handles the rest.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative flex gap-5">
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 z-10">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-border/60 mt-2 mb-2 min-h-[2rem]" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-10 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground/60">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {step.description}
                  </p>
                  <div className="p-3 rounded-lg bg-surface border border-border/60">
                    <p className="text-xs text-muted-foreground/80 leading-relaxed italic">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="mt-8 pt-8 border-t border-border space-y-6">
          <h2 className="text-base font-semibold text-foreground">Common questions</h2>

          {[
            {
              q: 'How often does it check?',
              a: 'Once per day by default, at 5 AM PT. You can set individual monitors to weekly if you prefer less frequency.',
            },
            {
              q: 'Do I get alerted every day?',
              a: 'Depends on your preference, you can choose how often you want to receive alerts (daily, weekly, good deals only).',
            },
            {
              q: 'Do we actually book flights?',
              a: 'Not yet - that functionality is coming soon. For now, we alert you about deals, but you book through your preferred site or agent.',
            },
            {
              q: 'What if my preference is invalid, e.g. innapropriate context?',
              a: 'Your preference will be ignored.',
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <h3 className="text-sm font-medium text-foreground mb-1">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex items-center gap-3">
          <Button
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          >
            {user ? 'Go to dashboard' : 'Get started'}
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          {!user && (
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Already have an account? Sign in
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
