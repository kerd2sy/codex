import { create } from 'zustand';

interface FinancialItem {
  id: string;
  date: string;
  time: string;
  total: number;
  [key: string]: any;
}

interface ListState {
  data: FinancialItem[];
  page: number;
  hasMore: boolean;
  lastUpdated: string | null;
  loading: boolean;
  refreshing: boolean;
}

const initialListState: ListState = {
  data: [],
  page: 1,
  hasMore: true,
  lastUpdated: null,
  loading: true,
  refreshing: false,
};

interface PharmacyState {
  activePharmacyId: string;
  activePharmacyName: string;
  purchases: ListState;
  sales: ListState;
  returns: ListState;
  cash: ListState;
  orders: ListState;
  
  // Actions
  setActivePharmacy: (id: string, name: string) => void;
  setListData: (module: keyof PharmacyState & ('purchases' | 'sales' | 'returns' | 'cash' | 'orders'), data: FinancialItem[], mode?: 'replace' | 'append' | 'prepend') => void;
  setListLoading: (module: keyof PharmacyState & ('purchases' | 'sales' | 'returns' | 'cash' | 'orders'), loading: boolean) => void;
  setListRefreshing: (module: keyof PharmacyState & ('purchases' | 'sales' | 'returns' | 'cash' | 'orders'), refreshing: boolean) => void;
  setListLastUpdated: (module: keyof PharmacyState & ('purchases' | 'sales' | 'returns' | 'cash' | 'orders'), timestamp: string | null) => void;
  setListHasMore: (module: keyof PharmacyState & ('purchases' | 'sales' | 'returns' | 'cash' | 'orders'), hasMore: boolean) => void;
  incrementPage: (module: keyof PharmacyState & ('purchases' | 'sales' | 'returns' | 'cash' | 'orders')) => void;
  resetPage: (module: keyof PharmacyState & ('purchases' | 'sales' | 'returns' | 'cash' | 'orders')) => void;
  clearAll: () => void;
}

export const usePharmacyStore = create<PharmacyState>((set) => ({
  activePharmacyId: '0',
  activePharmacyName: '',
  purchases: { ...initialListState },
  sales: { ...initialListState },
  returns: { ...initialListState },
  cash: { ...initialListState },
  orders: { ...initialListState },

  setActivePharmacy: (id, name) => set({ activePharmacyId: id, activePharmacyName: name }),

  setListData: (module, data, mode = 'replace') => set((state) => {
    const current = state[module];
    if (mode === 'append') {
      const existingIds = new Set(current.data.map(i => i.id));
      const filteredNew = data.filter(i => !existingIds.has(i.id));
      return {
        [module]: { ...current, data: [...current.data, ...filteredNew].slice(0, 500) }
      };
    }
    if (mode === 'prepend') {
      const newIds = new Set(data.map(i => i.id));
      // Update existing items in-place to keep their order
      const updatedExisting = current.data.map(i => {
        if (newIds.has(i.id)) {
          return data.find(d => d.id === i.id) || i;
        }
        return i;
      });
      // Extract strictly new items
      const existingIds = new Set(current.data.map(i => i.id));
      const strictlyNew = data.filter(i => !existingIds.has(i.id));

      return {
        [module]: { ...current, data: [...strictlyNew, ...updatedExisting].slice(0, 500) }
      };
    }
    return {
      [module]: { ...current, data: data.slice(0, 500) }
    };
  }),

  setListLoading: (module, loading) => set((state) => ({
    [module]: { ...state[module], loading }
  })),

  setListRefreshing: (module, refreshing) => set((state) => ({
    [module]: { ...state[module], refreshing }
  })),

  setListLastUpdated: (module, lastUpdated) => set((state) => ({
    [module]: { ...state[module], lastUpdated }
  })),

  setListHasMore: (module, hasMore) => set((state) => ({
    [module]: { ...state[module], hasMore }
  })),

  incrementPage: (module) => set((state) => ({
    [module]: { ...state[module], page: state[module].page + 1 }
  })),

  resetPage: (module) => set((state) => ({
    [module]: { ...state[module], page: 1 }
  })),

  clearAll: () => set({
    activePharmacyId: '0',
    activePharmacyName: '',
    purchases: { ...initialListState },
    sales: { ...initialListState },
    returns: { ...initialListState },
    cash: { ...initialListState },
    orders: { ...initialListState },
  }),
}));
