import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/shared/api/api-client';
import { useRouter } from '@/hooks/useRouter';
import { storage } from '@/utils/storage';

export const useAddPharmacy = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const addPharmacy = async (code: string, phone: string) => {
        setLoading(true);
        try {
            const res = await apiFetch(API_ENDPOINTS.PHARMACY.LINK, {

                method: 'POST',
                body: JSON.stringify({ code, phone }),
            });
            const data = await res.json();
            if (res.ok) {
                // Determine the newly added pharmacy to auto-select it
                const oldUserJson = await storage.getItem('user');
                const oldUser = oldUserJson ? JSON.parse(oldUserJson) : null;
                const oldIds = oldUser?.pharmacies?.map((p: any) => p.id.toString()) || [];
                
                await storage.setItem('user', JSON.stringify(data));
                
                // Find the first pharmacy in the new list that wasn't in the old list
                const newPharm = data.pharmacies?.find((p: any) => !oldIds.includes(p.id.toString()));
                if (newPharm) {
                    await AsyncStorage.setItem('@active_pharmacy_id', newPharm.id.toString());
                    await AsyncStorage.setItem('@active_pharmacy_name', newPharm.name);
                }

                return { success: true };
            }
            return { success: false, error: data.detail || 'تعذر ربط الصيدلية' };
        } catch (e) {
            return { success: false, error: 'تعذر الاتصال بالسيرفر' };
        } finally {
            setLoading(false);
        }
    };

    return { addPharmacy, loading };
};

