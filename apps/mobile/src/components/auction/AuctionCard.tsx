import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Auction } from '@/src/lib/mock/marketplace'

function formatTimeLeft(endsAt: string): string {
  const now = new Date()
  const end = new Date(endsAt)
  const diffMs = end.getTime() - now.getTime()

  if (diffMs < 0) return 'Ended'
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

type AuctionCardProps = {
  auction: Auction
  compact?: boolean
}

export function AuctionCard({ auction, compact = false }: AuctionCardProps) {
  const cardStyle = StyleSheet.flatten([styles.card, compact && styles.compactCard])
  const timeLeft = formatTimeLeft(auction.ends_at)

  return (
    <Link href={`/auction/${auction.id}`} asChild>
      <Pressable style={cardStyle}>
        <View style={styles.thumbnail}>
          <View style={styles.timerPill}>
            <Text style={styles.timerText}>{timeLeft}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text numberOfLines={2} style={styles.title}>
            {auction.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.currentBid}>GHS {Math.floor(auction.current_price).toLocaleString()}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 270,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  compactCard: {
    width: '100%',
    flexDirection: 'row',
  },
  thumbnail: {
    height: 128,
    backgroundColor: '#f5f5f5',
    padding: 10,
    justifyContent: 'space-between',
  },
  thumbnailText: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  timerPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#e53238',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    padding: 12,
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: '#999',
  },
  priceRow: {
    gap: 2,
  },
  currentBid: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e53238',
  },
  buyNow: {
    fontSize: 11,
    color: '#666',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  condition: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '600',
  },
  watchers: {
    fontSize: 11,
    color: '#999',
  },
})
