import { Stack, usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { AppProviders } from '@/src/providers/AppProviders'
import { useAuthSession } from '@/src/hooks/useAuthSession'

function RootNavigator() {
  const { loading, session } = useAuthSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) {
      return
    }

    const inAuthGroup = pathname.startsWith('/sign-') || pathname.startsWith('/reset-password')

    if (!session && !inAuthGroup) {
      router.replace('/sign-in')
    }

    if (session && inAuthGroup) {
      router.replace('/')
    }
  }, [loading, pathname, router, session])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="purchase" options={{ title: 'Buy Tokens' }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
