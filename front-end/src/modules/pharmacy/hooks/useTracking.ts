import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { PharmacyVault } from '../utils/vault';

export const INITIAL_DRIVER_POS = { latitude: 24.7200, longitude: 46.6850 };
export const DESTINATION = { latitude: 24.7136, longitude: 46.6753 };
export const STEPS = ['كتابة', 'تحضير', 'جرد'];

export const useTracking = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const driverPosRef = useRef(INITIAL_DRIVER_POS);

    const fetchOrders = useCallback(async (isBg = false) => {
        if (!isBg && orders.length === 0) setLoading(true);
        try {
            const id = await AsyncStorage.getItem('@active_pharmacy_id');
            if (!id) return;

            const res = await apiFetch(`${API_ENDPOINTS.ORDERS.LIST}?pharmacy_id=${id}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
                // Save to vault for instant next load
                await PharmacyVault.set(id, 'orders', 'recent_orders', data);
            }
        } catch (e) {
            console.error('[useTracking] Fetch failed:', e);
        } finally {
            setLoading(false);
        }
    }, [orders.length]);

    useEffect(() => {
        let isMounted = true;
        
        const loadInitial = async () => {
            const id = await AsyncStorage.getItem('@active_pharmacy_id');
            if (id && isMounted) {
                // Try to load from cache first
                const cached = await PharmacyVault.get<any[]>(id, 'orders', 'recent_orders');
                if (cached && cached.length > 0) {
                    setOrders(cached);
                    setLoading(false);
                }
                // Then fetch fresh data
                fetchOrders(true);
            }
        };

        loadInitial();
        const t = setInterval(() => fetchOrders(true), 15000);
        return () => {
            isMounted = false;
            clearInterval(t);
        };
    }, [fetchOrders]);

    return { orders, loading, driverPosRef, refetch: fetchOrders };
};
