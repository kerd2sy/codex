import { useState, useEffect, useCallback } from 'react';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';

export interface Device {
    id: string;
    name: string;
    model: string;
    platform: string;
    last_active: string;
    status: string;
    location: string;
    ip_address: string;
    is_current: boolean;
    icon: string;
}

export const useDevices = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigningOutAll, setIsSigningOutAll] = useState(false);

    const fetchDevices = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch(API_ENDPOINTS.DEVICES);
            if (res.ok) setDevices(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    const signOut = async (id: string) => {
        try {
            const res = await apiFetch(API_ENDPOINTS.DELETE_DEVICE(id), { method: 'DELETE' });
            if (res.ok) {
                setDevices(prev => prev.filter(d => d.id !== id));
                return { success: true };
            }
        } catch (e) {
            console.error(e);
        }
        return { error: 'فشل تسجيل الخروج.' };
    };

    const signOutOthers = async () => {
        setIsSigningOutAll(true);
        try {
            const others = devices.filter(d => !d.is_current);
            for (const device of others) {
                await apiFetch(API_ENDPOINTS.DELETE_DEVICE(device.id), { method: 'DELETE' });
            }
            await fetchDevices();
            return { success: true };
        } catch (e) {
            console.error(e);
            return { error: 'حدث خطأ أثناء العمل الجماعي.' };
        } finally {
            setIsSigningOutAll(false);
        }
    };

    return { devices, isLoading, isSigningOutAll, signOut, signOutOthers, refetch: fetchDevices };
};
