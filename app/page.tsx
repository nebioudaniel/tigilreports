'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Upload, ArrowRight, Play, CheckCircle2, Clock, User, BarChart3, Users, Zap, FileText, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('code')) {
      window.location.href = '/auth/callback' + window.location.search
      return
    }
    setTimeout(() => setMounted(true), 0)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl">
        <div className="flex items-center justify-between px-5 h-12 rounded-full border border-border bg-background/90 backdrop-blur-md shadow-sm">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-base font-bold text-foreground">Tigil</span>
            <span className="text-xs text-muted-foreground font-normal">Reports</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">Products</Link>
            <Link href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">Pricing</Link>
            <Link href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">Docs</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="xs" className="rounded-full text-xs px-3">Log in</Button>
            </Link>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {mounted && theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-40 pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.14_0_0/0.04),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.9_0_0/0.08),transparent)]" />

        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-foreground/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-foreground/5 to-transparent blur-3xl" />

        <div className="relative text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Business reports that
            <span className="block">
              write themselves
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Input your data, AI generates a professional report in seconds. Built for Ethiopian businesses.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" className="rounded-full text-sm px-8 h-11 shadow-lg shadow-black/15 hover:shadow-black/25 transition-shadow">
                Start for free <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button variant="outline" size="lg" className="rounded-full text-sm px-8 h-11">
                Watch demo
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Free forever &bull; No credit card required &bull; Powered by AI
          </p>
        </div>

        {/* Video player */}
        <div className="relative w-full max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden bg-muted aspect-video shadow-2xl shadow-black/10 ring-1 ring-black/5">
            <video
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              controls
              playsInline
              preload="auto"
            >
              <source src="/demo.mov" type="video/quicktime" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section id="features" className="border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Card 1 — Calendar / Tasks */}
            <div className="p-10 md:p-12 flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Smart. Simple. Brilliant.</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
                AI-powered report generation that turns your raw data into polished, professional documents in seconds.
              </p>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full max-w-xs">
                  <div className="absolute -top-3 -right-3 w-full rounded-xl border border-border bg-background p-4 shadow-sm rotate-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center">
                        <FileText size={12} className="text-foreground/60" />
                      </div>
                      <span className="text-xs font-medium">Q4 Report</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">Due Dec 15</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={12} className="text-foreground/40" />
                      <span className="text-[11px] text-muted-foreground">Revenue analysis</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={12} className="text-foreground/40" />
                      <span className="text-[11px] text-muted-foreground">Market trends</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-foreground/40" />
                      <span className="text-[11px] text-muted-foreground">Pending: Executive summary</span>
                    </div>
                  </div>
                  <div className="relative w-full rounded-xl border border-border bg-background p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center">
                        <FileText size={12} className="text-foreground/60" />
                      </div>
                      <span className="text-xs font-medium">Monthly Report</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">Nov 30</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={12} className="text-foreground/40" />
                      <span className="text-[11px] text-muted-foreground">Sales data</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={12} className="text-foreground/40" />
                      <span className="text-[11px] text-muted-foreground">Expense breakdown</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-foreground/40" />
                      <span className="text-[11px] text-muted-foreground">Growth metrics</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 — Chat / Messaging */}
            <div className="p-10 md:p-12 flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Collaborate in real-time</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
                Share reports with your team, leave comments, and get feedback — all in one place.
              </p>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-xs space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={12} className="text-foreground/60" />
                    </div>
                    <div className="flex-1">
                      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                        <p className="text-[11px] text-foreground/80 leading-relaxed">
                          The Q3 report looks great! Can we add the revenue breakdown?
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block">Abebe  ·  2h ago</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="w-7 h-7 rounded-full bg-foreground/15 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={12} className="text-foreground/60" />
                    </div>
                    <div className="flex-1">
                      <div className="rounded-2xl rounded-tr-sm bg-foreground/10 px-4 py-2.5">
                        <p className="text-[11px] text-foreground/80 leading-relaxed">
                          Sure, I&apos;ll update it with the latest numbers. Give me 10 mins.
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block text-right">You  ·  1h ago</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={12} className="text-foreground/60" />
                    </div>
                    <div className="flex-1">
                      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                        <p className="text-[11px] text-foreground/80 leading-relaxed">
                          Perfect, thanks! Let&apos;s present this on Monday.
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block">Abebe  ·  30m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border">
            {/* Card 3 — Integration Hub */}
            <div className="p-10 md:p-12 flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Connect your tools</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
                Seamlessly integrate with the platforms you already use. Import data, sync reports, and automate workflows.
              </p>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full max-w-xs flex items-center justify-center py-8">
                  {/* Orbital rings */}
                  <div className="absolute w-40 h-40 rounded-full border border-foreground/10" />
                  <div className="absolute w-28 h-28 rounded-full border border-foreground/10" />
                  <div className="absolute w-16 h-16 rounded-full border border-foreground/20 flex items-center justify-center bg-background z-10">
                    <Zap size={16} className="text-foreground/70" />
                  </div>
                  {/* Orbital icons */}
                  <div className="absolute w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center" style={{ transform: 'translate(60px, -50px)' }}>
                    <Upload size={14} className="text-foreground/60" />
                  </div>
                  <div className="absolute w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center" style={{ transform: 'translate(-60px, 50px)' }}>
                    <BarChart3 size={14} className="text-foreground/60" />
                  </div>
                  <div className="absolute w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center" style={{ transform: 'translate(-40px, -60px)' }}>
                    <FileText size={14} className="text-foreground/60" />
                  </div>
                  <div className="absolute w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center" style={{ transform: 'translate(50px, 60px)' }}>
                    <Users size={14} className="text-foreground/60" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 — Analytics / Metrics */}
            <div className="p-10 md:p-12 flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Data-driven insights</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
                Track your reporting performance with clear, actionable metrics at a glance.
              </p>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-xs space-y-3">
                  <div className="rounded-xl border border-border bg-background p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Reports generated</p>
                      <p className="text-2xl font-bold tracking-tight mt-0.5">1,247</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <FileText size={16} className="text-foreground/60" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Active users</p>
                      <p className="text-2xl font-bold tracking-tight mt-0.5">384</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <Users size={16} className="text-foreground/60" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Avg. report time</p>
                      <p className="text-2xl font-bold tracking-tight mt-0.5">2.4 min</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <Clock size={16} className="text-foreground/60" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Starter */}
            <div className="p-10 flex flex-col items-center text-center">
              <h3 className="text-lg font-semibold mb-2">Starter</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
                Perfect for individuals and small teams getting started.
              </p>
              <p className="text-5xl font-bold tracking-tight mb-1">Free</p>
              <p className="text-sm text-muted-foreground mb-8">forever, no credit card</p>
              <Link href="/register" className="w-full mb-8">
                <Button className="w-full rounded-full text-sm">Get started</Button>
              </Link>
              <ul className="w-full space-y-3 text-left">
                {[
                  '3 reports per month',
                  'Basic AI analysis',
                  'Share via link',
                  'CSV & Excel import',
                ].map((f) => (
                  <li key={f} className="text-sm flex items-center gap-3 text-muted-foreground">
                    <Check size={14} className="text-foreground/40 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Professional — inverted */}
            <div className="p-10 flex flex-col items-center text-center bg-foreground text-background">
              <h3 className="text-lg font-semibold mb-2">Professional</h3>
              <p className="text-sm text-background/70 leading-relaxed mb-6 max-w-xs">
                Best for growing teams that need advanced features.
              </p>
              <p className="text-5xl font-bold tracking-tight mb-1">ETB 350</p>
              <p className="text-sm text-background/70 mb-8">per month, per user</p>
              <Link href="/register" className="w-full mb-8">
                <Button className="w-full rounded-full text-sm bg-background text-foreground hover:bg-background/90">
                  Start free trial
                </Button>
              </Link>
              <ul className="w-full space-y-3 text-left">
                {[
                  'Unlimited reports',
                  'Advanced AI analysis',
                  'PDF download',
                  'Up to 10 team members',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="text-sm flex items-center gap-3 text-background/80">
                    <Check size={14} className="text-background/50 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div className="p-10 flex flex-col items-center text-center">
              <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
                For large organizations with custom requirements.
              </p>
              <p className="text-5xl font-bold tracking-tight mb-1">ETB 560</p>
              <p className="text-sm text-muted-foreground mb-8">per month, per user</p>
              <Link href="#" className="w-full mb-8">
                <Button variant="outline" className="w-full rounded-full text-sm">
                  Contact sales
                </Button>
              </Link>
              <ul className="w-full space-y-3 text-left">
                {[
                  'Unlimited reports',
                  'Custom report branding',
                  'Unlimited team members',
                  'Dedicated support',
                  'API access',
                  'SSO & SAML',
                ].map((f) => (
                  <li key={f} className="text-sm flex items-center gap-3 text-muted-foreground">
                    <Check size={14} className="text-foreground/40 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Everything you need to know about Tigil Reports. Can&apos;t find what you&apos;re looking for? Feel free to reach out to our support team.
            </p>
          </div>
          <div className="divide-y divide-border">
            {[
              {
                q: 'How do I get started with Tigil Reports?',
                a: 'Sign up for a free account — no credit card required. Once logged in, you can upload your data and generate your first report in minutes. Our onboarding guide will walk you through everything.',
              },
              {
                q: 'Can I integrate with my existing tools?',
                a: 'Yes. Tigil Reports supports CSV and Excel imports, and we offer API access on our Enterprise plan. We are actively adding more integrations including Google Sheets and popular accounting software.',
              },
              {
                q: 'Can I customize the reports?',
                a: 'Absolutely. You can customize report layouts, add your company branding, choose color schemes, and include or exclude specific sections. Professional and Enterprise plans offer full customization.',
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. We use encryption at rest and in transit, follow industry-standard security practices, and never share your data with third parties. Enterprise plans include SSO/SAML and audit logs.',
              },
              {
                q: 'What kind of support do you offer?',
                a: 'Free and Starter plans include email support. Professional plans get priority support with faster response times. Enterprise customers receive a dedicated support manager and SLA guarantees.',
              },
            ].map((faq, i) => (
              <div key={faq.q} className="py-5">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left gap-4"
                >
                  <span className="text-sm font-medium">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-muted-foreground shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed pr-6">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <span className="font-bold text-primary">Tigil Reports</span>
              <p className="text-sm text-muted-foreground mt-1">Built for Ethiopian businesses</p>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#features" className="hover:text-foreground transition-all duration-200">Features</Link>
              <Link href="#about" className="hover:text-foreground transition-all duration-200">About</Link>
              <Link href="#pricing" className="hover:text-foreground transition-all duration-200">Pricing</Link>
              <Link href="#" className="hover:text-foreground transition-all duration-200">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-all duration-200">Terms</Link>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-sm text-muted-foreground">
            &copy; 2024 Tigil Reports
          </div>
        </div>
      </footer>
    </div>
  )
}
