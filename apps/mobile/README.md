# Gavel Mobile (Expo)

Expo React Native app for iOS and Android, integrated with the existing Gavel backend (Next.js APIs + Supabase).

## Stack

- Expo + React Native + TypeScript
- Expo Router
- Supabase Auth/DB
- React Query
- Zustand
- RevenueCat (StoreKit + Play Billing)

## Setup

1. Install deps:
   - `cd apps/mobile`
   - `npm install`
2. Create env file:
   - copy `.env.example` to `.env`
3. Set mobile env values:
   - `EXPO_PUBLIC_API_BASE_URL`
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
4. Start app:
   - `npm run start`
   - `npm run ios` or `npm run android`

## Important: RevenueCat Native Setup

RevenueCat (react-native-purchases) requires native code and **cannot run in Expo Go**. For local development:
- Purchase flows will only work in custom development builds or production builds
- Use EAS Build to create development builds: `npx eas build --profile development`
- Alternatively, test purchase logic with mocked flows or via staging environments

For production: RevenueCat works normally in EAS builds without additional config plugins.

## Payment behavior by platform

- iOS digital goods: `app_store` via RevenueCat
- Android digital goods: `play_billing` via RevenueCat
- Paystack: only for allowed physical-goods/mobile-web flows

## Backend env required for mobile purchase verification

- `REVENUECAT_SECRET_API_KEY`
- `REVENUECAT_WEBHOOK_AUTH`

## Backend endpoints used by mobile

- Existing:
  - `POST /api/tokens/init`
- New mobile hooks:
  - `POST /api/mobile/purchases/verify`
  - `POST /api/mobile/purchases/revenuecat-webhook`

## Build & release with EAS

- Login: `npx eas login`
- Configure: `npx eas build:configure`
- iOS prod build: `npx eas build -p ios --profile production`
- Android prod build: `npx eas build -p android --profile production`
- Submit iOS: `npx eas submit -p ios --profile production`
- Submit Android: `npx eas submit -p android --profile production`

## Tests

- Unit tests:
  - `npm run test`
- E2E outline:
  - `.maestro/auth-and-purchase.yaml`

## Migration notes

See `docs/mobile-payments.md` for backend contracts and token entitlement flow.
