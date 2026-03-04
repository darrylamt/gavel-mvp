import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAuthSession } from '@/src/hooks/useAuthSession'
import { AuctionCard } from '@/src/components/auction/AuctionCard'
import { ProductCard } from '@/src/components/auction/ProductCard'
import { getEndingSoonAuctions, getActiveProducts, type Auction, type ShopProduct } from '@/src/lib/mock/marketplace'

const categories = ['All', 'Furniture', 'Kitchen', 'Decor']

export default function HomeScreen() {
  const { user } = useAuthSession()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      let isMounted = true
      const load = async () => {
        try {
          const [a, p] = await Promise.all([getEndingSoonAuctions(), getActiveProducts(8)])
          if (isMounted) {
            setAuctions(a)
            setProducts(p)
          }
        } finally {
          if (isMounted) setLoading(false)
        }
      }
      load()
      return () => { isMounted = false }
    }, [])
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome</Text>
          <Text style={styles.user}>{user?.email?.split('@')[0] ?? 'Guest'}</Text>
        </View>

        <TextInput style={styles.search} placeholder="Search..." placeholderTextColor="#9ca3af" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {categories.map((c) => <Pressable key={c} style={[styles.chip, c === 'All' && styles.activeChip]}><Text style={c === 'All' ? { color: '#fff', fontWeight: '600' } : { color: '#374151', fontWeight: '600' }}>{c}</Text></Pressable>)}
        </ScrollView>

        {auctions.length > 0 && (
          <>
            <Text style={styles.section}>Ending Soon</Text>
            <FlatList horizontal scrollEnabled={false} data={auctions.slice(0, 5)} keyExtractor={(i) => i.id} contentContainerStyle={{ gap: 10 }} renderItem={({ item }) => <AuctionCard auction={item} />} />
          </>
        )}

        {products.length > 0 && (
          <>
            <Text style={styles.section}>Available Now</Text>
            <View style={styles.grid}>
              {products.map((p) => <View key={p.id} style={{ width: '50%', paddingHorizontal: 5 }}><ProductCard item={p} /></View>)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22, gap: 14 },
  header: { marginBottom: 4 },
  greeting: { color: '#6b7280', fontSize: 13 },
  user: { color: '#111827', fontSize: 20, fontWeight: '800' },
  search: { height: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 14, fontSize: 15, color: '#111827' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  activeChip: { backgroundColor: '#111827', borderColor: '#111827' },
  section: { fontSize: 19, fontWeight: '800', color: '#111827', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, rowGap: 10 },
})
