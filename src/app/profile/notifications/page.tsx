'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthGuard } from '@/hooks/useAuthGuard'

type NotificationPreferences = {
  // Opt-in/out
  sms_opt_in: boolean
  sms_marketing_opt_in: boolean
  
  // Countdown notifications
  sms_auction_countdown_10h: boolean
  sms_auction_countdown_5h: boolean
  sms_auction_countdown_1h: boolean
  import { redirect } from 'next/navigation'

  export default function NotificationSettingsPage() {
    redirect('/profile/settings')
  }
  sms_auction_won: boolean
