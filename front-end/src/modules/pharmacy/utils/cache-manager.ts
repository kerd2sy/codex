/**
 * Centralized registry for financial module memory caches.
 * This ensures strict data isolation and permits easy purging upon logout.
 */

export interface CacheEntry<T> {
  data: T;
  sync: string | null;
  timestamp?: number;
  balance?: any;
  pName?: string;
}

// Namespaced Memory Caches
const caches = {
  dashboard: {} as Record<string, { balance: any; products: any[]; lastUpdated: number | null }>,
  sales: {} as Record<string, CacheEntry<any[]>>,
  purchases: {} as Record<string, CacheEntry<any[]>>,
  returns: {} as Record<string, CacheEntry<any[]>>,
  cash: {} as Record<string, CacheEntry<any[]>>,
  statement: {} as Record<string, CacheEntry<any[]>>, // Key will be pharmId or pharmId_period
};

export const cacheManager = {
  getDashboard: (pharmId: string) => caches.dashboard[pharmId],
  setDashboard: (pharmId: string, data: { balance: any; products: any[]; lastUpdated: number | null }) => {
    caches.dashboard[pharmId] = data;
  },

  getSales: (pharmId: string) => caches.sales[pharmId],
  setSales: (pharmId: string, entry: CacheEntry<any[]>) => {
    caches.sales[pharmId] = entry;
  },

  getPurchases: (pharmId: string) => caches.purchases[pharmId],
  setPurchases: (pharmId: string, entry: CacheEntry<any[]>) => {
    caches.purchases[pharmId] = entry;
  },

  getReturns: (pharmId: string) => caches.returns[pharmId],
  setReturns: (pharmId: string, entry: CacheEntry<any[]>) => {
    caches.returns[pharmId] = entry;
  },

  getCash: (pharmId: string) => caches.cash[pharmId],
  setCash: (pharmId: string, entry: CacheEntry<any[]>) => {
    caches.cash[pharmId] = entry;
  },

  getStatement: (pharmId: string, period?: number) => {
    const key = period ? `${pharmId}_p${period}` : pharmId;
    return caches.statement[key];
  },
  setStatement: (pharmId: string, entry: CacheEntry<any[]>, period?: number) => {
    const key = period ? `${pharmId}_p${period}` : pharmId;
    caches.statement[key] = entry;
  },

  /**
   * PURGE ALL MEMORY CACHES.
   * Call this on logout to prevent data leakage between different user sessions.
   */
  clearAllMemoryCaches: () => {
    console.log('[CacheManager] Purging all memory caches for session isolation');
    caches.dashboard = {};
    caches.sales = {};
    caches.purchases = {};
    caches.returns = {};
    caches.cash = {};
    caches.statement = {};
  }
};
