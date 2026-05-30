
import { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseApiError } from '@/api/api-client';

export interface AdminStats {
    total_cash: number;
    total_invoices: number;
    total_items: number;
    unprinted_invoices: number;
    open_invoices: number;
    closed_unprinted_invoices: number;
    inventoried_invoices: number;
    uninventoried_invoices: number;
    inventoried_items: number;
    uninventoried_items: number;
    total_amount: number;
}

export interface Store {
    id: number;
    name: string;
}

export const useAdminStatistics = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStore, setSelectedStore] = useState<number>(1);
    
    // Default to today
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [timeFrom, setTimeFrom] = useState("00:00:00");
    const [timeTo, setTimeTo] = useState("23:59:59");

    const fetchStores = useCallback(async () => {
        try {
            const res = await apiFetch('/api/v1/admin/stores');
            if (res.ok) {
                const data = await res.json();
                setStores(data);
                if (data.length > 0 && !data.find((s: Store) => s.id === selectedStore)) {
                    setSelectedStore(data[0].id);
                }
            }
        } catch (err) {
            // Error handled by UI states
        }

    }, [selectedStore]);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = `/api/v1/admin/statistics?store_id=${selectedStore}&date_from=${dateFrom}&date_to=${dateTo}&time_from=${timeFrom}&time_to=${timeTo}`;
            const res = await apiFetch(url);
            const data = await res.json();
            
            if (res.ok) {
                setStats(data);
            } else {
                setError(parseApiError(data));
            }
        } catch (err) {
            setError("حدث خطأ أثناء تحميل الإحصائيات");
        } finally {
            setLoading(false);
        }
    }, [selectedStore, dateFrom, dateTo, timeFrom, timeTo]);

    useEffect(() => {
        fetchStores();
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        stores,
        loading,
        error,
        selectedStore,
        setSelectedStore,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        timeFrom, setTimeFrom,
        timeTo, setTimeTo,
        refresh: fetchStats
    };
};
