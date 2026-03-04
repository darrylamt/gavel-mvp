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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Auctions</Text>
      </View>
      <FlatList data={auctions} keyExtractor={(i) => i.id} contentContainerStyle={styles.content} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} renderItem={({ item }) => <AuctionCard auction={item} compact />} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  content: { paddingHorizontal: 16, paddingBottom: 18 },
})
