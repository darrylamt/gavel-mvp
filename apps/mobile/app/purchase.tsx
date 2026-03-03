import { useState } from 'react'
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useAuthSession } from '@/src/hooks/useAuthSession'
import { startPurchaseFlow } from '@/src/lib/payments/purchase'
import { resolvePaymentProvider } from '@/src/lib/payments/provider'
import type { PurchasePack } from '@/src/lib/payments/types'
import { transitionPurchaseState } from '@/src/lib/payments/purchaseState'
import { usePurchaseStore } from '@/src/state/purchaseStore'

const PACKS: PurchasePack[] = [
  { id: 'small', title: 'Small Pack (35 tokens)', tokens: 35 },
  { id: 'medium', title: 'Medium Pack (120 tokens)', tokens: 120 },
  { id: 'large', title: 'Large Pack (250 tokens)', tokens: 250 },
]

export default function PurchaseScreen() {
  const { user } = useAuthSession()
  const provider = resolvePaymentProvider({ productKind: 'digital' })
  const purchaseStore = usePurchaseStore()
  const [isPurchasing, setIsPurchasing] = useState(false)

  const onBuy = async (pack: PurchasePack) => {
    if (!user?.id || !user.email) {
      Alert.alert('Not signed in', 'Please sign in first.')
      return
    }

    setIsPurchasing(true)
    purchaseStore.setStatus(transitionPurchaseState(purchaseStore.status, 'start'))

    try {
      const result = await startPurchaseFlow({
        pack,
        userId: user.id,
        email: user.email,
      })

      if (!result.success) {
        purchaseStore.setStatus(transitionPurchaseState('pending', 'reject'), result.message)
        Alert.alert('Purchase failed', result.message ?? 'Unable to complete purchase.')
        return
      }

      purchaseStore.setStatus(transitionPurchaseState('pending', 'resolve'), result.transactionId)
      Alert.alert('Purchase started', `Provider: ${result.provider}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      purchaseStore.setStatus(transitionPurchaseState('pending', 'reject'), message)
      Alert.alert('Purchase error', message)
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Buy Tokens</Text>
      <Text style={styles.helper}>Digital goods provider for this device: {provider}</Text>

      {PACKS.map((pack) => (
        <View key={pack.id} style={styles.card}>
          <Text style={styles.cardTitle}>{pack.title}</Text>
          <Pressable style={styles.button} onPress={() => onBuy(pack)} disabled={isPurchasing}>
            <Text style={styles.buttonText}>{isPurchasing ? 'Processing...' : 'Buy'}</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.status}>Status: {purchaseStore.status}</Text>
      {purchaseStore.lastMessage ? <Text style={styles.meta}>{purchaseStore.lastMessage}</Text> : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  helper: {
    color: '#4b5563',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  status: {
    marginTop: 8,
    fontWeight: '600',
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
  },
})
