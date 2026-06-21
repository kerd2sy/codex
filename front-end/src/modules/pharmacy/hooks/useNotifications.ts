import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { getLocalNotifications, markLocalNotificationRead, clearAllLocalNotifications } from '@/lib/notifications';
import { PharmacyVault } from '../utils/vault';

import { useSegments } from 'expo-router';

const Notifications = Constants.appOwnership === 'expo' ? null : require('expo-notifications');

export const useNotifications = () => {
    const segments = useSegments();
    const appGuard = segments[0]?.replace(/[()]/g, '') || 'pharmacy'; // Extracts 'admin', 'pharmacy', 'gomla' etc.

    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        const loadInitial = async () => {
            const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id') || 'global';
            const cached = await PharmacyVault.get(activePharmId, 'notifications', 'cache');
            if (cached && cached.length > 0) {
                setNotifications(cached);
            }
        };
        loadInitial();
    }, []);

    const fetchNotifications = useCallback(async (isBg = false) => {
        if (isFetchingRef.current) return;
        if (!isBg) setLoading(true);
        try {
            isFetchingRef.current = true;
            // Add cache buster and app guard query params
            const endpoint = `${API_ENDPOINTS.NOTIFICATIONS.LIST}?app=${appGuard}&_t=${Date.now()}`;
            const res = await apiFetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                const fetchedList = Array.isArray(data) ? data : [];
                
                // Filter zero value transactions
                const filtered = fetchedList.filter((n: any) => {
                    const desc = n.description || "";
                    const isZeroValue = /(^|\s)0(\.00)?(\s|$|ج\.م)/.test(desc);
                    return !isZeroValue;
                });

                const local = await getLocalNotifications();
                const combined = [...local, ...filtered].sort((a, b) => {
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                });
                
                const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id') || 'global';
                setNotifications(combined);
                await PharmacyVault.set(activePharmId, 'notifications', 'cache', combined);
            }
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                console.warn('[Notifications] Fetch aborted (Timeout/Cancellation)');
            } else {
                console.error(e);
            }
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        const interactionPromise = InteractionManager.runAfterInteractions(() => {
            fetchNotifications();
        });
        const t = setInterval(() => fetchNotifications(true), 20000);
        return () => {
            interactionPromise.cancel();
            clearInterval(t);
        };
    }, [fetchNotifications]);

    const markRead = async (item: any) => {
        try {
            if (item.id.toString().startsWith('local_')) {
                await markLocalNotificationRead(item.id);
            } else {
                await apiFetch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(item.id), { method: 'POST' });
            }
            setNotifications(prev => {
                const updated = prev.map(n => n.id === item.id ? { ...n, unread: false } : n);
                // Also update vault/cache to persist the read status
                AsyncStorage.getItem('@active_pharmacy_id').then(pharmId => {
                    PharmacyVault.set(pharmId || 'global', 'notifications', 'cache', updated);
                });
                return updated;
            });
        } catch (e) {
            console.error(e);
        }
    };

    const clearAll = async () => {
        try {
            const res = await apiFetch(API_ENDPOINTS.NOTIFICATIONS.CLEAR_ALL, { method: 'DELETE' });
            if (res.ok) {
                await clearAllLocalNotifications();
                setNotifications([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const clearBadge = async () => {
        try {
            if (Notifications) {
                await Notifications.setBadgeCountAsync(0);
            }
        } catch (e) {
            console.warn('[Notifications] Failed to clear badge:', e);
        }
    };

    const markAllRead = async () => {
        try {
            await apiFetch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, { method: 'POST' });
            setNotifications(prev => {
                const updated = prev.map(n => ({ ...n, unread: false }));
                AsyncStorage.getItem('@active_pharmacy_id').then(pharmId => {
                    PharmacyVault.set(pharmId || 'global', 'notifications', 'cache', updated);
                });
                return updated;
            });
            clearBadge();
        } catch (e) {
            console.error(e);
        }
    };

    return { notifications, loading, markRead, markAllRead, clearAll, refetch: fetchNotifications, clearBadge };
};
