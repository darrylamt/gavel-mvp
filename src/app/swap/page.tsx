import Link from 'next/link'
import { Suspense } from 'react'
import {
  ArrowRight,
  ClipboardList,
  Clock,
  CalendarCheck,
  RefreshCw,
  ShieldCheck,
  DollarSign,
  Users,
  Lock,
  Smartphone,
} from 'lucide-react'
import type { SwapInventoryItem } from '@/types/swap'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Phone Swap | Gavel',
  description:
    'Trade in your old phone and upgrade to something better. Gavel handles everything in-office — transparent pricing, no surprises.',
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function fetchInventory(): Promise<{ inventory: SwapInventoryItem[]; total: number }> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/swap/inventory`, { cache: 'no-store' })
    if (!res.ok) return { inventory: [], total: 0 }
    return res.json()
  } catch {
    return { inventory: [], total: 0 }
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConditionBadge({ condition }: { condition: SwapInventoryItem['condition'] }) {
  const map: Record<SwapInventoryItem['condition'], { label: string; cls: string }> = {
    new: { label: 'New', cls: 'bg-emerald-100 text-emerald-700' },
    used_excellent: { label: 'Excellent', cls: 'bg-sky-100 text-sky-700' },
    used_good: { label: 'Good', cls: 'bg-amber-100 text-amber-700' },
    used_fair: { label: 'Fair', cls: 'bg-gray-100 text-gray-600' },
  }
  const { label, cls } = map[condition] ?? { label: condition, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

async function InventoryPreview() {
  const { inventory, total } = await fetchInventory()
  const preview = inventory.slice(0, 6)

  if (preview.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-8">
        No upgrade phones currently listed — check back soon.
      </p>
    )
  }

  return (
    <>
      {/* count callout */}
      <p className="text-center text-sm font-semibold text-orange-600 mb-6">
        {total} upgrade phone{total !== 1 ? 's' : ''} available right now
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {preview.map((item) => {
          const model = item.swap_phone_models
          const name = model ? `${model.brand} ${model.model}` : 'Phone'
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="h-5 w-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                  <p className="text-xs text-gray-400">{item.storage} · {item.color}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <ConditionBadge condition={item.condition} />
                <p className="text-base font-bold text-gray-900">
                  GH₵ {Number(item.price).toLocaleString()}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {total > 6 && (
        <p className="mt-4 text-center text-xs text-gray-400">
          Showing 6 of {total} available phones. Start a swap to see all options.
        </p>
      )}
    </>
  )
}

function InventoryPreviewSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="flex justify-between">
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Steps data ─────────────────────────────────────────────────────────────────

const steps = [
  {
    icon: ClipboardList,
    step: '01',
    title: 'Submit Your Phone Details',
    description:
      'Fill out our online form with your phone model, storage, and condition. Attach your battery health screenshot and a few photos.',
  },
  {
    icon: Clock,
    step: '02',
    title: 'Get a Transparent Offer',
    description:
      'Our team reviews your submission and sends a firm offer within 24 hours — calculated with a clear deduction formula you can see upfront.',
  },
  {
    icon: CalendarCheck,
    step: '03',
    title: 'Book an In-Office Appointment',
    description:
      'Pick a convenient time slot. Bring your phone to our office for a quick physical verification by the Gavel team.',
  },
  {
    icon: RefreshCw,
    step: '04',
    title: 'Trade In & Upgrade!',
    description:
      'Hand over your old phone, pay the remaining balance, and walk out with your new device. It\'s that simple.',
  },
]

const trustSignals = [
  {
    icon: DollarSign,
    title: 'Transparent Deduction Formula',
    description:
      'Every deduction is itemised — screen condition, battery health, camera faults, body damage. No hidden costs.',
  },
  {
    icon: ShieldCheck,
    title: 'GHS 100 Refundable Deposit',
    description:
      'A small deposit holds your offer and shows intent. It is fully credited towards your upgrade at the appointment.',
  },
  {
    icon: Users,
    title: 'In-Office Verification',
    description:
      'The Gavel team physically inspects your device at the appointment, so there are no disputes or surprises.',
  },
  {
    icon: Lock,
    title: 'Price Locked for 7 Days',
    description:
      'Once your offer is approved, the trade-in value is locked for 7 days — giving you time to book without stress.',
  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SwapLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gray-900 text-white">
        {/* background gradient accent */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-orange-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:py-28 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 mb-6">
            <RefreshCw className="h-3 w-3" />
            Gavel Phone Swap
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Trade In.{' '}
            <span className="text-orange-500">Upgrade.</span>
            <br />
            Pay Less.
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-gray-300 leading-relaxed">
            Bring your old phone to Gavel. We verify it in person, give you a transparent trade-in value,
            and let you walk out with an upgrade — all handled by the Gavel team so you never get shortchanged.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/swap/submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 text-base font-bold text-white shadow-lg hover:bg-orange-600 active:scale-95 transition-all"
            >
              Start Your Upgrade
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/swap/history"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/20 transition-all"
            >
              My Swap History
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="mt-2 text-gray-500 text-sm sm:text-base">
            Four simple steps from old phone to new upgrade.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ icon: Icon, step, title, description }) => (
            <div
              key={step}
              className="relative rounded-2xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-orange-500" />
                </div>
                <span className="text-3xl font-black text-gray-100 select-none">{step}</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm leading-snug">{title}</h3>
                <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust Signals ── */}
      <section className="bg-white border-y border-gray-100">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Why Trust Gavel Swap?</h2>
            <p className="mt-2 text-gray-500 text-sm sm:text-base">
              We built the process to be fair and stress-free from start to finish.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {trustSignals.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inventory Preview ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Phones You Can Upgrade To</h2>
          <p className="mt-2 text-gray-500 text-sm sm:text-base">
            Our partner dealer keeps a fresh stock of quality phones ready for swap.
          </p>
        </div>

        <Suspense fallback={<InventoryPreviewSkeleton />}>
          <InventoryPreview />
        </Suspense>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-orange-500">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Ready to upgrade your phone?
          </h2>
          <p className="mt-3 text-orange-100 text-sm sm:text-base">
            It takes just a few minutes to submit your phone details online.
          </p>
          <Link
            href="/swap/submit"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-orange-600 shadow-md hover:bg-orange-50 active:scale-95 transition-all"
          >
            Start Your Upgrade
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
