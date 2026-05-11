'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, X, Maximize2, Heart, Share2,
  MapPin, Phone, MessageCircle, Copy, Check, Clock,
  CheckCircle2, XCircle, Shield, BadgeCheck, ChevronDown,
} from 'lucide-react'
import type { AutoListing, AutoAuction } from '@/types/autos'
import { formatGhs } from '@/lib/formatGhs'
import { CONDITION_CONFIG } from '@/lib/autoUtils'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      'bg-[#0a0c10]',
  bg2:     'bg-[#11141a]',
  card:    'bg-[#14181f]',
  border:  'border-[#232830]',
  text:    'text-[#f4f1ea]',
  text2:   'text-[#b8b3a8]',
  text3:   'text-[#6b6960]',
  accent:  '#E63946',
  success: '#6aa67a',
}

type Props = {
  listing: AutoListing & { profiles?: { username: string | null } | null }
  auction: AutoAuction | null
  similar: AutoListing[]
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
function Gallery({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0)
  const [light, setLight] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const total = images.length
  const prev = () => setIdx(i => (i - 1 + total) % total)
  const next = () => setIdx(i => (i + 1) % total)

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const img = images[idx]

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Main image */}
        <div className="relative rounded-2xl overflow-hidden bg-[#11141a]" style={{ aspectRatio: '16/10' }}>
          {img ? (
            <img src={img} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className={`text-6xl ${T.text3}`}>🚗</span>
            </div>
          )}

          {/* Controls TL */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: T.accent, color: '#fff' }}>Featured</span>
          </div>

          {/* Controls TR */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={() => setSaved(s => !s)}
              className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${saved ? 'bg-red-500/90 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}>
              <Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button onClick={copyLink}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
            </button>
            <button onClick={() => setLight(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Counter BR */}
          {total > 1 && (
            <div className="absolute bottom-3 right-3">
              <span className={`rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-mono text-white backdrop-blur-sm`}>
                {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Arrows */}
          {total > 1 && (
            <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {total > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {images.map((src, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`flex-shrink-0 rounded-xl overflow-hidden transition-all ${i === idx ? 'ring-2 ring-[#E63946] opacity-100' : 'opacity-50 hover:opacity-80'}`}
                style={{ width: 72, height: 50 }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {light && (
        <div onClick={() => setLight(false)} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6">
          <button onClick={() => setLight(false)} className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          {total > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img src={img} alt={title} className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function Countdown({ endTime }: { endTime: string }) {
  const [t, setT] = useState('')
  const update = () => {
    const d = new Date(endTime).getTime() - Date.now()
    if (d <= 0) { setT('Ended'); return }
    const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000)
    setT(h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m ${s}s`)
  }
  useState(() => { update(); const id = setInterval(update, 1000); return () => clearInterval(id) })
  return <span>{t}</span>
}

// ─── Specs accordion ──────────────────────────────────────────────────────────
function SpecsAccordion({ groups }: { groups: { title: string; rows: [string, string][] }[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ [groups[0]?.title]: true })
  return (
    <div className={`rounded-2xl overflow-hidden border ${T.border}`}>
      {groups.map(({ title, rows }, gi) => (
        <div key={title} className={gi > 0 ? `border-t ${T.border}` : ''}>
          <button onClick={() => setOpen(o => ({ ...o, [title]: !o[title] }))}
            className={`w-full flex items-center justify-between px-5 py-4 ${T.card} hover:bg-[#181c24] transition-colors`}>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-[11px] tracking-widest ${T.text3}`}>0{gi + 1}</span>
              <span className={`text-sm font-semibold ${T.text}`}>{title}</span>
            </div>
            <ChevronDown className={`h-4 w-4 ${T.text3} transition-transform ${open[title] ? 'rotate-180' : ''}`} />
          </button>
          {open[title] && (
            <div className={T.bg2}>
              {rows.map(([k, v], ri) => (
                <div key={k} className={`flex items-center justify-between px-5 py-3 ${ri < rows.length - 1 ? `border-b ${T.border}` : ''}`}>
                  <span className={`text-sm ${T.text3}`}>{k}</span>
                  <span className={`text-sm font-medium ${T.text} capitalize`}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AutoDetailPage({ listing, auction, similar }: Props) {
  const [bid, setBid] = useState('')
  const isAuction = listing.listing_type === 'auction'
  const images = listing.images ?? []
  const conditionCfg = CONDITION_CONFIG[listing.condition]
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${listing.year} ${listing.make} ${listing.model} – Gavel Autos\n${typeof window !== 'undefined' ? window.location.href : ''}`)}`

  // Quick specs
  const quickSpecs = [
    listing.year && ['Year', String(listing.year)],
    listing.mileage != null && listing.condition !== 'brand_new' && ['Mileage', `${listing.mileage.toLocaleString()} km`],
    listing.transmission && ['Transmission', listing.transmission],
    listing.fuel_type && ['Fuel', listing.fuel_type],
    listing.engine_size && ['Engine', listing.engine_size],
    listing.drive_type && ['Drivetrain', listing.drive_type.toUpperCase()],
    listing.condition && ['Condition', conditionCfg?.label ?? listing.condition],
    listing.color && ['Color', listing.color],
  ].filter(Boolean) as [string, string][]

  // Full specs groups
  const specGroups = [
    {
      title: 'Vehicle',
      rows: [
        ['Make', listing.make],
        ['Model', listing.model],
        ['Year', String(listing.year)],
        listing.engine_size && ['Engine', listing.engine_size],
        listing.transmission && ['Transmission', listing.transmission],
        listing.fuel_type && ['Fuel type', listing.fuel_type],
        listing.drive_type && ['Drivetrain', listing.drive_type.toUpperCase()],
        listing.color && ['Colour', listing.color],
      ].filter(Boolean) as [string, string][],
    },
    {
      title: 'Condition & History',
      rows: [
        ['Condition', conditionCfg?.label ?? listing.condition],
        listing.mileage != null && listing.condition !== 'brand_new' && ['Mileage', `${listing.mileage.toLocaleString()} km`],
        listing.previous_owners != null && ['Owners', String(listing.previous_owners)],
        listing.vin && ['VIN', `${listing.vin.slice(0, 3)}****${listing.vin.slice(-3)}`],
      ].filter(Boolean) as [string, string][],
    },
  ].filter(g => g.rows.length > 0)

  return (
    <div className={`${T.bg} ${T.text} min-h-screen`}>
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">

        {/* Breadcrumb */}
        <nav className={`flex items-center gap-2 text-xs ${T.text3} mb-6`}>
          <Link href="/autos" className="hover:text-[#f4f1ea] transition-colors">Autos</Link>
          <span>›</span>
          <Link href={`/autos/browse?vehicle_type=${listing.vehicle_type}`} className="hover:text-[#f4f1ea] transition-colors capitalize">{listing.vehicle_type}</Link>
          <span>›</span>
          <Link href={`/autos/browse?make=${listing.make}`} className="hover:text-[#f4f1ea] transition-colors">{listing.make}</Link>
          <span>›</span>
          <span className={T.text2}>{listing.model}</span>
        </nav>

        {/* Hero grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 mb-10">
          {/* Gallery */}
          <Gallery images={images} title={listing.title} />

          {/* Sticky summary */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            {/* Price card */}
            <div className={`${T.card} border ${T.border} rounded-2xl p-5`}>
              {/* Location + listed */}
              <div className={`flex items-center justify-between text-xs ${T.text3} mb-4`}>
                {(listing.city || listing.region) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {listing.city ? `${listing.city}, ` : ''}{listing.region}
                  </span>
                )}
              </div>

              {/* Year + make */}
              <p className={`font-mono text-[11px] tracking-widest uppercase mb-2 ${T.text3}`}>
                {listing.year} · {listing.make} {listing.model}
              </p>
              <h1 className={`text-2xl font-bold ${T.text} leading-tight mb-3`}>{listing.title}</h1>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-green-600/40 text-green-400 bg-green-500/10">
                  ● Available
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${conditionCfg?.color}`}>
                  {conditionCfg?.label}
                </span>
                {listing.roadworthy && (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-[#232830] text-[#b8b3a8]">
                    Roadworthy
                  </span>
                )}
                {listing.customs_cleared && (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-[#232830] text-[#b8b3a8]">
                    Customs cleared
                  </span>
                )}
              </div>

              {/* Price */}
              {isAuction && auction ? (
                <>
                  <p className={`text-xs ${T.text3} mb-1`}>Current bid</p>
                  <p className="text-3xl font-bold mb-1" style={{ color: T.accent }}>
                    {formatGhs(auction.current_bid ?? auction.reserve_price)}
                  </p>
                  <div className="flex items-center gap-2 mb-5">
                    <p className={`flex items-center gap-1 text-sm ${T.text2}`}>
                      <Clock className="h-3.5 w-3.5" />
                      <Countdown endTime={auction.end_time} />
                    </p>
                    <span className={T.text3}>·</span>
                    <span className={`text-sm ${T.text3}`}>{auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="mb-4">
                    <label className={`text-xs ${T.text3} block mb-1.5`}>Your bid (GHS)</label>
                    <input value={bid} onChange={e => setBid(e.target.value)} type="number"
                      placeholder={`Min: ${formatGhs((auction.current_bid ?? auction.reserve_price) + 500)}`}
                      className={`w-full ${T.bg2} border ${T.border} rounded-xl px-3 py-2.5 text-sm ${T.text} outline-none focus:ring-1`}
                      style={{ outlineColor: T.accent }} />
                  </div>
                  <button className="w-full rounded-xl py-3 text-sm font-bold text-white transition-colors" style={{ background: T.accent }}>
                    Place bid
                  </button>
                  <p className={`text-center text-xs ${T.text3} mt-2`}>Tokens required to bid</p>
                </>
              ) : (
                <>
                  <p className={`text-xs ${T.text3} mb-1`}>Asking price</p>
                  <p className="text-3xl font-bold mb-5" style={{ color: T.accent }}>
                    {listing.price ? formatGhs(listing.price) : 'Price on request'}
                  </p>
                </>
              )}

              {/* Divider */}
              <div className={`border-t ${T.border} my-4`} />

              {/* Seller */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-sm flex-shrink-0"
                  style={{ background: T.accent }}>
                  {(listing.profiles?.username ?? 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${T.text}`}>{listing.profiles?.username ?? 'Seller'}</p>
                  <p className={`text-xs ${T.text3}`}>Verified seller</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: T.accent }}>
                  <Phone className="h-4 w-4" /> Call seller
                </button>
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white bg-[#25D366] hover:brightness-105 transition-all">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  WhatsApp
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <button className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium border ${T.border} ${T.text2} hover:${T.card} transition-colors`}>
                    <MessageCircle className="h-4 w-4" /> Message
                  </button>
                  <button className={`flex items-center justify-center rounded-xl py-2.5 text-sm font-medium border ${T.border} ${T.text2} hover:${T.card} transition-colors`}>
                    Make offer
                  </button>
                </div>
              </div>
            </div>

            {/* Documents card */}
            <div className={`${T.card} border ${T.border} rounded-2xl p-5`}>
              <p className={`font-mono text-[10px] tracking-widest uppercase ${T.text3} mb-4`}>Documents</p>
              <div className="space-y-3">
                {[
                  { label: 'Roadworthy certificate', ok: listing.roadworthy, note: listing.roadworthy_expiry ? `Valid to ${new Date(listing.roadworthy_expiry).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}` : 'Valid' },
                  { label: 'Customs cleared', ok: listing.customs_cleared, note: listing.customs_cleared ? 'Confirmed' : 'Not confirmed' },
                ].map(d => (
                  <div key={d.label} className={`flex items-center gap-3 py-2.5 border-b ${T.border} last:border-0`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 ${d.ok ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-500'}`}>
                      {d.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${T.text}`}>{d.label}</p>
                      <p className={`text-xs ${T.text3}`}>{d.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── At a glance ── */}
        {quickSpecs.length > 0 && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>At a glance</h2>
            <p className={`text-xs ${T.text3} mb-5`}>Key details about this vehicle.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickSpecs.map(([label, value]) => (
                <div key={label} className={`${T.card} border ${T.border} rounded-xl px-4 py-3`}>
                  <p className={`font-mono text-[10px] tracking-widest uppercase ${T.text3} mb-1`}>{label}</p>
                  <p className={`text-sm font-semibold ${T.text} capitalize`}>{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Description ── */}
        {listing.description && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>Description</h2>
            <p className={`text-xs ${T.text3} mb-4`}>From the seller.</p>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${T.text2}`}>{listing.description}</p>
          </section>
        )}

        {/* ── Full specifications ── */}
        {specGroups.length > 0 && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>Full specifications</h2>
            <p className={`text-xs ${T.text3} mb-5`}>As reported by the seller.</p>
            <SpecsAccordion groups={specGroups} />
          </section>
        )}

        {/* ── Similar vehicles ── */}
        {similar.length > 0 && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>Similar vehicles</h2>
            <p className={`text-xs ${T.text3} mb-5`}>More listings you might like.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similar.map(s => {
                const cond = CONDITION_CONFIG[s.condition]
                const img = s.images?.[0]
                return (
                  <Link key={s.id} href={`/autos/${s.id}`} className={`${T.card} border ${T.border} rounded-2xl overflow-hidden hover:border-[#E63946]/40 transition-colors group`}>
                    <div className="relative h-28 bg-[#11141a]">
                      {img
                        ? <img src={img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className={`w-full h-full flex items-center justify-center ${T.text3} text-2xl`}>🚗</div>
                      }
                    </div>
                    <div className="p-3">
                      <p className={`font-mono text-[10px] ${T.text3}`}>{s.year} · {cond?.label}</p>
                      <p className={`text-sm font-semibold ${T.text} truncate`}>{s.make} {s.model}</p>
                      <p className="text-sm font-bold mt-1" style={{ color: T.accent }}>{s.price ? formatGhs(s.price) : 'POA'}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Trust ── */}
        <section className="mb-6">
          <div className={`${T.card} border ${T.border} rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6`}>
            {[
              { icon: Shield, title: 'Buyer protection', desc: 'Funds held in escrow until vehicle delivery is confirmed.' },
              { icon: BadgeCheck, title: 'Verified listings', desc: 'Every listing is reviewed by our team before going live.' },
              { icon: MessageCircle, title: 'Report a concern', desc: 'Spot something off? Our trust team reviews every report.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${T.border}`}>
                  <Icon className="h-4 w-4" style={{ color: T.accent }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${T.text} mb-1`}>{title}</p>
                  <p className={`text-xs leading-relaxed ${T.text3}`}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
