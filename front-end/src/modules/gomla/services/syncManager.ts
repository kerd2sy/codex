import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { updateGomlaInvoiceItem } from './gomlaService';

const SYNC_QUEUE_KEY = '@gomla_offline_sync_queue';
const FAILED_QUEUE_KEY = '@gomla_offline_failed_queue';

export interface SyncItem {
    id: string; // unique string id for the sync task
    itemId: string;
    prodId: string;
    batch: string;
    expiry: string;
    qty?: number;
    timestamp: number;
}

let isProcessing = false;

export const addToSyncQueue = async (itemId: string, prodId: string, batch: string, expiry: string, qty?: number) => {
    try {
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const queue: SyncItem[] = queueStr ? JSON.parse(queueStr) : [];
        
        // Remove older sync tasks for the same item to prevent double syncing old states
        const filteredQueue = queue.filter(item => item.itemId !== itemId);
        
        // If the item was previously in the failed queue, remove it since we are retrying
        const failedStr = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
        if (failedStr) {
            const failedQueue: SyncItem[] = JSON.parse(failedStr);
            const filteredFailed = failedQueue.filter(item => item.itemId !== itemId);
            await AsyncStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(filteredFailed));
        }
        
        const newTask: SyncItem = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
            itemId,
            prodId,
            batch,
            expiry,
            qty,
            timestamp: Date.now(),
        };
        
        filteredQueue.push(newTask);
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filteredQueue));
    } catch (e) {
        console.error("Failed to add to sync queue:", e);
    }
};

export const processSyncQueue = async () => {
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (!queueStr) {
            isProcessing = false;
            return;
        }
        
        let queue: SyncItem[] = JSON.parse(queueStr);
        if (queue.length === 0) {
            isProcessing = false;
            return;
        }

        const completedTaskIds: string[] = [];

        for (const task of queue) {
            try {
                // Attempt to update on server
                await updateGomlaInvoiceItem(task.itemId, task.prodId, task.batch, task.expiry, task.qty);
                // Success: mark as completed
                completedTaskIds.push(task.id);
            } catch (err: any) {
                console.error("Sync failed for item", task.itemId, err);
                
                // If it's a server rejection (4xx status code), alert the user and move the item to the failed queue
                if (err.status && err.status >= 400 && err.status < 500) {
                    Alert.alert(
                        "خطأ من السيرفر",
                        `تم رفض الصنف (تشغيلة: ${task.batch}) من السيرفر، يرجى المراجعة:\n${err.message || 'خطأ غير معروف'}`
                    );
                    
                    // Move to failed queue
                    const failedStr = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
                    const failedQueue: SyncItem[] = failedStr ? JSON.parse(failedStr) : [];
                    failedQueue.push(task);
                    await AsyncStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(failedQueue));

                    // Mark as completed so it's removed from main queue
                    completedTaskIds.push(task.id);
                    continue; // Process next item
                }
                
                // If it's a network error (no status) or 5xx server error, break and try again later
                break;
            }
        }

        // Save back the remaining queue by re-reading latest state (prevents race condition data loss)
        if (completedTaskIds.length > 0) {
            const latestQueueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
            if (latestQueueStr) {
                let latestQueue: SyncItem[] = JSON.parse(latestQueueStr);
                latestQueue = latestQueue.filter(t => !completedTaskIds.includes(t.id));
                await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(latestQueue));
            }
        }
    } catch (e) {
        console.error("Error processing sync queue:", e);
    } finally {
        isProcessing = false;
    }
};

export const getQueueLength = async (): Promise<number> => {
    try {
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (!queueStr) return 0;
        const queue: SyncItem[] = JSON.parse(queueStr);
        return queue.length;
    } catch {
        return 0;
    }
};

export const getFailedQueueLength = async (): Promise<number> => {
    try {
        const queueStr = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
        if (!queueStr) return 0;
        const queue: SyncItem[] = JSON.parse(queueStr);
        return queue.length;
    } catch {
        return 0;
    }
};

export const getFailedQueueItems = async (): Promise<string[]> => {
    try {
        const queueStr = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
        if (!queueStr) return [];
        const queue: SyncItem[] = JSON.parse(queueStr);
        return queue.map(t => t.itemId);
    } catch {
        return [];
    }
};
