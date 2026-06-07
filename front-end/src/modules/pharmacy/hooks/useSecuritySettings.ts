import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '@/shared/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';

const SECURE_STORE_KEYS = {
    BIOMETRIC: 'user_biometric_enabled',
};

export const useSecuritySettings = () => {
    const [user, setUser] = useState<any>(null);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);


    const loadSettings = useCallback(async () => {
        try {
            const userStr = await storage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                setUser(userData);

            }
            const savedBio = await storage.getItem(SECURE_STORE_KEYS.BIOMETRIC);
            setBiometricEnabled(savedBio === 'true');

            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricSupported(compatible && enrolled);
        } catch (error) {
            // Load defaults
        }

    }, []);

    const toggleBiometric = async (value: boolean) => {
        if (!isBiometricSupported && value) {
            return { error: 'جهازك لا يدعم المصادقة البيومترية أو لم تقم بإعدادها.' };
        }

        if (value) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'قم بتأكيد هويتك لتفعيل الدخول بالبصمة',
                cancelLabel: 'إلغاء',
            });

            if (result.success) {
                setBiometricEnabled(true);
                await storage.setItem(SECURE_STORE_KEYS.BIOMETRIC, 'true');
                return { success: 'تم تفعيل الدخول بالبصمة بنجاح.' };
            }
        } else {
            setBiometricEnabled(false);
            await storage.setItem(SECURE_STORE_KEYS.BIOMETRIC, 'false');
            return { success: 'تم إيقاف الدخول بالبصمة.' };
        }
        return { cancelled: true };
    };

    return { 
        user, biometricEnabled, isBiometricSupported, 
        loadSettings, toggleBiometric
    };
};
