import { DatabaseManager } from './database';
import { InvoiceRepository } from './InvoiceRepository';
import { apiFetch } from '@/api/api-client';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

const BATCH_SIZE = 50;
const DELAY_MS = 3000;

class SyncManager {
    private isRunning = false;
    private hasCleanedUp = false;
    private unsubscribeNetInfo: (() => void) | null = null;
    private listSyncRunning: Record<string, boolean> = {};

    constructor() {
        // Auto-resume when internet comes back
        this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
            if (state.isConnected && !this.isRunning) {
                console.log('[SyncManager] 🌐 Internet reconnected. Resuming sync...');
                this.start();
            }
        });
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[SyncManager] 🛑 Deep Sync is disabled to prevent server overload.');
        // this.processQueue();
    }

    stop() {
        this.isRunning = false;
        console.log('[SyncManager] 🛑 Stopped Deep Sync');
    }

    private async updateNotification(db: any, isComplete = false) {
        // Sync progress notifications removed at user request
    }

    private async processQueue() {
        if (!this.isRunning) return;

        try {
            // Check network connectivity before hitting the API
            const state = await NetInfo.fetch();
            if (!state.isConnected) {
                console.log('[SyncManager] ❌ No internet connection. Pausing sync.');
                this.isRunning = false;
                return;
            }

            const db = DatabaseManager.getDb();
            if (!db) {
                console.log('[SyncManager] ⚠️ Database not ready. Pausing sync.');
                this.isRunning = false;
                return;
            }
            this.updateNotification(db);

            // Clean up corrupted empty items from previous sync bug ONCE per session
            if (!this.hasCleanedUp) {
                try {
                    db.execSync(`
                        UPDATE invoices 
                        SET raw_data = json_remove(raw_data, '$.items') 
                        WHERE json_array_length(json_extract(raw_data, '$.items')) = 0 
                        AND module IN ('purchases', 'sales', 'returns')
                    `);
                    this.hasCleanedUp = true;
                } catch (e) {
                    console.log('[SyncManager] Note: json cleanup failed', e);
                }
            }

            // Find invoices that don't have items downloaded yet
            const rows = db.getAllSync(`
                SELECT id, pharmacy_id, module FROM invoices 
                WHERE raw_data NOT LIKE '%"items":[%' 
                AND module IN ('purchases', 'sales', 'returns')
                ORDER BY rowid ASC
                LIMIT ?
            `, [BATCH_SIZE]) as {id: string, pharmacy_id: string, module: string}[];

            if (rows.length === 0) {
                console.log('[SyncManager] ✅ Deep Sync Complete! All items are saved locally.');
                this.isRunning = false;
                this.updateNotification(db, true);
                return;
            }

            const ids = rows.map(r => String(r.id));
            console.log(`[SyncManager] 📦 Syncing batch of ${ids.length} invoices...`);

            // Fetch details for this batch
            const res = await apiFetch(`/api/v1/purchases/details/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            
            const responseData = await res.json();
            if (!res.ok) {
                throw new Error(`Batch fetch failed: ${responseData?.detail || res.status}`);
            }

            // Update SQLite
            for (const row of rows) {
                const currentData = InvoiceRepository.getById(row.pharmacy_id, row.module, row.id);
                if (currentData) {
                    const numericId = String(row.id).split('_').pop() || '';
                    const items = responseData[row.id] || responseData[numericId] || [];
                    
                    currentData.items = items;
                    
                    InvoiceRepository.saveDetails(row.pharmacy_id, row.module, row.id, currentData);
                    // Also save to Vault for redundancy
                    const PharmacyVault = require('./vault').PharmacyVault;
                    PharmacyVault.set(row.pharmacy_id, 'details', row.id, currentData);
                }
            }

            // Continue queue after a short delay to not overload the server
            setTimeout(() => {
                this.processQueue();
            }, DELAY_MS);

        } catch (error) {
            console.error('[SyncManager] ❌ Sync Error:', error);
            
            // If the database was closed natively (e.g. during a fast refresh / hot reload), stop the loop immediately
            if (String(error).includes('NullPointerException') || String(error).includes('closed')) {
                console.log('[SyncManager] 🛑 Database closed. Stopping sync to prevent crash loops.');
                this.isRunning = false;
                return;
            }

            // Wait longer on error before retrying
            setTimeout(() => {
                this.processQueue();
            }, DELAY_MS * 3);
        }
    }

    async prefetchFirstPage(pharmId: string, module: string, endpoint: string) {
        // Only prefetch if we have no data
        const localData = InvoiceRepository.getAll(pharmId, module, false);
        if (localData && localData.length > 0) return;

        try {
            const res = await apiFetch(`${endpoint}?page=1&limit=1000&pharmacy_id=${pharmId}&sort=desc`);
            if (res.ok) {
                const rawData = await res.json();
                if (Array.isArray(rawData) && rawData.length > 0) {
                    InvoiceRepository.saveBatch(pharmId, module, rawData);
                    console.log(`[SyncManager] 🚀 Prefetched page 1 for ${module} (Pharm ${pharmId})`);
                }
            }
        } catch (error) {
            // Silently ignore prefetch errors
        }
    }

    async startListSync(pharmId: string, module: string, endpoint: string) {
        const key = `${pharmId}_${module}`;
        if (this.listSyncRunning[key]) return;
        this.listSyncRunning[key] = true;
        console.log(`[SyncManager] 🔄 Starting silent background list sync for ${module}...`);
        
        // Start from page 2, since page 1 is fetched by the UI
        this.processListSync(pharmId, module, endpoint, 2);
    }

    private async processListSync(pharmId: string, module: string, endpoint: string, page: number) {
        const key = `${pharmId}_${module}`;
        if (!this.listSyncRunning[key]) return;

        try {
            const state = await NetInfo.fetch();
            if (!state.isConnected) {
                this.listSyncRunning[key] = false;
                return;
            }

            const res = await apiFetch(`${endpoint}?page=${page}&limit=1000&pharmacy_id=${pharmId}&sort=desc`);
            if (res.ok) {
                const rawData = await res.json();
                if (Array.isArray(rawData) && rawData.length > 0) {
                    // Save raw data to SQLite (no sanitizeItem needed for SQLite)
                    InvoiceRepository.saveBatch(pharmId, module, rawData);
                    
                    // Fetch next page after a short delay
                    setTimeout(() => {
                        this.processListSync(pharmId, module, endpoint, page + 1);
                    }, DELAY_MS);
                } else {
                    console.log(`[SyncManager] ✅ Silent list sync complete for ${module}.`);
                    this.listSyncRunning[key] = false;
                }
            } else {
                this.listSyncRunning[key] = false;
            }
        } catch (error) {
            console.error(`[SyncManager] ❌ List Sync Error for ${module}:`, error);
            // Retry on error
            setTimeout(() => {
                this.processListSync(pharmId, module, endpoint, page);
            }, DELAY_MS * 3);
        }
    }
}

export const BackgroundSyncManager = new SyncManager();
