import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from '@/hooks/useRouter';
import { storage } from '@/utils/storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { cacheManager } from '../utils/cache-manager';
import { SyncController } from '../utils/sync-utils';
import { DatabaseManager } from '../utils/database';

export const useProfile = () => {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            // 1. Load from cache first for speed
            const cachedUser = await storage.getItem('user');
            if (cachedUser) setUser(JSON.parse(cachedUser));

            // 2. Fetch fresh data from backend
            try {
                const res = await apiFetch('/api/v1/auth/me');
                if (res.ok) {
                    const freshUser = await res.json();
                    setUser(freshUser);
                    await storage.setItem('user', JSON.stringify(freshUser));
                }
            } catch (e) {
                console.error("Failed to refresh profile:", e);
            }
        };
        loadUser();
    }, []);

    const logout = async () => {
        // If biometrics are enabled, we skip REVOKE to keep the session alive for the next biometric login
        const bioEnabled = await storage.getItem('user_biometric_enabled');

        try {
            if (bioEnabled !== 'true') {
                await apiFetch(API_ENDPOINTS.AUTH.REVOKE, { method: 'POST' });
            }
        } catch (e) {}
        
        await storage.deleteItem('access_token');
        if (bioEnabled !== 'true') {
            await storage.deleteItem('refresh_token');
        }
        
        await storage.deleteItem('user');
        
        // 4. Clear all pharmacy-related persistent storage
        const allKeys = await AsyncStorage.getAllKeys();
        const pharmKeys = allKeys.filter(k => 
            k.startsWith('@dashboard_cache') || 
            k === '@active_pharmacy_id' || 
            k.startsWith('@dismissed_location') ||
            k.startsWith('@vault:')
        );
        
        await AsyncStorage.multiRemove([
            ...pharmKeys,
            '@remember_me', 
            'is_authenticating_google', 
            'google_pkce_verifier'
        ]);
        
        // PURGE Namespaced Memory Caches for multi-user isolation
        cacheManager.clearAllMemoryCaches();
        
        // 5. Stop all background sync tasks and clear offline DB
        SyncController.resetSync();
        DatabaseManager.clearAllData();
        
        await storage.setItem('user_has_logged_out', 'true');
        router.replace('/(auth)/login');
    };

    return { user, logout };
};

