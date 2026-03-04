import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
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
      <View style={styles.headerCard}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{user?.email ?? 'Not available'}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{profileQuery.data?.full_name ?? 'Not set'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{profileQuery.data?.role ?? 'user'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Tokens</Text>
          <Text style={styles.value}>{profileQuery.data?.tokens ?? 0}</Text>
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionText}>Edit Profile</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionText}>Saved Addresses</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.actionText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  email: {
    color: '#d1d5db',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#6b7280',
    fontSize: 13,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
})
