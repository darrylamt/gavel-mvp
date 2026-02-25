import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type ContactPayload = {
  name: string
  email: string
  subject: string
  message: string
}

function parseBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function sanitize(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

const contactRateLimit = new Map<string, { count: number; resetAt: number }>()
const CONTACT_LIMIT = 5
const CONTACT_WINDOW_MS = 60_000

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

function checkContactRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = contactRateLimit.get(ip)
  if (!entry) {
    contactRateLimit.set(ip, { count: 1, resetAt: now + CONTACT_WINDOW_MS })
    return true
  }
  if (now >= entry.resetAt) {
    contactRateLimit.set(ip, { count: 1, resetAt: now + CONTACT_WINDOW_MS })
    return true
  }
  if (entry.count >= CONTACT_LIMIT) return false
  entry.count += 1
  return true
}

export async function POST(req: Request) {
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  const ip = getClientIp(req)
  if (!checkContactRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let payload: ContactPayload
  try {
    payload = (await req.json()) as ContactPayload
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  const name = sanitize(String(payload.name || ''))
  const email = sanitize(String(payload.email || '')).toLowerCase()
  const subject = sanitize(String(payload.subject || ''))
  const message = String(payload.message || '').trim()

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (name.length > 120 || subject.length > 180 || message.length > 5000) {
    return NextResponse.json({ error: 'One or more fields exceed allowed length' }, { status: 400 })
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const token = parseBearerToken(req)
  let userId: string | null = null

  if (token) {
    const {
      data: { user },
    } = await anon.auth.getUser(token)
    userId = user?.id ?? null
  }

  const service = createClient(supabaseUrl, serviceRoleKey)

  const { error } = await service.from('contact_messages').insert({
    name,
    email,
    subject,
    message,
    user_id: userId,
    source: 'contact_page',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
