import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Shop' }} />
      <Tabs.Screen name="auctions" options={{ title: 'Auctions' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
