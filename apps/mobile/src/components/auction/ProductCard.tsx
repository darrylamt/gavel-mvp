import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { ShopProduct } from '@/src/lib/mock/marketplace'
import { Link } from 'expo-router'

type ProductCardProps = {
  item: ShopProduct
  onPress?: () => void
}

export function ProductCard({ item, onPress }: ProductCardProps) {
  return (
    <Link href={`/shop/${item.id}`} asChild>
      <Pressable style={styles.card} onPress={onPress}>
        <View style={styles.image}>
          <Text style={styles.categoryPill}>{item.category}</Text>
        </View>
        <View style={styles.content}>
          <Text numberOfLines={2} style={styles.title}>
            {item.title}
          </Text>
          <Text style={styles.price}>GHS {Math.floor(item.price).toLocaleString()}</Text>
          {item.stock > 0 && <Text style={styles.stock}>{item.stock} in stock</Text>}
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eceff3',
    overflow: 'hidden',
  },
  image: {
    height: 112,
    backgroundColor: '#f3f4f6',
    padding: 10,
    justifyContent: 'flex-start',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    color: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
  },
  content: {
    padding: 10,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minHeight: 36,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  rating: {
    color: '#6b7280',
    fontSize: 12,
  },
})
