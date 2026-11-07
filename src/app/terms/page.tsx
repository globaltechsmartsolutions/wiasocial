import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata: Metadata = { title: "Terms of Service", description: "Terms and conditions for using WIA Social." };

const sections = [
  ["1. Acceptance", "By accessing or using WIA Social, you agree to these Terms of Service. If you do not agree, you must not use the service."],
  ["2. Service description", "WIA Social provides tools for Instagram content planning, AI-assisted generation, lead management, analytics, and growth strategy. Features may evolve over time."],
  ["3. Accounts", "You must provide accurate information, keep your credentials secure, and be at least 18 years old or have valid parental consent. You are responsible for activity performed through your account."],
  ["4. Plans and billing", "Paid subscriptions renew monthly until cancelled. Prices may change with reasonable prior notice. Except where required by law, partial billing periods are not refundable."],
  ["5. Acceptable use", "You must not use WIA Social for unlawful activity, spam, phishing, deceptive marketing, unauthorized resale, scraping, fake engagement, or automation that violates Meta or Instagram policies."],
  ["6. Content and intellectual property", "You retain ownership of content you submit and are responsible for having the necessary rights to use it. Subject to applicable provider terms, AI-generated output is available for your use, but you must review it before publication."],
  ["7. Third-party services", "The service depends on providers such as Supabase, OpenAI, Stripe, and Meta. Their availability and terms may affect individual features, and WIA Social is not responsible for outages outside its reasonable control."],
  ["8. Disclaimer and liability", "The service is provided on an as-is and as-available basis. To the maximum extent permitted by law, WIA Social is not liable for indirect losses, lost profits, or decisions made solely from AI-generated recommendations."],
  ["9. Suspension and termination", "We may suspend access for serious or repeated violations, security threats, fraud, or non-payment. You may cancel your subscription or stop using the service at any time."],
  ["10. Changes", "We may update these terms as the product and legal requirements evolve. Material changes will be communicated where appropriate. Continued use after the effective date constitutes acceptance."],
  ["11. Governing law", "These terms are governed by applicable Spanish and European Union law. Mandatory consumer protections in your place of residence continue to apply."],
] as const;

export default function TermsPage() {
  return <div className="min-h-screen bg-background text-foreground"><header className="border-b border-border"><div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4"><Link href="/" className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-lime"><Zap className="h-4 w-4 text-black" /></span><span className="font-bold">WIA Social</span></Link><Link href="/login" className="text-sm text-muted hover:text-foreground">Sign in</Link></div></header><main className="mx-auto max-w-4xl px-4 py-16"><h1 className="mb-2 text-4xl font-black">Terms of Service</h1><p className="mb-10 text-sm text-muted">Last updated: July 26, 2026</p><div className="space-y-8 text-sm leading-7 text-muted">{sections.map(([title, body]) => <section key={title}><h2 className="mb-3 text-xl font-bold text-foreground">{title}</h2><p>{body}</p></section>)}<section><h2 className="mb-3 text-xl font-bold text-foreground">12. Contact</h2><p>Questions about these terms can be sent to <a href="mailto:legal@wiasocial.app" className="text-lime hover:underline">legal@wiasocial.app</a>.</p></section></div></main><footer className="border-t border-border"><div className="mx-auto flex max-w-4xl justify-between px-4 py-8 text-xs text-muted"><span>© 2026 WIA Social</span><div className="flex gap-5"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link></div></div></footer></div>;
}
