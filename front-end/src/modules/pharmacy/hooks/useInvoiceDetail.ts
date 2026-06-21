import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { InvoiceRepository } from '../utils/InvoiceRepository';
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

    const moduleMap: Record<InvoiceType, string> = {
        'purchase': 'purchases',
        'sales': 'sales',
        'return': 'returns'
    };
    const moduleName = moduleMap[type] || 'purchases';

    const fetchDetails = useCallback(async (isInitial = false, forceRefresh = false) => {
        try {
            const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id');
            const pharmId = activePharmId || '0';
            
            // 1. Instant load from SQLite (if it exists from the mass sync)
            let cached = InvoiceRepository.getById(pharmId, moduleName, id);
            
            // Fallback to Vault if SQLite is dead
            if (!cached) {
                const vaultCached = await PharmacyVault.get<any>(pharmId, 'details' as any, id);
                if (vaultCached) {
                    cached = vaultCached;
                }
            }

            let hasValidItems = false;
            
            if (cached && (cached.items || cached.details || Array.isArray(cached))) {
                // If it already has items structure mapped
                if (cached.items) {
                    setDetails(cached.details || cached);
                    setItems(cached.items || []);
                    if (cached.items.length > 0) hasValidItems = true;
                } else if (Array.isArray(cached)) {
                    setDetails(cached[0] || {});
                    setItems(cached);
                    if (cached.length > 0) hasValidItems = true;
                } else {
                    // Fallback just in case
                    setDetails(cached.details || cached);
                    if (cached.itemsList) {
                        setItems(cached.itemsList);
                        if (cached.itemsList.length > 0) hasValidItems = true;
                    }
                }
                setLoading(false);
            } else if (cached) {
                setDetails(cached);
                setItems(cached.items || cached.itemsList || []);
                if ((cached.items && cached.items.length > 0) || (cached.itemsList && cached.itemsList.length > 0)) hasValidItems = true;
                if (isInitial && !hasValidItems) setLoading(true);
            } else if (isInitial) {
                setLoading(true);
            }
            
            // We have local data, so we don't need to block the UI (loading = false).
            // But we will CONTINUE to fetch from API in the background to get fresh fields (like notes).
            if (hasValidItems && !forceRefresh) {
                // Just silently fetch without showing loading spinners again
            }

            // 2. Fetch fresh details from API
            const endpoint = API_ENDPOINTS.PURCHASES.DETAIL(id);
            if (!endpoint) return;

            const res = await apiFetch(`${endpoint}?pharmacy_id=${pharmId}&_t=${Date.now()}`);
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
                
                console.log("DEBUG INVOICE FETCH:", id, "Notes:", resultDetails?.notes, "Full Details:", resultDetails);
                
                const finalPayload = {
                    details: resultDetails,
                    items: resultItems
                };
                
                // Save fully detailed payload back into SQLite
                InvoiceRepository.saveDetails(pharmId, moduleName, id, finalPayload);
                
                // ALSO save to Vault for redundancy (works even if SQLite crashes)
                await PharmacyVault.set(pharmId, 'details' as any, id, finalPayload);
            } else {
                const text = await res.text();
                console.warn(`[InvoiceDetail] Fetch Failed! Status: ${res.status}. Body: ${text}`);
                if (!cached) setError('Failed to fetch details');
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

    return { details, items, loading, error, refresh: () => fetchDetails(false, true) };
};
