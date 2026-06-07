import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const DatabaseManager = {
    init: () => {
        try {
            if (db) {
                try { db.closeSync(); } catch (e) {}
            }
            db = SQLite.openDatabaseSync('pharmacy_offline.db');
            
            db.execSync(`
                CREATE TABLE IF NOT EXISTS invoices (
                    id TEXT,
                    pharmacy_id TEXT NOT NULL,
                    module TEXT NOT NULL,
                    type TEXT,
                    date TEXT,
                    time TEXT,
                    title TEXT,
                    amount REAL,
                    author TEXT,
                    description TEXT,
                    raw_data TEXT,
                    updated_at INTEGER,
                    PRIMARY KEY (id, pharmacy_id, module)
                );
                CREATE INDEX IF NOT EXISTS idx_invoices_pharm_module ON invoices(pharmacy_id, module);
                CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date DESC);
            `);
            console.log('[Database] ✅ SQLite Initialized');
        } catch (error) {
            console.error('[Database] ❌ Init Error:', error);
            db = null; // Important to avoid returning a broken instance
        }
    },

    getDb: () => {
        if (!db) {
            DatabaseManager.init();
        } else {
            // Test if DB is alive, if it throws NullPointerException, re-init
            try {
                db.execSync('SELECT 1');
            } catch (e) {
                console.log('[Database] ⚠️ DB is dead, re-initializing...');
                try { db.closeSync(); } catch (_) {}
                db = null;
                DatabaseManager.init();
            }
        }
        return db;
    },
    
    close: () => {
        if (db) {
            try { db.closeSync(); } catch(e) {}
            db = null;
        }
    }
};
