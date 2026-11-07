import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WIA Social collects, uses, and protects your data.",
};

const sections = [
  {
    title: "1. Data controller",
    body: <>WIA Social is responsible for processing your personal data. Contact us at <a className="text-lime hover:underline" href="mailto:privacy@wiasocial.app">privacy@wiasocial.app</a>.</>,
  },
  {
    title: "2. Data we collect",
    body: <ul className="list-disc space-y-2 pl-5"><li>Account data, including your email address and encrypted authentication credentials.</li><li>Brand settings and content you provide to personalize the service.</li><li>Instagram account metrics when you explicitly connect an account.</li><li>Lead and client information you enter into the CRM.</li><li>Usage and technical data needed to operate and secure the platform.</li><li>Billing information processed securely by Stripe. WIA Social does not store card details.</li></ul>,
  },
  {
    title: "3. How we use your data",
    body: <ul className="list-disc space-y-2 pl-5"><li>Provide, maintain, and secure the service.</li><li>Personalize AI-generated content using your brand profile.</li><li>Manage subscriptions, billing, support, and service communications.</li><li>Improve product quality and prevent abuse or fraud.</li></ul>,
  },
  {
    title: "4. Legal basis",
    body: <>We process data to perform our contract with you, based on your consent where required, for legitimate interests such as security and product improvement, and to comply with legal obligations.</>,
  },
  {
    title: "5. Service providers",
    body: <>We use vetted providers such as Supabase for database and authentication infrastructure, OpenAI for AI processing, Stripe for payments, and Meta when you connect Instagram. Each provider processes data under its own terms and applicable data-protection obligations.</>,
  },
  {
    title: "6. Your rights",
    body: <>Subject to applicable law, you may request access, correction, deletion, portability, restriction, or objection to processing. Send requests to <a className="text-lime hover:underline" href="mailto:privacy@wiasocial.app">privacy@wiasocial.app</a>.</>,
  },
  {
    title: "7. Cookies and storage",
    body: <>We use essential browser storage and cookies for authentication, preferences, and security. We do not use third-party advertising cookies.</>,
  },
  {
    title: "8. Retention and security",
    body: <>We retain data while your account is active and only as long as necessary afterwards for legal, security, and operational purposes. We apply access controls, encryption in transit, and database isolation policies to protect customer information.</>,
  },
  {
    title: "9. Policy updates",
    body: <>We may update this policy as the service evolves. Material changes will be communicated through the service or by email where appropriate.</>,
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="Last updated: July 26, 2026" sections={sections} />;
}

function LegalPage({ title, updated, sections: items }: { title: string; updated: string; sections: typeof sections }) {
  return <div className="min-h-screen bg-background text-foreground"><header className="border-b border-border"><div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4"><Link href="/" className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-lime"><Zap className="h-4 w-4 text-black" /></span><span className="font-bold">WIA Social</span></Link><Link href="/login" className="text-sm text-muted hover:text-foreground">Sign in</Link></div></header><main className="mx-auto max-w-4xl px-4 py-16"><h1 className="mb-2 text-4xl font-black">{title}</h1><p className="mb-10 text-sm text-muted">{updated}</p><div className="space-y-8 text-sm leading-7 text-muted">{items.map((section) => <section key={section.title}><h2 className="mb-3 text-xl font-bold text-foreground">{section.title}</h2><div>{section.body}</div></section>)}</div></main><footer className="border-t border-border"><div className="mx-auto flex max-w-4xl justify-between px-4 py-8 text-xs text-muted"><span>© 2026 WIA Social</span><div className="flex gap-5"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link></div></div></footer></div>;
}
