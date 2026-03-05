import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useAuthSession } from '@/src/hooks/useAuthSession'
import { supabase } from '@/src/lib/supabase'

type TokenTransaction = {
  id: string
  type: string
  amount: number
  reference: string | null
  created_at: string
}

export default function TransactionsScreen() {
  const { user } = useAuthSession()

  const query = useQuery({
    queryKey: ['token-transactions', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_transactions')
        .select('id, type, amount, reference, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw error
      }

      return data as TokenTransaction[]
    },
  })

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e53238" />
      </View>
    )
  }

  if (query.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ Failed to load your purchases</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛍️ My Purchases</Text>
        <Text style={styles.subtitle}>View your order history</Text>
      </View>

      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No purchases yet. Start shopping!</Text>}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.type}>
                {item.type === 'credit' ? '💳 Wallet Top-up' : '🏷️ Item Purchased'}
              </Text>
              <Text style={styles.meta}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
              {item.reference && (
                <Text style={styles.reference}>Ref: {item.reference}</Text>
              )}
            </View>

            <View style={styles.rowRight}>
              <Text style={[styles.amount, { color: item.amount > 0 ? '#27ae60' : '#e53238' }]}>
                {item.amount > 0 ? '+' : ''}{item.amount}
              </Text>
              <View style={[
                styles.status,
                { backgroundColor: item.amount > 0 ? '#e8f5e9' : '#ffebee' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: item.amount > 0 ? '#27ae60' : '#e53238' }
                ]}>
                  {item.amount > 0 ? 'Credit' : 'Debit'}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e53238',
    letterSpacing: -0.5
  },
  subtitle: {
    color: '#666',
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#e53238',
    fontSize: 15,
    fontWeight: '600'
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 15
  },
  row: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  type: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14
  },
  meta: {
    color: '#999',
    fontSize: 12,
  },
  reference: {
    color: '#bbb',
    fontSize: 11,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    fontWeight: '700',
    fontSize: 16,
    color: '#333',
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  }
})
