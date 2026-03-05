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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  image: {
    height: 120,
    backgroundColor: '#f5f5f5',
    padding: 10,
    justifyContent: 'flex-start',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#e53238',
    color: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '600',
    overflow: 'hidden',
  },
  content: {
    padding: 11,
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    minHeight: 32,
    lineHeight: 16,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e53238',
  },
  stock: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '600',
  },
  rating: {
    color: '#999',
    fontSize: 11,
  },
})
