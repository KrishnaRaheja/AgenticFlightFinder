import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>© 2026 Agentic Flight Finder</span>
        <div className="flex items-center gap-3">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <span className="text-border">·</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span className="text-border">·</span>
          <a
            href="https://github.com/KrishnaRaheja/AgenticFlightFinder"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
