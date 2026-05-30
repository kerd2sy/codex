import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/shared/api/api-client';

export interface AdminStats {
    totalPharmacies: number;
    activeUsers: number;
    todayInvoices: number;
    todayCollections: number;
    pendingRequests: number;
}

export const useAdminStats = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiFetch('/api/v1/admin/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch admin stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, refresh: fetchStats };
};
