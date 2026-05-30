import { storage } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pharmacy Vault: A strictly namespaced storage system.
 * It ensures that data for different pharmacies never overlaps.
 * Key Format: `@vault:{pharmId}:{module}:{data_key}`
 */

type VaultModule = 'dashboard' | 'statement' | 'sales' | 'purchases' | 'returns' | 'cash' | 'details' | 'sync' | 'notifications' | 'orders' | 'products';

export const PharmacyVault = {
  /**
   * Generates a namespaced key
   */
  makeKey: (pharmId: string, module: VaultModule, dataKey: string) => {
    return `@vault:${pharmId}:${module}:${dataKey}`;
  },

  /**
   * Stores data in the pharmacy's vault
   */
  set: async (pharmId: string, module: VaultModule, dataKey: string, value: any) => {
    if (!pharmId || pharmId === '0') return;
    const key = PharmacyVault.makeKey(pharmId, module, dataKey);
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    try {
      await storage.setItem(key, jsonValue);
      console.log(`[Vault] 💾 Saved: [Pharm:${pharmId}] [Module:${module}] [Key:${dataKey}]`);
    } catch (e) {
      console.error(`[Vault] ❌ Save Error:`, e);
    }
  },

  /**
   * Retrieves data from the pharmacy's vault
   */
  get: async <T = any>(pharmId: string, module: VaultModule, dataKey: string): Promise<T | null> => {
    if (!pharmId || pharmId === '0') return null;
    const key = PharmacyVault.makeKey(pharmId, module, dataKey);
    
    try {
      const value = await storage.getItem(key);
      if (!value) {
        // console.log(`[Vault] 🔍 Miss: [Pharm:${pharmId}] [Module:${module}] [Key:${dataKey}]`);
        return null;
      }
      
      const parsed = JSON.parse(value);
      const count = Array.isArray(parsed) ? parsed.length : (parsed.items ? parsed.items.length : '1 object');
      console.log(`[Vault] ⚡ Loaded: [Pharm:${pharmId}] [Module:${module}] [Key:${dataKey}] (${count} records)`);
      return parsed as T;
    } catch (e) {
      // Fallback for non-JSON strings
      const value = await storage.getItem(key);
      return value as unknown as T;
    }
  },

  /**
   * Removes a specific item from the vault
   */
  remove: async (pharmId: string, module: VaultModule, dataKey: string) => {
    const key = PharmacyVault.makeKey(pharmId, module, dataKey);
    await storage.deleteItem(key);
    console.log(`[Vault] 🗑️ Deleted: [Pharm:${pharmId}] [Module:${module}] [Key:${dataKey}]`);
  },

  /**
   * Wipes ALL data for a specific pharmacy vault
   */
  clearVault: async (pharmId: string) => {
    const keys = await AsyncStorage.getAllKeys();
    const vaultKeys = keys.filter(k => k.startsWith(`@vault:${pharmId}:`));
    if (vaultKeys.length > 0) {
      for (const key of vaultKeys) {
        await storage.deleteItem(key);
      }
      console.log(`[Vault] 🔥 FULL PURGE for pharmacy: ${pharmId}`);
    }
  },

  /**
   * Purges legacy non-namespaced keys from AsyncStorage.
   */
  purgeLegacy: async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const legacyPrefixes = [
        '@cached_statement_', '@cached_balance_', '@statement_sync_',
        '@cached_sales_', '@sales_sync_', '@cached_purchases_',
        '@purchases_sync_', '@cached_returns_', '@returns_sync_',
        '@cached_cash_', '@cash_sync_', '@dashboard_cache_'
      ];

      const keysToDelete = allKeys.filter(key => 
        legacyPrefixes.some(prefix => key.startsWith(prefix))
      );

      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch (e) {}
  }
};
