import { Link } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

// Local typography helpers — see Privacy.tsx, same reasoning.
const H = ({ children }: { children: React.ReactNode }) =>
  <h2 className="text-base font-semibold text-foreground mt-8 mb-2">{children}</h2>
const P = ({ children }: { children: React.ReactNode }) =>
  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>
const B = ({ children }: { children: React.ReactNode }) =>
  <span className="text-foreground font-medium">{children}</span>
const List = ({ children }: { children: React.ReactNode }) =>
  <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-5 mb-3">{children}</ul>

export default function Terms() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-20 flex-1 w-full">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground mt-2 text-base">Last updated: August 25, 2026</p>

        <div className="mt-8">
          <P>
            Please read these terms before using Agentic Flight Finder ("the Service"). By creating
            an account or using the Service, you agree to them. If you do not agree, do not use the Service.
          </P>
          <P>
            Contact:{' '}
            <a href="mailto:agenticflightfinder@gmail.com" className="text-accent hover:text-accent/80">
              agenticflightfinder@gmail.com
            </a>
          </P>

          <H>1. What the Service is — and is not</H>
          <P>
            Agentic Flight Finder is a <B>free, non-commercial personal project</B>. It monitors
            flight routes you configure and emails you when an AI agent judges that a price is worth
            telling you about.
          </P>
          <P>
            <B>The Service does not sell, book, reserve, or arrange travel of any kind.</B> It is not
            a travel agency, not a ticket seller, and not a booking platform. It takes no payment,
            holds no reservations, and has no relationship with any airline. Every actual booking
            happens elsewhere, directly between you and an airline or booking site, under their terms
            and their prices.
          </P>

          <H>2. Eligibility</H>
          <P>You must be at least 13 years old to use the Service. By using it you confirm that you are.</P>

          <H>3. Your account</H>
          <P>
            You are responsible for keeping your password secure and for activity that happens under
            your account. Use a unique password. If you believe your account has been accessed by
            someone else, email the address above.
          </P>
          <P>You agree to provide an email address you actually control, since that is how alerts reach you.</P>

          <H>4. Flight prices are informational only, and may be wrong</H>
          <P>This is the most important section in these terms.</P>
          <P>
            Prices, availability, routes, times, and airline information shown by the Service come
            from third-party sources and are <B>provided for informational purposes only</B>. They
            may be inaccurate, incomplete, delayed, or out of date at the moment you see them.
          </P>
          <P>
            Airfares change constantly. A price shown in an alert may already be unavailable by the
            time you read the email, and frequently will be. <B>Nothing shown by the Service is an
            offer, a quote, a guarantee of availability, or a promise that any fare can actually be
            booked at that price.</B>
          </P>
          <P>
            Always confirm the current price and terms directly with the airline or booking site
            before making any decision or purchase. Do not rely on the Service as your sole source of
            information for a travel or financial decision.
          </P>

          <H>5. The Service is powered by AI, and AI can be wrong</H>
          <P>
            Monitoring decisions are made by an automated AI agent (Claude, by Anthropic). On each
            run, the agent decides on its own whether to search, how to interpret the results against
            price history, and whether to send you an alert.
          </P>
          <P>This means:</P>
          <List>
            <li>The agent may <B>skip a run</B>, or decide not to alert you about a fare you would have wanted.</li>
            <li>The agent's assessment of whether a price is "good," "typical," or "high" is a <B>generated opinion based on limited historical data</B> — not an expert valuation, and not a prediction of future prices.</li>
            <li>The agent's written analysis and recommendations may contain <B>errors, wrong reasoning, or confidently stated inaccuracies</B>.</li>
          </List>
          <P>
            <B>None of the Service's output is financial, travel, or professional advice.</B> It is a
            convenience tool. Any decision you make based on it is your own.
          </P>

          <H>6. No guarantee of alerts, delivery, or availability</H>
          <P>
            The Service is provided on a best-effort basis by one person, for free. There is no
            service level of any kind. Specifically, and without limitation:
          </P>
          <List>
            <li>Alerts may be <B>delayed, duplicated, or never sent at all</B>.</li>
            <li>Emails may be <B>blocked, filtered as spam, or lost</B> before reaching you.</li>
            <li>Monitors may <B>stop working</B> without warning if an upstream data source changes or breaks.</li>
            <li>The Service may be <B>unavailable, interrupted, degraded, or discontinued entirely at any time, without notice</B>.</li>
          </List>
          <P>You should not build travel plans around the assumption that an alert will arrive.</P>

          <H>7. Acceptable use</H>
          <P>You agree not to:</P>
          <List>
            <li>Access the Service by automated means — scripts, scrapers, bots, or crawlers — or attempt to bypass its rate limits;</li>
            <li>Attempt to access another user's account or data, or otherwise probe, overload, disrupt, or attack the Service.</li>
          </List>
          <P>Accounts that violate these rules may be suspended or deleted without notice.</P>

          <H>8. Third-party services and no affiliation</H>
          <P>
            The Service depends on third-party providers, including Supabase, Anthropic, an email
            delivery provider, Railway, and a third-party flight data source. The Service does not
            control these providers and is not responsible for their availability, accuracy, or acts.
          </P>
          <P>
            <B>Agentic Flight Finder is not affiliated with, endorsed by, sponsored by, or in any way
            connected to any airline, Google, or any flight booking service.</B> Airline names and
            marks belong to their respective owners and are used only to identify flights.
          </P>

          <H>9. Intellectual property</H>
          <P>
            The application's source code is released under the MIT License and is available in its
            public repository. The name "Agentic Flight Finder," the site's design, text, and
            branding remain the property of the operator. Flight data and airline marks belong to
            their respective owners.
          </P>

          <H>10. Privacy</H>
          <P>
            Your use of the Service is also governed by the{' '}
            <Link to="/privacy" className="text-accent hover:text-accent/80">Privacy Policy</Link>,
            which explains what data is collected and who it is shared with.
          </P>

          <H>11. Termination</H>
          <P>
            You may stop using the Service at any time, and may request account deletion as described
            in the Privacy Policy.
          </P>
          <P>
            The operator may suspend or terminate your access, or discontinue the Service in whole or
            in part, at any time and for any reason, including because the project is no longer being
            maintained.
          </P>

          <H>12. Disclaimer of warranties</H>
          <P>
            <B>The Service is provided "as is" and "as available," without warranty of any kind,
            express or implied.</B> To the fullest extent permitted by law, the operator disclaims all
            warranties, including any implied warranties of merchantability, fitness for a particular
            purpose, non-infringement, accuracy, and uninterrupted or error-free operation.
          </P>
          <P>
            No advice or information obtained from the Service creates any warranty not expressly
            stated in these terms.
          </P>

          <H>13. Limitation of liability</H>
          <P>
            <B>To the fullest extent permitted by law, the operator shall not be liable for any
            indirect, incidental, special, consequential, exemplary, or punitive damages</B>, or for
            any loss of profits, savings, data, goodwill, or opportunity, arising out of or relating
            to your use of or inability to use the Service — including, without limitation:
          </P>
          <List>
            <li>A fare you did not receive an alert about;</li>
            <li>A fare that had changed or become unavailable by the time you acted on it;</li>
            <li>An inaccurate price, schedule, or airline detail;</li>
            <li>An alert that was delayed, never delivered, or filtered as spam;</li>
            <li>A travel or purchasing decision made in reliance on the Service or its AI-generated analysis.</li>
          </List>
          <P>
            This applies regardless of the legal theory, and even if the operator has been advised of
            the possibility of such damages.
          </P>
          <P>
            Because the Service is provided free of charge, <B>the operator's total aggregate
            liability arising out of or relating to the Service shall not exceed one hundred U.S.
            dollars (US $100.00).</B>
          </P>
          <P>
            Some jurisdictions do not allow the exclusion of certain warranties or the limitation of
            certain damages, so some of the above may not apply to you. In that case, liability is
            limited to the greatest extent permitted by law.
          </P>

          <H>14. Governing law</H>
          <P>
            These terms are governed by the laws of the State of Washington, United States, without
            regard to its conflict-of-law rules. Any dispute shall be brought exclusively in the state
            or federal courts located in Washington, and you consent to that jurisdiction.
          </P>

          <H>15. Changes to these terms</H>
          <P>
            These terms may be updated from time to time. When they change, the date at the top of
            this page is updated. Continued use after a change means you accept the updated terms,
            so please check back occasionally.
          </P>

          <H>16. Contact</H>
          <P>
            <a href="mailto:agenticflightfinder@gmail.com" className="text-accent hover:text-accent/80">
              agenticflightfinder@gmail.com
            </a>
          </P>
        </div>
      </main>

      <Footer />
    </div>
  )
}
