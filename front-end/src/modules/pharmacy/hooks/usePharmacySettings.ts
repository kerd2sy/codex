import { useState, useEffect } from 'react';
import { storage } from '@/shared/utils/storage';
import * as Location from 'expo-location';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePharmacySettings = () => {
    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        loadPharmacies();
    }, []);

    const loadPharmacies = async () => {
        setLoading(true);
        try {
            // Try storage first for instant load
            const userJson = await storage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                setCurrentUser(user);
                setPharmacies(user.pharmacies || []);
            }

            // Then fetch fresh data from API
            const res = await apiFetch(API_ENDPOINTS.AUTH.ME);
            if (res.ok) {
                const freshUser = await res.json();
                setCurrentUser(freshUser);
                setPharmacies(freshUser.pharmacies || []);
                await storage.setItem('user', JSON.stringify(freshUser));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateLocation = async (pharmacyId: string) => {
        setIsUpdating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return { error: 'يجب السماح بالوصول للموقع لتفعيل هذه الميزة' };

            const location = await Location.getCurrentPositionAsync({});
            const locationUrl = `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;

            const res = await apiFetch(API_ENDPOINTS.PHARMACY.UPDATE_LOCATION(pharmacyId), {
                method: 'PUT',
                body: JSON.stringify({ location_url: locationUrl })
            });

            if (res.ok) {
                const updated = pharmacies.map(p => p.id.toString() === pharmacyId ? { ...p, location_url: locationUrl } : p);
                setPharmacies(updated);
                const userJson = await storage.getItem('user');
                if (userJson) {
                    const user = JSON.parse(userJson);
                    user.pharmacies = updated;
                    await storage.setItem('user', JSON.stringify(user));
                }
                return { success: true };
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdating(false);
        }
        return { error: 'فشل تحديث الموقع' };
    };

    const sendUpdateRequest = async (pharmacyId: string, field: string, newValue: string, oldValue: string) => {
        try {
            const res = await apiFetch(API_ENDPOINTS.PHARMACY.REQUEST_UPDATE(pharmacyId), {
                method: 'POST',
                body: JSON.stringify({ pharmacy_id: parseInt(pharmacyId), field_name: field, old_value: oldValue, new_value: newValue })
            });
            return res.ok;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    return { pharmacies, currentUser, loading, isUpdating, updateLocation, sendUpdateRequest };
};
