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
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profileQuery.data?.full_name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email ?? 'Not available'}</Text>
          {profileQuery.data?.role && (
            <Text style={styles.badge}>{profileQuery.data.role.toUpperCase()}</Text>
          )}
        </View>
      </View>

      {/* Account Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Seller</Text>
          <Text style={styles.statValue}>•••</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Buyer</Text>
          <Text style={styles.statValue}>•••</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tokens</Text>
          <Text style={styles.statValue}>{profileQuery.data?.tokens ?? 0}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionText}>Edit Profile</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>📍</Text>
          <Text style={styles.actionText}>Saved Addresses</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>❤️</Text>
          <Text style={styles.actionText}>Saved Items</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionIcon}>🛒</Text>
          <Text style={styles.actionText}>Buy Again</Text>
        </Pressable>
      </View>

      {/* Account Settings */}
      <View style={styles.settingsCard}>
        <Pressable style={styles.settingButton}>
          <Text style={styles.settingIcon}>🔒</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingText}>Account Security</Text>
            <Text style={styles.settingSubtext}>Password & settings</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
        <Pressable style={styles.settingButton}>
          <Text style={styles.settingIcon}>🔔</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingText}>Notifications</Text>
            <Text style={styles.settingSubtext}>Manage alerts</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
        <Pressable style={styles.settingButton}>
          <Text style={styles.settingIcon}>ℹ️</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingText}>Help & Support</Text>
            <Text style={styles.settingSubtext}>FAQs & contact</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {/* Sign Out */}
      <Pressable 
        style={styles.signOutButton} 
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    paddingTop: 12
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  headerCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e53238'
  },
  avatarText: {
    fontSize: 30
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333'
  },
  email: {
    fontSize: 13,
    color: '#666'
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e53238',
    marginTop: 4
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e53238'
  },

  // Actions
  actionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12
  },
  actionIcon: {
    fontSize: 18,
    minWidth: 24,
    textAlign: 'center'
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1
  },

  // Settings
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12
  },
  settingIcon: {
    fontSize: 18,
    minWidth: 24,
    textAlign: 'center'
  },
  settingContent: {
    flex: 1,
    gap: 2
  },
  settingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333'
  },
  settingSubtext: {
    fontSize: 12,
    color: '#999'
  },
  arrow: {
    fontSize: 18,
    color: '#ccc'
  },

  // Sign Out
  signOutButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e53238'
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e53238'
  }
})
