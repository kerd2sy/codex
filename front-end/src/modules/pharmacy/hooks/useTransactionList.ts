import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { SyncController } from '../utils/sync-utils';
import { useBaseFinancialList, FinancialModule } from './useBaseFinancialList';

interface UseTransactionListOptions {
    type: FinancialModule;
}

export const useTransactionList = ({ type }: UseTransactionListOptions) => {
    const [sortAscending, setSortAscending] = useState(false);
    
    // Map type to endpoint
    const endpointMap: Record<FinancialModule, string> = {
        'purchases': API_ENDPOINTS.PURCHASES.LIST,
        'sales': API_ENDPOINTS.ORDERS.SALES,
        'returns': API_ENDPOINTS.PURCHASES.RETURNS,
        'cash': API_ENDPOINTS.PURCHASES.CASH,
        'orders': API_ENDPOINTS.ORDERS.LIST
    };

    const { 
        data: transactions, loading, refreshing, hasMore, lastUpdated, 
        fetchData, loadMore, setRefreshing 
    } = useBaseFinancialList({
        module: type,
        endpoint: endpointMap[type]
    });

    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id');
            if (activePharmId && isMounted) {
                const hasData = transactions.length > 0;
                fetchData(hasData, 1, sortAscending);
            }
        };
        init();
        return () => {
            isMounted = false;
        };
    }, [type, sortAscending, fetchData]);

    useEffect(() => {
        const syncKeyMap: Record<FinancialModule, string> = {
            'purchases': 'purchase',
            'sales': 'sales',
            'returns': 'return',
            'cash': 'cash',
            'orders': 'purchase' // Same as purchase sync
        };
        
        const unsubscribe = SyncController.subscribe((status: Record<string, boolean>) => {
            setIsSyncing(status[syncKeyMap[type]]);
        });
        return unsubscribe;
    }, [type]);

    return { 
        transactions, 
        loading, 
        isFetchingMore: loading && transactions.length > 0, 
        isSyncing,
        hasMore,
        sortAscending, 
        setSortAscending, 
        refreshing,
        lastUpdated,
        loadMore: () => loadMore(sortAscending),
        refresh: async () => { 
            setRefreshing(true);
            const task = fetchData(false, 1, sortAscending);
            const timeout = new Promise(res => setTimeout(res, 5000));
            await Promise.race([task, timeout]);
            setRefreshing(false);
        } 
    };
};
