import * as SecureStore from 'expo-secure-store'

const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      return window.localStorage.getItem(key)
    }
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      window.localStorage.setItem(key, value)
      return
    }
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      window.localStorage.removeItem(key)
      return
    }
    await SecureStore.deleteItemAsync(key)
  },
}
