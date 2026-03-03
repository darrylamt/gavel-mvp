import Constants from 'expo-constants'

type ExpoExtra = {
  apiBaseUrl?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  revenueCatIosApiKey?: string
  revenueCatAndroidApiKey?: string
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra

function readEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  apiBaseUrl: readEnv('EXPO_PUBLIC_API_BASE_URL', extra.apiBaseUrl),
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL', extra.supabaseUrl),
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', extra.supabaseAnonKey),
  revenueCatIosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? extra.revenueCatIosApiKey ?? '',
  revenueCatAndroidApiKey:
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? extra.revenueCatAndroidApiKey ?? '',
}
