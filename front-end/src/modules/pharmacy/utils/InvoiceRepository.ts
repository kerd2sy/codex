import { DatabaseManager } from './database';

export interface InvoiceRecord {
    id: string;
    pharmacy_id: string;
    module: string;
    type?: string;
    date: string;
    time?: string;
    title: string;
    amount: number;
    author?: string;
    description?: string;
    raw_data: string;
    updated_at: number;
}

export const InvoiceRepository = {
    saveBatch: (pharmacyId: string, module: string, items: any[]) => {
        const db = DatabaseManager.getDb();
        if (!db) return;
        const now = Date.now();
        
        try {
            db.withTransactionSync(() => {
                const statement = db.prepareSync(`
                    INSERT INTO invoices 
                    (id, pharmacy_id, module, type, date, time, title, amount, author, description, raw_data, updated_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id, pharmacy_id, module) DO UPDATE SET 
                        type = excluded.type,
                        date = excluded.date,
                        time = excluded.time,
                        title = excluded.title,
                        amount = excluded.amount,
                        author = excluded.author,
                        description = excluded.description,
                        raw_data = json_patch(invoices.raw_data, excluded.raw_data),
                        updated_at = excluded.updated_at
                `);
                
                for (const item of items) {
                    statement.executeSync([
                        String(item.id || ''),
                        String(pharmacyId || '0'),
                        String(module || ''),
                        String(item.type || ''),
                        String(item.date || '---'),
                        String(item.time || ''),
                        String(item.title || item.pharmacy_name || item.supplier || 'غير معروف'),
                        Number(item.value || item.total || item.amount || 0),
                        String(item.author || item.writer || ''),
                        String(item.description || ''),
                        JSON.stringify(item || {}),
                        now
                    ]);
                }
                
                statement.finalizeSync();
            });
            console.log(`[DB] 💾 Saved ${items.length} invoices to SQLite [Module:${module}]`);
        } catch (e) {
            console.error('[DB] ❌ SaveBatch Error:', e);
        }
    },
    
    saveDetails: (pharmacyId: string, module: string, id: string, rawData: any) => {
        const db = DatabaseManager.getDb();
        if (!db) return;
        try {
            db.runSync(`
                UPDATE invoices SET raw_data = ?, updated_at = ?
                WHERE id = ? AND pharmacy_id = ? AND module = ?
            `, [
                JSON.stringify(rawData || {}), 
                Date.now(), 
                String(id || ''), 
                String(pharmacyId || '0'), 
                String(module || '')
            ]);
            console.log(`[DB] 💾 Updated details for invoice ${id}`);
        } catch (e) {
            console.error('[DB] ❌ SaveDetails Error:', e);
        }
    },

    getAll: (pharmacyId: string, module: string, sortAscending: boolean = false): any[] => {
        const db = DatabaseManager.getDb();
        if (!db) return [];
        try {
            const sortDir = sortAscending ? 'ASC' : 'DESC';
            const rows = db.getAllSync(`
                SELECT raw_data FROM invoices 
                WHERE pharmacy_id = ? AND module = ? 
                ORDER BY CAST(id AS INTEGER) ${sortDir}
            `, [String(pharmacyId || '0'), String(module || '')]) as {raw_data: string}[];
            
            return rows.map(r => JSON.parse(r.raw_data));
        } catch (e) {
            console.error('[DB] ❌ GetAll Error:', e);
            return [];
        }
    },
    
    getById: (pharmacyId: string, module: string, id: string): any | null => {
        const db = DatabaseManager.getDb();
        if (!db) return null;
        try {
            const row = db.getFirstSync(`
                SELECT raw_data FROM invoices 
                WHERE pharmacy_id = ? AND module = ? AND id = ?
            `, [String(pharmacyId || '0'), String(module || ''), String(id || '')]) as {raw_data: string} | null;
            
            if (row) return JSON.parse(row.raw_data);
            return null;
        } catch (e) {
            console.error('[DB] ❌ GetById Error:', e);
            return null;
        }
    },

    clearAll: (pharmacyId: string) => {
        const db = DatabaseManager.getDb();
        if (!db) return;
        try {
            db.runSync('DELETE FROM invoices WHERE pharmacy_id = ?', [pharmacyId]);
        } catch(e) {}
    }
};
