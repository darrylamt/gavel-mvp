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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eceff3',
    overflow: 'hidden',
  },
  compactCard: {
    width: '100%',
  },
  thumbnail: {
    height: 128,
    backgroundColor: '#f3f4f6',
    padding: 12,
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
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  priceRow: {
    gap: 4,
  },
  currentBid: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  buyNow: {
    fontSize: 12,
    color: '#374151',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  condition: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  watchers: {
    fontSize: 12,
    color: '#6b7280',
  },
})
