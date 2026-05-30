import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Platform-aware storage utility to handle Web compatibility.
 * Falls back to AsyncStorage (LocalStorage) on Web since SecureStore is native-only.
 */
const SECURE_KEYS = [
  'access_token', 'refresh_token', 'user', 'fcm_token', 
  'user_biometric_enabled', 'last_login_timestamp', 'last_biometric_auth_timestamp'
];

const SENSITIVE_PATTERNS: RegExp[] = [
  // Only highly sensitive small items should be here
  // Vault data and cached details are too large for SecureStore (2KB limit)
];

const isSensitive = (key: string) => SECURE_KEYS.includes(key) || SENSITIVE_PATTERNS.some(p => p.test(key));


export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') return await AsyncStorage.getItem(key);
      
      if (isSensitive(key)) {
        return await SecureStore.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      return null;
    }

  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        if (isSensitive(key)) {
          await SecureStore.setItemAsync(key, value);
        } else {
          await AsyncStorage.setItem(key, value);
        }
      }
    } catch (error) {
      // Fail silently in production
    }

  },
  
  deleteItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        if (isSensitive(key)) {
          await SecureStore.deleteItemAsync(key);
        } else {
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      // Fail silently
    }

  }
};
