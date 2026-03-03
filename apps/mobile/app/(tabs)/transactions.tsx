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
        <Text>Failed to load transactions.</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            <Text style={styles.amount}>{item.amount}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6b7280',
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  type: {
    fontWeight: '600',
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
  },
  amount: {
    fontWeight: '700',
  },
})
