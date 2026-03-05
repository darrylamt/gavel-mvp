import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { AuctionCard } from '@/src/components/auction/AuctionCard'
import { getActiveAuctions, type Auction } from '@/src/lib/mock/marketplace'

export default function AuctionsScreen() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      let isMounted = true
      const fetch = async () => {
        try {
          const data = await getActiveAuctions(50)
          if (isMounted) setAuctions(data)
        } finally {
          if (isMounted) setLoading(false)
        }
      }
      fetch()
      return () => { isMounted = false }
    }, [])
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#e53238" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>⏰ Live Auctions</Text>
        <Text style={styles.subtitle}>{auctions.length} active bids</Text>
      </View>
      <FlatList 
        data={auctions} 
        keyExtractor={(i) => i.id} 
        contentContainerStyle={styles.content} 
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />} 
        renderItem={({ item }) => <AuctionCard auction={item} compact />} 
        ListEmptyComponent={<Text style={styles.empty}>No active auctions</Text>}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: { 
    paddingHorizontal: 16, 
    paddingTop: 14, 
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  brand: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#e53238',
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontWeight: '500'
  },
  content: { 
    paddingHorizontal: 12, 
    paddingBottom: 18,
    paddingTop: 12
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 15
  }
})
