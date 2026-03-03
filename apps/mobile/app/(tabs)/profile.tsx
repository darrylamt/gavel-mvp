import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useAuthSession } from '@/src/hooks/useAuthSession'
import { supabase } from '@/src/lib/supabase'

type ProfileRow = {
  full_name: string | null
  role: string | null
  tokens: number | null
}

export default function ProfileScreen() {
  const { user } = useAuthSession()

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, tokens')
        .eq('id', user!.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data as ProfileRow | null
    },
  })

  if (profileQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{user?.email ?? 'Not available'}</Text>

      <Text style={styles.label}>Name</Text>
      <Text style={styles.value}>{profileQuery.data?.full_name ?? 'Not set'}</Text>

      <Text style={styles.label}>Role</Text>
      <Text style={styles.value}>{profileQuery.data?.role ?? 'user'}</Text>

      <Text style={styles.label}>Tokens</Text>
      <Text style={styles.value}>{profileQuery.data?.tokens ?? 0}</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    color: '#6b7280',
    fontSize: 12,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
})
