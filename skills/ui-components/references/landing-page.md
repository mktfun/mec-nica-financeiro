# SaaS Landing Page Blocks Reference

High-conversion, modern SaaS landing page blocks composed with Next.js App Router, Tailwind CSS, Radix UI primitives, and `lucide-react`.

---

## 1. Features & Capabilities

- **Sticky Glass Navbar**: Responsive top navigation with blurred backdrop (`backdrop-blur-md`), brand mark, mobile sheet menu, and authentication CTAs.
- **High-Impact Hero**: Announcement badge pill, animated gradient headline, dual CTAs, and a perspective 3D mockup frame with subtle border glow.
- **Bento Grid Layout**: Asymmetric feature cards showcasing analytics metrics, real-time sync, automated workflows, and enterprise security.
- **Interactive Pricing Tiers**: Monthly/Annual billing toggle (with "Save 20%" badge), 3 tier cards with feature checklists and highlighted "Most Popular" Pro tier.
- **FAQ Accordion**: Smoothly expanding accordion powered by `@radix-ui/react-accordion`.
- **Comprehensive Footer**: 4-column link directory, newsletter subscription input, and social icons.

---

## 2. Complete Production Implementation

Save the following component as `@/components/landing/landing-page.tsx`:

```tsx
'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  Shield,
  BarChart3,
  Layers,
  Globe,
  HelpCircle,
  Send,
  Github,
  Twitter,
  Menu,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// ==========================================
// 1. Sticky Navigation Bar
// ==========================================

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Architecture', href: '#bento' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black shadow-lg shadow-indigo-500/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <span className="font-bold text-base text-zinc-100 tracking-tight">
            Apex<span className="text-indigo-400">SaaS</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-zinc-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            asChild
            className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-900"
          >
            <Link href="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20"
          >
            <Link href="/signup">
              Get Started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile Hamburger Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="outline"
              size="icon"
              className="border-zinc-800 bg-zinc-900 text-zinc-300"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 border-l border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
            <SheetHeader className="text-left mb-6">
              <SheetTitle className="text-base font-bold text-zinc-100">Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-zinc-400 hover:text-zinc-100 py-1"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-zinc-800 bg-zinc-900 text-xs"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full bg-indigo-600 text-xs text-white">
                  <Link href="/signup">Get Started Free</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

// ==========================================
// 2. Hero Section
// ==========================================

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-zinc-950 text-zinc-100">
      {/* Background Radial Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-indigo-600/15 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 backdrop-blur-md mb-6">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Announcing Apex 2.0 Engine</span>
          <ChevronRight className="h-3.5 w-3.5 text-indigo-400/80" />
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-100 leading-[1.15]">
          Build Full-Stack SaaS Apps{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-white bg-clip-text text-transparent">
            10x Faster
          </span>{' '}
          with Confidence
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed">
          Production Next.js App Router templates, multi-tenant Supabase database schemas,
          granular Row-Level Security, and accessible shadcn/ui component blocks.
        </p>

        {/* CTA Button Group */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            asChild
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 px-8"
          >
            <Link href="/signup">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full sm:w-auto border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white px-8"
          >
            <Link href="#features">Explore Architecture</Link>
          </Button>
        </div>

        {/* Glowing Perspective Mockup Frame */}
        <div className="relative mt-14 sm:mt-20 mx-auto max-w-5xl">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 shadow-2xl backdrop-blur-sm sm:p-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-inner">
              {/* Mockup Topbar */}
              <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  https://app.apexsaas.dev/dashboard
                </div>
                <div className="w-12" />
              </div>

              {/* Mockup Internal UI Preview */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <span className="text-xs text-zinc-400">Monthly Recurring Revenue</span>
                  <p className="mt-1 text-2xl font-bold text-zinc-100">$48,250</p>
                  <span className="text-[11px] text-emerald-400 font-medium">↑ +18.4% this month</span>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <span className="text-xs text-zinc-400">Active Workspaces</span>
                  <p className="mt-1 text-2xl font-bold text-zinc-100">1,420</p>
                  <span className="text-[11px] text-emerald-400 font-medium">↑ 99.98% uptime</span>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <span className="text-xs text-zinc-400">Server Action P95</span>
                  <p className="mt-1 text-2xl font-bold text-zinc-100">42ms</p>
                  <span className="text-[11px] text-indigo-400 font-medium">Edge Optimized</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ==========================================
// 3. Bento Feature Grid Section
// ==========================================

export function BentoGridSection() {
  return (
    <section id="bento" className="py-20 bg-zinc-950 text-zinc-100 border-t border-zinc-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs">
            Architecture
          </Badge>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-zinc-100">
            Engineered for High-Scale SaaS
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Every layer of the stack is hardened for developer velocity, security, and peak performance.
          </p>
        </div>

        {/* Bento Asymmetric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Large Span (2 Cols) */}
          <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 relative overflow-hidden group hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 text-indigo-400 mb-4">
              <BarChart3 className="h-6 w-6" />
              <span className="font-semibold text-sm">Real-time Analytics Engine</span>
            </div>
            <h3 className="text-xl font-bold text-zinc-100">
              Aggregated Metrics & Event Streaming
            </h3>
            <p className="mt-2 text-xs text-zinc-400 max-w-md">
              Instant materialized views and Postgres RPC triggers calculate workspace telemetry with sub-millisecond latencies.
            </p>
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
              <div className="text-emerald-400 font-semibold">$ SELECT calculate_mrr(org_id) FROM subscriptions;</div>
              <div className="text-zinc-500 mt-1">&gt; Returned 14 rows in 1.2ms [RPC EXPLAIN ANALYZE]</div>
            </div>
          </div>

          {/* Card 2: 1 Col */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 group hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 text-emerald-400 mb-4">
              <Shield className="h-6 w-6" />
              <span className="font-semibold text-sm">Multi-Tenant Isolation</span>
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Row-Level Security</h3>
            <p className="mt-2 text-xs text-zinc-400">
              Cryptographically verified tenant boundaries at the database engine level. Zero cross-tenant leakage.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>100% Policy Coverage</span>
            </div>
          </div>

          {/* Card 3: 1 Col */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 group hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <Layers className="h-6 w-6" />
              <span className="font-semibold text-sm">Server Actions</span>
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Type-Safe Mutations</h3>
            <p className="mt-2 text-xs text-zinc-400">
              Unified `ActionResult&lt;T&gt;` payloads with automatic Zod sanitization and tag-based cache revalidation.
            </p>
          </div>

          {/* Card 4: Large Span (2 Cols) */}
          <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 relative overflow-hidden group hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3 text-indigo-400 mb-4">
              <Globe className="h-6 w-6" />
              <span className="font-semibold text-sm">Edge & Global CDN</span>
            </div>
            <h3 className="text-xl font-bold text-zinc-100">
              Instant Global Distribution
            </h3>
            <p className="mt-2 text-xs text-zinc-400 max-w-md">
              Deploy to Vercel or self-hosted Docker clusters with automated SSL, HTTP-only cookie auth, and strict CSP headers.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ==========================================
// 4. Pricing Tiers Section
// ==========================================

export function PricingSection() {
  const [annualBilling, setAnnualBilling] = React.useState(true)

  const plans = [
    {
      name: 'Starter',
      priceMonthly: 29,
      priceAnnual: 24,
      description: 'Ideal for independent developers and early-stage MVP products.',
      features: [
        'Up to 3 Team Workspaces',
        '10,000 Monthly Active Users',
        'Standard Postgres Database',
        'Community Discord Support',
      ],
      cta: 'Start with Starter',
      popular: false,
    },
    {
      name: 'Pro',
      priceMonthly: 79,
      priceAnnual: 64,
      description: 'Built for scaling SaaS companies requiring advanced multi-tenancy.',
      features: [
        'Unlimited Team Workspaces',
        '100,000 Monthly Active Users',
        'Automated Database Backups',
        'Row-Level Security Audits',
        'Priority Slack & Email Support',
        'Custom Domain & Branding',
      ],
      cta: 'Start Pro Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      priceMonthly: 249,
      priceAnnual: 199,
      description: 'Dedicated infrastructure, custom SLAs, and high-security compliance.',
      features: [
        'Dedicated Postgres Instance',
        'Unlimited MAU & Storage',
        'SOC2 & HIPAA Compliant Logging',
        '99.99% Uptime Guarantee SLA',
        'Dedicated Solution Architect',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 bg-zinc-950 text-zinc-100 border-t border-zinc-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs">
            Transparent Pricing
          </Badge>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-zinc-100">
            Predictable Plans for Every Stage
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            No hidden charges. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/80 p-1">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                !annualBilling ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                annualBilling ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <span>Annual Billing</span>
              <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => {
            const price = annualBilling ? plan.priceAnnual : plan.priceMonthly

            return (
              <div
                key={plan.name}
                className={cn(
                  'relative flex flex-col justify-between rounded-2xl border p-6 sm:p-8 transition-all',
                  plan.popular
                    ? 'border-indigo-500 bg-zinc-900/90 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-xs px-3 py-0.5 shadow-md">
                    Most Popular
                  </Badge>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-100">{plan.name}</h3>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400 min-h-[36px]">{plan.description}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-zinc-100">${price}</span>
                    <span className="text-xs text-zinc-400">/ seat / month</span>
                  </div>

                  <div className="mt-8 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Included Features:
                    </span>
                    <ul className="space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5 text-xs text-zinc-300">
                          <Check className="h-4 w-4 text-indigo-400 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-800">
                  <Button
                    className={cn(
                      'w-full text-xs font-semibold',
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                        : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    )}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// 5. FAQ Accordion Section
// ==========================================

export function FAQSection() {
  const faqs = [
    {
      q: 'How does multi-tenant isolation work?',
      a: 'We leverage Supabase PostgreSQL Row-Level Security (RLS) with auth.uid() and organization_id mapping. Queries execute with tenant isolation at the database layer.',
    },
    {
      q: 'Can I self-host this stack on my own VPS?',
      a: 'Yes! The entire architecture is 100% compatible with self-hosted Docker Supabase setups and standard Node.js/Standalone Next.js deployments.',
    },
    {
      q: 'Are Server Actions compatible with Lovable and Supabase SSR?',
      a: 'Yes. All server actions utilize @supabase/ssr with HTTP-only cookie forwarders, ensuring full session propagation and CSRF protection.',
    },
    {
      q: 'What is the refund policy?',
      a: 'We offer a 14-day unconditional money-back guarantee for all monthly and annual paid tiers.',
    },
  ]

  return (
    <section id="faq" className="py-20 bg-zinc-950 text-zinc-100 border-t border-zinc-800/60">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs">
            Got Questions?
          </Badge>
          <h2 className="mt-3 text-3xl font-bold text-zinc-100">
            Frequently Asked Questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4"
            >
              <AccordionTrigger className="text-sm font-medium text-zinc-200 hover:text-indigo-300">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-zinc-400 leading-relaxed pt-1">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

// ==========================================
// 6. Comprehensive Footer Section
// ==========================================

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-12 text-zinc-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
              <Zap className="h-5 w-5 text-indigo-400 fill-current" />
              <span>ApexSaaS</span>
            </div>
            <p className="text-zinc-400 max-w-sm">
              Universal Full-Stack SaaS developer ecosystem for Next.js, Supabase, and shadcn/ui.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link href="https://github.com" className="text-zinc-400 hover:text-zinc-100">
                <Github className="h-4 w-4" />
              </Link>
              <Link href="https://twitter.com" className="text-zinc-400 hover:text-zinc-100">
                <Twitter className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Links: Product */}
          <div className="space-y-2.5">
            <span className="font-semibold text-zinc-200">Product</span>
            <ul className="space-y-2">
              <li><Link href="#features" className="hover:text-zinc-100">Features</Link></li>
              <li><Link href="#bento" className="hover:text-zinc-100">Architecture</Link></li>
              <li><Link href="#pricing" className="hover:text-zinc-100">Pricing</Link></li>
              <li><Link href="/changelog" className="hover:text-zinc-100">Changelog</Link></li>
            </ul>
          </div>

          {/* Links: Resources */}
          <div className="space-y-2.5">
            <span className="font-semibold text-zinc-200">Resources</span>
            <ul className="space-y-2">
              <li><Link href="/docs" className="hover:text-zinc-100">Documentation</Link></li>
              <li><Link href="/components" className="hover:text-zinc-100">UI Components</Link></li>
              <li><Link href="/templates" className="hover:text-zinc-100">Templates</Link></li>
              <li><Link href="/status" className="hover:text-zinc-100">System Status</Link></li>
            </ul>
          </div>

          {/* Newsletter Form */}
          <div className="space-y-2.5">
            <span className="font-semibold text-zinc-200">Stay Updated</span>
            <p className="text-[11px] text-zinc-500">Subscribe for release notes and tutorials.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Email address"
                className="h-8 border-zinc-800 bg-zinc-900 text-xs text-zinc-100"
              />
              <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white px-3">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-3">
          <p>© {new Date().getFullYear()} ApexSaaS Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-zinc-400">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-zinc-400">Terms of Service</Link>
            <Link href="/security" className="hover:text-zinc-400">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
```
