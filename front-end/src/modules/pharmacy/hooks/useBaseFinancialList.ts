import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { cacheManager } from '../utils/cache-manager';
import { PharmacyVault } from '../utils/vault';
import { usePharmacyStore } from '../store/usePharmacyStore';

export type FinancialModule = 'purchases' | 'sales' | 'returns' | 'cash' | 'orders';

interface UseBaseListOptions {
    module: FinancialModule;
    endpoint: string;
}

export const useBaseFinancialList = ({ module, endpoint }: UseBaseListOptions) => {
    const store = usePharmacyStore();
    const state = store[module as keyof typeof store] as any || { data: [], loading: true };
    const requestTokenRef = useRef(0);
    const stateRef = useRef(state);

    // Keep stateRef in sync to avoid dependency loops
    stateRef.current = state;

    const sanitizeItem = useCallback((item: any) => {
        if (!item) return item;
        
        // If already sanitized, return as is (id and amount are indicators)
        if (item._isSanitized) return item;

        if (module === 'cash') {
            const isNullOrEmpty = (val: any) => val === null || val === undefined || val === 'null' || val === 'undefined';
            const isSanitizedType = item.type === 'in' || item.type === 'out';
            
            return {
                id: String(item.id || ''),
                type: isSanitizedType ? item.type : (item.type === 'RECEIPT' || item.type === 'in' ? 'in' : 'out'),
                date: isNullOrEmpty(item.date) ? '---' : item.date,
                time: isNullOrEmpty(item.time) ? '' : item.time,
                title: isNullOrEmpty(item.title) || isNullOrEmpty(item.pharmacy_name) 
                    ? (item.type === 'RECEIPT' || item.type === 'in' ? 'سند دفع نقدية' : 'سند استلام نقدية') 
                    : (item.pharmacy_name || item.title),
                amount: isNaN(Number(item.value || item.total || item.amount)) ? 0 : Number(item.value || item.total || item.amount),
                author: isNullOrEmpty(item.author) || isNullOrEmpty(item.writer) ? 'غير معروف' : (item.writer || item.author),
                description: isNullOrEmpty(item.description) ? '' : item.description,
                _isSanitized: true
            };
        }

        if (module === 'orders') {
            return {
                ...item,
                id: String(item.id || ''),
                amount: isNaN(Number(item.price || item.total || item.amount)) ? 0 : Number(item.price || item.total || item.amount),
                date: item.date || '---',
                time: item.time || '',
                title: item.supplier || item.pharmacy_name || 'غير معروف',
                currentStep: item.currentStep || 1,
                _isSanitized: true
            };
        }
        
        return {
            ...item,
            id: String(item.id || ''),
            amount: isNaN(Number(item.price || item.total || item.amount)) ? 0 : Number(item.price || item.total || item.amount),
            date: item.date || '---',
            time: item.time || '',
            title: item.pharmacy_name || item.supplier || 'غير معروف',
            _isSanitized: true
        };
    }, [module]);

    const fetchData = useCallback(async (isBackground = false, pageNum = 1, sortAscending = false) => {
        const currentToken = ++requestTokenRef.current;
        const currentState = stateRef.current;

        try {
            const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id');
            const pharmId = activePharmId || '0';
            
            if (pharmId === '0') {
                store.setListLoading(module, false);
                return;
            }

            // 1. Instant Cache Load
            if (pageNum === 1 && currentState.data.length === 0) {
                const cached = await PharmacyVault.get(pharmId, module, 'list');
                if (cached && Array.isArray(cached) && cached.length > 0) {
                    const sanitized = cached.map(sanitizeItem);
                    store.setListData(module, sanitized, 'replace');
                    const cachedSync = await PharmacyVault.get(pharmId, 'sync', module);
                    if (cachedSync) store.setListLastUpdated(module, cachedSync);
                    store.setListLoading(module, false);
                } else if (!isBackground) {
                    store.setListLoading(module, true);
                }
            }

            // 2. Fetch Fresh Data
            const sortDir = sortAscending ? 'asc' : 'desc';
            const res = await apiFetch(`${endpoint}?page=${pageNum}&limit=20&pharmacy_id=${pharmId}&sort=${sortDir}`);
            
            if (requestTokenRef.current !== currentToken) return;

            if (res.ok) {
                const rawData = await res.json();
                if (Array.isArray(rawData) && rawData.length > 0) {
                    const mapped = rawData.map(sanitizeItem);

                    if (pageNum === 1) {
                        const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                        store.setListLastUpdated(module, now);
                        
                        // Smart Merge: Don't just replace, merge with what we have from Vault
                        const currentData = currentState.data;
                        const newIds = new Set(mapped.map((i: any) => i.id));
                        const mergedData = [...mapped, ...currentData.filter((i: any) => !newIds.has(i.id))].slice(0, 500);
                        
                        store.setListData(module, mergedData, 'replace');
                        
                        // Update Persist Storage
                        const currentVault = await PharmacyVault.get(pharmId, module, 'list') || [];
                        const vaultIds = new Set(mapped.map((i: any) => i.id));
                        const mergedVault = [...mapped, ...currentVault.filter((i: any) => !vaultIds.has(String(i.id)))].slice(0, 100);
                        await PharmacyVault.set(pharmId, module, 'list', mergedVault);
                        await PharmacyVault.set(pharmId, 'sync', module, now);
                    } else {
                        store.setListData(module, mapped, 'append');
                    }
                    // If we have more than 20 items total in our local store, we have "more" to show
                    const totalLoaded = (store[module] as any).data.length;
                    store.setListHasMore(module, (mapped.length === 20 || totalLoaded > 20) && totalLoaded < 500);
                }
            }
        } catch (e) {
            console.error(`useBaseFinancialList[${module}] Fetch Error:`, e);
        } finally {
            if (requestTokenRef.current === currentToken) {
                store.setListLoading(module, false);
                store.setListRefreshing(module, false);
            }
        }
    }, [module, endpoint, sanitizeItem, store.setListData, store.setListLoading, store.setListLastUpdated, store.setListHasMore, store.setListRefreshing]);

    const loadMore = useCallback((sortAscending: boolean) => {
        const currentState = stateRef.current;
        if (!currentState.hasMore || currentState.loading) return;
        if (currentState.data.length > (currentState.page * 20)) {
            store.incrementPage(module);
            return;
        }
        store.incrementPage(module);
        fetchData(false, currentState.page + 1, sortAscending);
    }, [module, fetchData, store.incrementPage]);

    return {
        data: state.data,
        loading: state.loading,
        refreshing: state.refreshing,
        hasMore: state.hasMore,
        lastUpdated: state.lastUpdated,
        page: state.page,
        fetchData,
        loadMore,
        setRefreshing: (val: boolean) => store.setListRefreshing(module, val),
        resetPage: () => store.resetPage(module)
    };
};
