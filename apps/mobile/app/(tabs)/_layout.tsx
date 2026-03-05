import { Tabs } from 'expo-router'
import { StyleSheet } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: '#e53238',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Shop',
          tabBarLabel: 'Shop',
        }} 
      />
      <Tabs.Screen 
        name="auctions" 
        options={{ 
          title: 'Auctions',
          tabBarLabel: 'Auctions',
        }} 
      />
      <Tabs.Screen 
        name="transactions" 
        options={{ 
          title: 'My Purchases',
          tabBarLabel: 'Purchases',
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarLabel: 'Profile',
        }} 
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fafafa'
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  }
})
