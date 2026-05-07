'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, X, Maximize2, Heart, Share2,
  MapPin, Phone, MessageCircle, Check, Clock,
  CheckCircle2, XCircle, Shield, BadgeCheck, ChevronDown, FileText,
} from 'lucide-react'
import type { PropertyListing, PropertyAuction } from '@/types/properties'
import { formatGhs } from '@/lib/formatGhs'
import { PROPERTY_TYPE_LABELS, TITLE_TYPE_LABELS, getPropertyCommission } from '@/lib/propertyUtils'

const T = {
  bg:     'bg-[#0a0c10]',
  bg2:    'bg-[#11141a]',
  card:   'bg-[#14181f]',
  border: 'border-[#232830]',
  text:   'text-[#f4f1ea]',
  text2:  'text-[#b8b3a8]',
  text3:  'text-[#6b6960]',
  accent: '#C9A84C',
}

type Props = {
  listing: PropertyListing & { profiles?: { username: string | null } | null }
  auction: PropertyAuction | null
  similar: PropertyListing[]
}

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
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const img = images[idx]

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="relative rounded-2xl overflow-hidden bg-[#11141a]" style={{ aspectRatio: '21/12' }}>
          {img
            ? <img src={img} alt={title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-5xl">🏡</div>
          }
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0a0c10]" style={{ background: T.accent }}>★ Featured</span>
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={() => setSaved(s => !s)}
              className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${saved ? 'bg-red-500/90 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}>
              <Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button onClick={copyLink} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
            </button>
            <button onClick={() => setLight(true)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          {total > 1 && (
            <div className="absolute bottom-3 right-3">
              <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-mono text-white backdrop-blur-sm">
                {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
            </div>
          )}
          {total > 1 && (
            <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        {total > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {images.map((src, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`flex-shrink-0 rounded-xl overflow-hidden transition-all ${i === idx ? 'ring-2 opacity-100' : 'opacity-50 hover:opacity-80'}`}
                style={{ width: 80, height: 52, '--tw-ring-color': T.accent } as any}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      {light && (
        <div onClick={() => setLight(false)} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6">
          <button onClick={() => setLight(false)} className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
          {total > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
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
                  <span className={`text-sm font-medium ${T.text}`}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function PropertyDetailPage({ listing, auction, similar }: Props) {
  const [bid, setBid] = useState('')
  const isAuction = listing.listing_type === 'auction'
  const images = listing.images ?? []
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${listing.title} — Gavel Properties\n${typeof window !== 'undefined' ? window.location.href : ''}`)}`
  const commission = listing.price ? getPropertyCommission(listing.price) : 0.05

  const sizeStr = [
    listing.size_plots ? `${listing.size_plots} plot${listing.size_plots !== 1 ? 's' : ''}` : null,
    listing.size_sqm ? `${listing.size_sqm.toLocaleString()} m²` : null,
    listing.size_sqft ? `${listing.size_sqft.toLocaleString()} sq ft` : null,
  ].filter(Boolean).join(' · ')

  const highlights = [
    sizeStr && ['Plot size', sizeStr],
    listing.property_type && ['Type', PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type],
    listing.title_type && ['Title', TITLE_TYPE_LABELS[listing.title_type] ?? listing.title_type],
    listing.bedrooms != null && ['Bedrooms', String(listing.bedrooms)],
    listing.bathrooms != null && ['Bathrooms', String(listing.bathrooms)],
    listing.furnished && ['Furnished', listing.furnished.replace('_', ' ')],
    listing.land_commission_number && ['Commission No.', listing.land_commission_number],
    listing.gps_coordinates && ['GPS', listing.gps_coordinates],
  ].filter(Boolean) as [string, string][]

  const specGroups = [
    {
      title: 'Property details',
      rows: [
        ['Type', PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type],
        listing.title_type && ['Title type', TITLE_TYPE_LABELS[listing.title_type] ?? listing.title_type],
        listing.land_commission_number && ['Commission No.', listing.land_commission_number],
        sizeStr && ['Size', sizeStr],
        listing.actual_dimensions && ['Dimensions', listing.actual_dimensions],
        listing.gps_coordinates && ['GPS', listing.gps_coordinates],
      ].filter(Boolean) as [string, string][],
    },
    listing.bedrooms != null || listing.bathrooms != null ? {
      title: 'Building',
      rows: [
        listing.bedrooms != null && ['Bedrooms', String(listing.bedrooms)],
        listing.bathrooms != null && ['Bathrooms', String(listing.bathrooms)],
        listing.furnished && ['Furnished', listing.furnished.replace('_', ' ')],
      ].filter(Boolean) as [string, string][],
    } : null,
  ].filter(Boolean) as { title: string; rows: [string, string][] }[]

  const docs = [
    { label: 'Title / Ownership', ok: !!listing.title_type, note: listing.title_type ? (TITLE_TYPE_LABELS[listing.title_type] ?? listing.title_type) : 'Not specified' },
    { label: 'Land Commission No.', ok: !!listing.land_commission_number, note: listing.land_commission_number ?? 'Not provided' },
    { label: 'Listing verified', ok: listing.status === 'active', note: listing.status === 'active' ? 'Active & verified' : listing.status },
  ]

  return (
    <div className={`${T.bg} ${T.text} min-h-screen`}>
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">

        {/* Breadcrumb */}
        <nav className={`flex items-center gap-2 text-xs ${T.text3} mb-6`}>
          <Link href="/properties" className="hover:text-[#f4f1ea] transition-colors">Properties</Link>
          <span>›</span>
          <Link href={`/properties/browse?property_type=${listing.property_type}`} className="hover:text-[#f4f1ea] transition-colors">
            {PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type}
          </Link>
          <span>›</span>
          <Link href={`/properties/browse?region=${listing.region}`} className="hover:text-[#f4f1ea] transition-colors">{listing.region}</Link>
          <span>›</span>
          <span className={T.text2}>{listing.city}</span>
        </nav>

        {/* Hero grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 mb-10">
          <Gallery images={images} title={listing.title} />

          {/* Sticky summary */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <div className={`${T.card} border ${T.border} rounded-2xl p-5`}>
              <div className={`flex items-center justify-between text-xs ${T.text3} mb-4`}>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}, {listing.region}
                </span>
              </div>

              <p className={`font-mono text-[11px] tracking-widest uppercase mb-2 ${T.text3}`}>
                {PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type}
                {sizeStr ? ` · ${sizeStr}` : ''}
              </p>
              <h1 className={`text-2xl font-bold ${T.text} leading-tight mb-3`}>{listing.title}</h1>

              <div className="flex flex-wrap gap-2 mb-5">
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-green-600/40 text-green-400 bg-green-500/10">
                  ● Available
                </span>
                {listing.title_type && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${T.border} ${T.text2}`}>
                    {TITLE_TYPE_LABELS[listing.title_type] ?? listing.title_type}
                  </span>
                )}
                {listing.is_licensed_auctioneer && (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Licensed auctioneer
                  </span>
                )}
              </div>

              {isAuction && auction ? (
                <>
                  <p className={`text-xs ${T.text3} mb-1`}>Current bid</p>
                  <p className="text-3xl font-bold mb-1" style={{ color: T.accent }}>
                    {formatGhs(auction.current_bid ?? auction.reserve_price)}
                  </p>
                  <p className={`flex items-center gap-1 text-sm mb-5 ${T.text2}`}>
                    <Clock className="h-3.5 w-3.5" />
                    <Countdown endTime={auction.end_time} />
                    <span className={T.text3}>· {auction.bid_count} bids</span>
                  </p>
                  <div className="mb-4">
                    <label className={`text-xs ${T.text3} block mb-1.5`}>Your bid (GHS)</label>
                    <input value={bid} onChange={e => setBid(e.target.value)} type="number"
                      className={`w-full ${T.bg2} border ${T.border} rounded-xl px-3 py-2.5 text-sm ${T.text} outline-none focus:ring-1`}
                      style={{ outlineColor: T.accent }} />
                  </div>
                  <button className="w-full rounded-xl py-3 text-sm font-bold text-[#0a0c10] transition-opacity hover:opacity-90"
                    style={{ background: T.accent }}>Place bid</button>
                </>
              ) : (
                <>
                  <p className={`text-xs ${T.text3} mb-1`}>Asking price</p>
                  <p className="text-3xl font-bold mb-1" style={{ color: T.accent }}>
                    {listing.price ? formatGhs(listing.price) : 'Price on request'}
                  </p>
                  {listing.price && (
                    <p className={`text-xs ${T.text3} mb-5`}>
                      Gavel commission ({Math.round(commission * 100)}%): {formatGhs(listing.price * commission)}
                    </p>
                  )}
                </>
              )}

              <div className={`border-t ${T.border} my-4`} />

              {/* Seller */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-[#0a0c10] font-bold text-sm flex-shrink-0"
                  style={{ background: T.accent }}>
                  {((listing.contact_person ?? listing.profiles?.username ?? 'S').charAt(0)).toUpperCase()}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${T.text}`}>
                    {listing.contact_person ?? listing.profiles?.username ?? 'Seller'}
                  </p>
                  <p className={`text-xs ${T.text3}`}>
                    {listing.is_licensed_auctioneer ? '✓ Licensed auctioneer' : 'Verified seller'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                {listing.contact_phone && (
                  <a href={`tel:${listing.contact_phone}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#0a0c10] transition-opacity hover:opacity-90"
                    style={{ background: T.accent }}>
                    <Phone className="h-4 w-4" /> Call seller
                  </a>
                )}
                {!listing.contact_phone && (
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#0a0c10] transition-opacity hover:opacity-90"
                    style={{ background: T.accent }}>
                    <Phone className="h-4 w-4" /> Call seller
                  </button>
                )}
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white bg-[#25D366] hover:brightness-105">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  WhatsApp agent
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <button className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium border ${T.border} ${T.text2}`}>
                    <FileText className="h-4 w-4" /> Documents
                  </button>
                  <button className={`flex items-center justify-center rounded-xl py-2.5 text-sm font-medium border ${T.border} ${T.text2}`}>
                    Make offer
                  </button>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className={`${T.card} border ${T.border} rounded-2xl p-5`}>
              <p className={`font-mono text-[10px] tracking-widest uppercase ${T.text3} mb-4`}>Documentation</p>
              <div className="space-y-3">
                {docs.map(d => (
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

        {/* ── Property highlights ── */}
        {highlights.length > 0 && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>Property highlights</h2>
            <p className={`text-xs ${T.text3} mb-5`}>Key details verified at listing.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {highlights.map(([label, value]) => (
                <div key={label} className={`${T.card} border ${T.border} rounded-xl px-4 py-3`}>
                  <p className={`font-mono text-[10px] tracking-widest uppercase ${T.text3} mb-1`}>{label}</p>
                  <p className={`text-sm font-semibold ${T.text} capitalize`}>{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Amenities ── */}
        {listing.amenities && listing.amenities.length > 0 && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>Amenities</h2>
            <p className={`text-xs ${T.text3} mb-5`}>Available on this property.</p>
            <div className="flex flex-wrap gap-2">
              {listing.amenities.map(a => (
                <span key={a} className={`rounded-xl border ${T.border} px-3 py-2 text-sm ${T.text2} flex items-center gap-2`}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> {a}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Description ── */}
        {listing.description && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>About this property</h2>
            <p className={`text-xs ${T.text3} mb-4`}>From the seller.</p>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${T.text2}`}>{listing.description}</p>
          </section>
        )}

        {/* ── Full specs ── */}
        {specGroups.length > 0 && specGroups[0].rows.length > 0 && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>Full specifications</h2>
            <p className={`text-xs ${T.text3} mb-5`}>As declared by the seller.</p>
            <SpecsAccordion groups={specGroups} />
          </section>
        )}

        {/* ── Map ── */}
        {listing.gps_coordinates && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>Plot location</h2>
            <p className={`text-xs ${T.text3} mb-5`}>{listing.gps_coordinates}</p>
            <div className="rounded-2xl overflow-hidden h-56">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(listing.gps_coordinates)}&output=embed`}
                width="100%" height="100%" style={{ border: 0 }} loading="lazy" title="Property location"
              />
            </div>
          </section>
        )}

        {/* ── Similar properties ── */}
        {similar.length > 0 && (
          <section className={`mb-10 border-b ${T.border} pb-10`}>
            <h2 className={`text-base font-bold ${T.text} mb-1`}>Similar plots</h2>
            <p className={`text-xs ${T.text3} mb-5`}>In the same corridor.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similar.map(s => {
                const img = s.images?.[0]
                return (
                  <Link key={s.id} href={`/properties/${s.id}`}
                    className={`${T.card} border ${T.border} rounded-2xl overflow-hidden hover:border-[#C9A84C]/40 transition-colors group`}>
                    <div className="relative h-28 bg-[#11141a]">
                      {img
                        ? <img src={img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className={`w-full h-full flex items-center justify-center ${T.text3} text-2xl`}>🏡</div>
                      }
                    </div>
                    <div className="p-3">
                      <p className={`font-mono text-[10px] ${T.text3}`}>{s.city}, {s.region}</p>
                      <p className={`text-sm font-semibold ${T.text} truncate`}>{s.title}</p>
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
              { icon: Shield, title: 'Title verification', desc: 'Every Gavel property listing is checked before going live.' },
              { icon: BadgeCheck, title: 'Escrow on payment', desc: 'Funds held until deed registration completes.' },
              { icon: MessageCircle, title: 'Site-visit guarantee', desc: 'No-show or misrepresented? Full deposit refund guaranteed.' },
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
