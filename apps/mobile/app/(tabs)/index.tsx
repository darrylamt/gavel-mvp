import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAuthSession } from '@/src/hooks/useAuthSession'
import { AuctionCard } from '@/src/components/auction/AuctionCard'
import { ProductCard } from '@/src/components/auction/ProductCard'
import { getEndingSoonAuctions, getActiveProducts, type Auction, type ShopProduct } from '@/src/lib/mock/marketplace'

const categories = ['All', 'Furniture', 'Kitchen', 'Decor', 'Electronics', 'Books']

export default function HomeScreen() {
  const { user } = useAuthSession()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')

  useFocusEffect(
    useCallback(() => {
      let isMounted = true
      const load = async () => {
        try {
          const [a, p] = await Promise.all([getEndingSoonAuctions(), getActiveProducts(12)])
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
          <ActivityIndicator size="large" color="#e53238" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>eBay</Text>
          <Text style={styles.tagline}>Buy & Sell</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput 
            style={styles.search} 
            placeholder="Search items..." 
            placeholderTextColor="#999"
          />
          <Pressable style={styles.searchIcon}>
            <Text style={{ fontSize: 20 }}>🔍</Text>
          </Pressable>
        </View>

        {/* Featured Deal Banner */}
        <Pressable style={styles.bannerContainer}>
          <View style={styles.banner}>
            <Text style={styles.bannerLabel}>TODAY'S DEALS</Text>
            <Text style={styles.bannerTitle}>Save up to 80%</Text>
            <Text style={styles.bannerSubtitle}>on selected items</Text>
          </View>
        </Pressable>

        {/* Category Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesContainer}
          scrollEventThrottle={16}
        >
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Ending Soon Section */}
        {auctions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⏰ Ending Soon</Text>
              <Pressable>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              scrollEnabled={false}
              data={auctions.slice(0, 4)}
              keyExtractor={(i) => i.id}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => <AuctionCard auction={item} />}
            />
          </View>
        )}

        {/* Shop Now Section - Grid */}
        {products.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✨ Shop Featured Items</Text>
              <Pressable>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.grid}>
              {products.map((p) => (
                <View key={p.id} style={styles.gridItemContainer}>
                  <ProductCard item={p} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fafafa'
  },
  content: { 
    paddingBottom: 20,
  },
  
  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  brand: {
    fontSize: 28,
    fontWeight: '900',
    color: '#e53238',
    letterSpacing: -1
  },
  tagline: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 2
  },

  // Search
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  search: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  searchIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Banner
  bannerContainer: {
    marginHorizontal: 12,
    marginVertical: 12
  },
  banner: {
    backgroundColor: '#c41e3a',
    borderRadius: 12,
    padding: 16,
    paddingVertical: 20
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    opacity: 0.9,
    letterSpacing: 1.5
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.95,
    marginTop: 4
  },

  // Categories
  categoriesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff'
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  categoryChipActive: {
    backgroundColor: '#333',
    borderColor: '#333'
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333'
  },
  categoryTextActive: {
    color: '#fff'
  },

  // Sections
  section: {
    marginTop: 16,
    paddingHorizontal: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333'
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e53238'
  },

  // Horizontal List
  horizontalList: {
    gap: 10,
    paddingRight: 12
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    rowGap: 8,
    columnGap: 8
  },
  gridItemContainer: {
    width: '50%',
    paddingHorizontal: 4
  }
})
