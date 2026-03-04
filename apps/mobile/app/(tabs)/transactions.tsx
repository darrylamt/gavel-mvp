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
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (query.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load order history.</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order History</Text>
        <Text style={styles.subtitle}>Track wallet topups and token usage</Text>
      </View>

      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.meta}>{new Date(item.created_at).toLocaleDateString()}</Text>
              {item.reference ? <Text style={styles.reference}>Ref {item.reference}</Text> : null}
            </View>

            <View style={styles.rowRight}>
              <Text style={styles.amount}>{item.amount}</Text>
              <Text style={styles.status}>{item.amount > 0 ? 'Credit' : 'Debit'}</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 3,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#b91c1c',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6b7280',
  },
  row: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    gap: 2,
    flex: 1,
    marginRight: 10,
  },
  type: {
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
  },
  reference: {
    color: '#9ca3af',
    fontSize: 11,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },
  status: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
})
