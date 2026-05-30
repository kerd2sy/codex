import { useState, useEffect, useCallback } from 'react';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { PharmacyVault } from '../utils/vault';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useProducts = (initialQuery: string = '') => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialQuery);

    const fetchProducts = useCallback(async (q: string = '', isBackground = false) => {
        if (!isBackground) setLoading(true);
        
        try {
            const activeId = await AsyncStorage.getItem('@active_pharmacy_id') || '0';
            const endpoint = q 
                ? `${API_ENDPOINTS.PRODUCTS.SEARCH}/?search=${encodeURIComponent(q)}`
                : `${API_ENDPOINTS.PRODUCTS.SEARCH}/recent?limit=50`;
                
            const res = await apiFetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
                
                // Only vault recent products (no query)
                if (!q && activeId !== '0') {
                    await PharmacyVault.set(activeId, 'products', 'recent', data);
                }
            }
        } catch (e) {
            console.warn('Could not fetch products');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            const activeId = await AsyncStorage.getItem('@active_pharmacy_id') || '0';
            
            // If it's a "recent products" call (no query), try vault first
            if (!searchQuery && activeId !== '0') {
                const cached = await PharmacyVault.get<any[]>(activeId, 'products', 'recent');
                if (cached && isMounted) {
                    setProducts(cached);
                    setLoading(false);
                }
            }

            const timer = setTimeout(() => {
                if (isMounted) fetchProducts(searchQuery, products.length > 0);
            }, searchQuery ? 500 : 0); // No delay for recent items

            return () => {
                isMounted = false;
                clearTimeout(timer);
            };
        };

        init();
    }, [searchQuery, fetchProducts]);

    return { products, loading, searchQuery, setSearchQuery, refresh: () => fetchProducts(searchQuery) };
};
