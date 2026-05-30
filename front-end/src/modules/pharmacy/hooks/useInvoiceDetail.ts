import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { PharmacyVault } from '../utils/vault';

export type InvoiceType = 'purchase' | 'sales' | 'return';

interface UseInvoiceDetailOptions {
    type: InvoiceType;
    id: string;
}

export const useInvoiceDetail = ({ type, id }: UseInvoiceDetailOptions) => {
    const [details, setDetails] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDetails = useCallback(async (isInitial = false) => {
        try {
            const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id');
            const pharmId = activePharmId || '0';
            
            // 1. Try Vault Cache for instant display
            const cached = await PharmacyVault.get(pharmId, 'details', id);
            if (cached) {
                setDetails(cached.details);
                setItems(cached.items || []);
                setLoading(false);
            } else if (isInitial) {
                // Only show loading spinner if we have NOTHING cached
                setLoading(true);
            }

            // 2. Fetch fresh data in background
            const endpoint = API_ENDPOINTS.PURCHASES.DETAIL(id);
            if (!endpoint) return;

            const res = await apiFetch(`${endpoint}?pharmacy_id=${pharmId}`);
            if (res.ok) {
                const data = await res.json();
                const resultDetails = Array.isArray(data) ? (data[0] || {}) : (data.details || data);
                
                let resultItems = [];
                if (Array.isArray(data)) {
                    resultItems = data;
                } else {
                    resultItems = data.items || data.itemsList || data.rows || data.products || data.invoice_items || data.order_items || data.data ||
                                  resultDetails?.items || resultDetails?.itemsList || resultDetails?.rows || resultDetails?.products || [];
                }
                
                setDetails(resultDetails);
                setItems(resultItems);
                
                // Update Vault for next time
                await PharmacyVault.set(pharmId, 'details', id, {
                    details: resultDetails,
                    items: resultItems
                });
            } else if (!cached) {
                setError('Failed to fetch details');
            }
        } catch (e) {
            if (!details) setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [id, details]);

    useEffect(() => {
        if (id) fetchDetails(true);
    }, [id]);

    return { details, items, loading, error, refresh: () => fetchDetails(false) };
};
