import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { cacheManager } from '../utils/cache-manager';
import { PharmacyVault } from '../utils/vault';
import { usePharmacyStore } from '../store/usePharmacyStore';
import { InvoiceRepository } from '../utils/InvoiceRepository';
import { DatabaseManager } from '../utils/database';
import { BackgroundSyncManager } from '../utils/BackgroundSyncManager';

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

    const sanitizeItem = useCallback((rawItem: any) => {
        if (!rawItem) return rawItem;
        
        // If already sanitized, return as is (id and amount are indicators)
        if (rawItem._isSanitized) return rawItem;

        // Gracefully handle `{ details, items }` payload from useInvoiceDetail
        const item = rawItem.details ? { ...rawItem.details, items: rawItem.items } : rawItem;

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

            // Ensure we don't leak data from previous pharmacy
            const globalState = usePharmacyStore.getState();
            if (globalState.activePharmacyId !== pharmId) {
                globalState.clearAll();
                globalState.setActivePharmacy(pharmId, ''); // Store it to avoid loop
            }

            let loadedFromCache = false;
            // 1. Instant Cache Load from SQLite or Vault
            if (pageNum === 1 && currentState.data.length === 0) {
                let localData = InvoiceRepository.getAll(pharmId, module, sortAscending);
                
                // Fallback to Vault if SQLite is dead or empty
                if (!localData || localData.length === 0) {
                    const vaultData = await PharmacyVault.get<any[]>(pharmId, module as any, 'list');
                    if (vaultData && Array.isArray(vaultData)) {
                        localData = vaultData;
                    }
                }

                if (localData && localData.length > 0) {
                    const mappedLocal = localData.map(sanitizeItem);
                    store.setListData(module, mappedLocal, 'replace');
                    loadedFromCache = true;
                    const cachedSync = await PharmacyVault.get(pharmId, 'sync', module);
                    if (cachedSync) store.setListLastUpdated(module, cachedSync);
                    store.setListLoading(module, false);
                } else if (!isBackground) {
                    store.setListLoading(module, true);
                }
            } else if (!isBackground) {
                store.setListLoading(module, true);
            }

            // 2. Fetch Fresh Data (Paginated)
            const sortDir = sortAscending ? 'asc' : 'desc';
            const fetchLimit = 1000;
            const res = await apiFetch(`${endpoint}?page=${pageNum}&limit=${fetchLimit}&pharmacy_id=${pharmId}&sort=${sortDir}`);
            
            if (requestTokenRef.current !== currentToken) return;

            if (res.ok) {
                const rawData = await res.json();
                if (Array.isArray(rawData) && rawData.length > 0) {
                    const mapped = rawData.map(sanitizeItem);

                    if (pageNum === 1) {
                        const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                        store.setListLastUpdated(module, now);
                        
                        // Save to SQLite asynchronously
                        InvoiceRepository.saveBatch(pharmId, module, mapped);
                        PharmacyVault.set(pharmId, module as any, 'list', mapped);
                        
                        // Start silent background sync for the rest of the pages
                        if (['purchases', 'sales', 'returns', 'cash'].includes(module)) {
                            BackgroundSyncManager.startListSync(pharmId, module, endpoint);
                        }
                        
                        if (currentState.data.length > 0 || loadedFromCache) {
                            store.setListData(module, mapped, 'prepend');
                        } else {
                            store.setListData(module, mapped, 'replace');
                        }
                        
                        // Update sync timestamp
                        await PharmacyVault.set(pharmId, 'sync', module, now);
                    } else {
                        store.setListData(module, mapped, 'append');
                    }
                    store.setListHasMore(module, rawData.length >= fetchLimit);
                } else {
                    store.setListHasMore(module, false);
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
        const globalState = usePharmacyStore.getState() as any;
        const currentState = globalState[module];
        if (!currentState.loading && currentState.hasMore) {
            store.incrementPage(module);
            const newPage = (usePharmacyStore.getState() as any)[module].page;
            fetchData(false, newPage, sortAscending);
        }
    }, [module, store, fetchData]);

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
