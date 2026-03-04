import { Stack, useLocalSearchParams } from 'expo-router'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { findAuctionById } from '@/src/lib/mock/marketplace'

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const auction = findAuctionById(id)

  if (!auction) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorTitle}>Auction not found</Text>
        <Text style={styles.errorBody}>The item may have ended or no longer exists.</Text>
      </SafeAreaView>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Auction Details' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.category}>{auction.category}</Text>
            <Text style={styles.heroTimer}>{auction.timeLeft} left</Text>
          </View>

          <Text style={styles.title}>{auction.title}</Text>
          <Text style={styles.location}>{auction.location}</Text>

          <View style={styles.priceCard}>
            <View>
              <Text style={styles.label}>Current Bid</Text>
              <Text style={styles.currentBid}>GHS {auction.currentBid.toLocaleString()}</Text>
            </View>
            <Text style={styles.bidCount}>{auction.bidCount} bids</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <Text style={styles.sectionBody}>{auction.seller}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condition</Text>
            <Text style={styles.sectionBody}>{auction.condition}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Engagement</Text>
            <Text style={styles.sectionBody}>{auction.watchers} users are watching this auction</Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Place Bid</Text>
            </Pressable>
            {auction.buyNowPrice ? (
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Buy Now GHS {auction.buyNowPrice}</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  hero: {
    height: 220,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    padding: 16,
    justifyContent: 'space-between',
  },
  category: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    color: '#111827',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTimer: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    color: '#ffffff',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '800',
  },
  location: {
    color: '#6b7280',
    fontSize: 14,
  },
  priceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
  },
  currentBid: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  bidCount: {
    color: '#374151',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 4,
  },
  sectionTitle: {
    color: '#6b7280',
    fontSize: 12,
  },
  sectionBody: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 22,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#111827',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  errorTitle: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  errorBody: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6b7280',
  },
})
