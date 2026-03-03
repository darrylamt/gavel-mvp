import { Link } from 'expo-router'
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useAuthSession } from '@/src/hooks/useAuthSession'
import { supabase } from '@/src/lib/supabase'

export default function HomeScreen() {
  const { user } = useAuthSession()

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Gavel Mobile</Text>
      <Text style={styles.subtitle}>Signed in as {user?.email ?? 'Unknown user'}</Text>

      <View style={styles.actions}>
        <Link href="/purchase" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Buy tokens</Text>
          </Pressable>
        </Link>

        <Link href="/transactions" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View transactions</Text>
          </Pressable>
        </Link>

        <Pressable style={styles.secondaryButton} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 10,
  },
  title: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#4b5563',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111827',
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
})
