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
        console.log('[SyncManager] 🔄 Starting Deep Sync...');
        this.processQueue();
    }

    stop() {
        this.isRunning = false;
        console.log('[SyncManager] 🛑 Stopped Deep Sync');
    }

    private async updateNotification(db: any, isComplete = false) {
        try {
            if (Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo') {
                return; // Do not use native notifications in Expo Go
            }
            
            // Require notifee dynamically to avoid crashing in Expo Go where it might not be linked properly if used immediately
            const notifee = require('@notifee/react-native').default;
            const { AndroidImportance } = require('@notifee/react-native');

            const getCount = (query: string) => {
                if (!db) return 0;
                try {
                    const res = db.getAllSync(query) as {c: number}[];
                    return res[0]?.c || 0;
                } catch(e) {
                    return 0;
                }
            };

            const purchasesCompleted = getCount(`SELECT COUNT(*) as c FROM invoices WHERE module = 'purchases' AND raw_data LIKE '%"items":[%'`);
            const salesCompleted = getCount(`SELECT COUNT(*) as c FROM invoices WHERE module = 'sales' AND raw_data LIKE '%"items":[%'`);
            
            const purchasesTotal = getCount(`SELECT COUNT(*) as c FROM invoices WHERE module = 'purchases'`);
            const salesTotal = getCount(`SELECT COUNT(*) as c FROM invoices WHERE module = 'sales'`);
            
            const total = purchasesTotal + salesTotal;
            const completed = purchasesCompleted + salesCompleted;
            
            const isFinished = total > 0 && completed >= total;

            const channelId = await notifee.createChannel({
                id: 'sync_progress',
                name: 'Sync Progress',
                vibration: false,
                importance: AndroidImportance.LOW,
            });

            if (isComplete || isFinished) {
                await notifee.displayNotification({
                    id: 'deep_sync_progress',
                    title: '✅ اكتملت المزامنة بنجاح',
                    body: `تم تجهيز ${completed} فاتورة للعمل بدون إنترنت`,
                    android: {
                        channelId,
                        ongoing: false,
                        autoCancel: true,
                        progress: undefined,
                    },
                });
            } else {
                await notifee.displayNotification({
                    id: 'deep_sync_progress',
                    title: '🔄 جاري المزامنة للعمل بدون إنترنت',
                    body: `المتبقي: ${total - completed} فاتورة (${completed}/${total})`,
                    android: {
                        channelId,
                        ongoing: true,
                        autoCancel: false,
                        progress: {
                            max: total || 100,
                            current: completed,
                        },
                    },
                });
            }
        } catch (err) {
            console.log('[SyncManager] Failed to update notification', err);
        }
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
                    
                    let finalPayload: any = null;
                    if (currentData.details) {
                        currentData.items = items;
                        finalPayload = currentData;
                    } else {
                        finalPayload = {
                            details: currentData,
                            items: items
                        };
                    }
                    
                    InvoiceRepository.saveDetails(row.pharmacy_id, row.module, row.id, finalPayload);
                    // Also save to Vault for redundancy
                    const PharmacyVault = require('./vault').PharmacyVault;
                    PharmacyVault.set(row.pharmacy_id, 'details', row.id, finalPayload);
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
}

export const BackgroundSyncManager = new SyncManager();
