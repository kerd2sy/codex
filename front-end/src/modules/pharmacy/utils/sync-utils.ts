import * as Network from 'expo-network';
import { InteractionManager } from 'react-native';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { PharmacyVault } from './vault';
import { storage } from '@/utils/storage';

/**
 * Smart Sync Manager (Turbo Optimized)
 * Responsible for aggressive background data synchronization.
 */

const SYNC_CONFIG = {
    INITIAL_LIMIT: 20,
    DEEP_LIMIT: 50,
    MAX_HISTORY: 1000,
    BATCH_DELAY_WIFI: 100, // 100ms between requests on WiFi (Fast but safe)
    BATCH_DELAY_CELLULAR: 2000, // 2s delay on 4G/5G (Battery & Data saver)
    CONCURRENT_DETAIL_FETCH: 3, // Fetch 3 details at once to speed up
};

type SyncStatus = Record<string, boolean>;
let currentSyncStatus: SyncStatus = {
    purchase: false,
    sales: false,
    return: false,
    cash: false
};
let syncSubscribers: ((status: SyncStatus) => void)[] = [];

export const SyncController = {
    subscribe: (callback: (status: SyncStatus) => void) => {
        syncSubscribers.push(callback);
        callback(currentSyncStatus);
        return () => {
            syncSubscribers = syncSubscribers.filter(s => s !== callback);
        };
    },
    setStatus: (module: string, isSyncing: boolean) => {
        currentSyncStatus = { ...currentSyncStatus, [module]: isSyncing };
        syncSubscribers.forEach(s => s(currentSyncStatus));
    },
    resetSync: () => {
        currentSyncStatus = { purchase: false, sales: false, return: false, cash: false };
        syncSubscribers.forEach(s => s(currentSyncStatus));
    }
};

const isUserLoggedIn = async () => {
    const token = await storage.getItem('access_token');
    const loggedOut = await storage.getItem('user_has_logged_out');
    return !!token && loggedOut !== 'true';
};

/**
 * Main Sync Entry Point: Decides strategy based on network
 */
export const startSmartSync = async (pharmacyId: string) => {
    if (!pharmacyId || pharmacyId === '0') return;
    
    const netState = await Network.getNetworkStateAsync();
    const isWifi = netState.type === Network.NetworkStateType.WIFI;

    console.log(`[Sync] 📡 Network detected: ${isWifi ? 'WIFI (Turbo)' : 'CELLULAR (Eco)'}`);

    // 1. Always do a quick full sync first
    await performFullSync(pharmacyId, isWifi);

    // 2. If on WiFi, immediately start a deep background sync
    if (isWifi) {
        performDeepSync(pharmacyId);
    }
};

export const performFullSync = async (pharmacyId: string, isTurbo: boolean = false) => {
    if (!pharmacyId || pharmacyId === '0') return;

    const startTime = Date.now();
    try {
        if (!(await isUserLoggedIn())) return;
        
        const endpoints = [
            { module: 'purchases', url: API_ENDPOINTS.PURCHASES.LIST, syncKey: 'purchase' },
            { module: 'sales', url: API_ENDPOINTS.ORDERS.SALES, syncKey: 'sales' },
            { module: 'returns', url: API_ENDPOINTS.PURCHASES.RETURNS, syncKey: 'return' },
            { module: 'cash', url: API_ENDPOINTS.PURCHASES.CASH, syncKey: 'cash' },
            { module: 'orders', url: API_ENDPOINTS.ORDERS.LIST, syncKey: 'purchase' }
        ];

        for (const target of endpoints) {
            if (!(await isUserLoggedIn())) return;
            SyncController.setStatus(target.syncKey, true);

            await InteractionManager.runAfterInteractions(async () => {
                const limit = isTurbo ? SYNC_CONFIG.INITIAL_LIMIT : 10;
                const res = await apiFetch(`${target.url}?page=1&limit=${limit}&pharmacy_id=${pharmacyId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        await PharmacyVault.set(pharmacyId, target.module as any, 'list', data);
                        // Fast fetch first few details
                        const detailPromises = data.slice(0, 5).map(item => fetchInvoiceDetailInBackground(pharmacyId, item.id));
                        await Promise.all(detailPromises);
                    }
                }
                SyncController.setStatus(target.syncKey, false);
            });

            // Small breather to keep UI responsive
            await new Promise(r => setTimeout(r, isTurbo ? 50 : 200));
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[Sync] ✅ Full Sync Complete in ${duration.toFixed(2)}s`);
    } catch (e) {
        console.error('[Sync] Initial Sync Failed', e);
    }
};

export const performDeepSync = async (pharmacyId: string) => {
    if (!pharmacyId || pharmacyId === '0') return;

    const startTime = Date.now();
    try {
        if (!(await isUserLoggedIn())) return;
        
        const netState = await Network.getNetworkStateAsync();
        const isWifi = netState.type === Network.NetworkStateType.WIFI;
        const delay = isWifi ? SYNC_CONFIG.BATCH_DELAY_WIFI : SYNC_CONFIG.BATCH_DELAY_CELLULAR;

        const modules = [
            { module: 'purchases', url: API_ENDPOINTS.PURCHASES.LIST, syncKey: 'purchase' },
            { module: 'returns', url: API_ENDPOINTS.PURCHASES.RETURNS, syncKey: 'return' },
        ];

        for (const target of modules) {
            SyncController.setStatus(target.syncKey, true);
            // On WiFi fetch more history (up to 10 pages)
            const maxPages = isWifi ? 10 : 3;

            for (let page = 1; page <= maxPages; page++) {
                if (!(await isUserLoggedIn())) break;

                await InteractionManager.runAfterInteractions(async () => {
                    const res = await apiFetch(`${target.url}?page=${page}&limit=20&pharmacy_id=${pharmacyId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            const current = await PharmacyVault.get<any[]>(pharmacyId, target.module as any, 'list') || [];
                            const newIds = new Set(data.map(i => i.id));
                            const merged = [...data, ...current.filter(i => !newIds.has(i.id))].slice(0, SYNC_CONFIG.MAX_HISTORY);
                            await PharmacyVault.set(pharmacyId, target.module as any, 'list', merged);
                            
                            // Background fetch ALL details on WiFi
                            if (isWifi) {
                                for (let i = 0; i < data.length; i += SYNC_CONFIG.CONCURRENT_DETAIL_FETCH) {
                                    const batch = data.slice(i, i + SYNC_CONFIG.CONCURRENT_DETAIL_FETCH);
                                    await Promise.all(batch.map(item => fetchInvoiceDetailInBackground(pharmacyId, item.id)));
                                }
                            }
                        }
                    }
                });
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            SyncController.setStatus(target.syncKey, false);
        }
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[Sync] ✨ Deep Sync Finished in ${duration.toFixed(2)}s`);
    } catch (e) {}
};

const fetchInvoiceDetailInBackground = async (pharmacyId: string, invoiceId: string) => {
    try {
        if (!(await isUserLoggedIn())) return;

        // Check if already in vault to avoid redundant server pressure
        const cached = await PharmacyVault.get(pharmacyId, 'details', invoiceId);
        if (cached) return;

        await InteractionManager.runAfterInteractions(async () => {
            const res = await apiFetch(`${API_ENDPOINTS.PURCHASES.DETAIL(invoiceId)}?pharmacy_id=${pharmacyId}`);
            if (res.ok) {
                const data = await res.json();
                const details = Array.isArray(data) ? (data[0] || {}) : (data.details || data);
                let items = Array.isArray(data) ? data : (data.items || []);
                await PharmacyVault.set(pharmacyId, 'details', invoiceId, { details, items });
            }
        });
    } catch (e) {}
};
