import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Custom hook to monitor and apply OTA updates using expo-updates.
 */
export const useAppUpdates = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isFetchComplete, setIsFetchComplete] = useState(false);

    const onFetchUpdateAsync = useCallback(async () => {
        if (__DEV__ || Platform.OS === 'web') return; // Skip in development or Web

        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                setUpdateAvailable(true);
            }
        } catch (error) {
            // Silently handle error or report to analytics
        }
    }, []);

    useEffect(() => {
        onFetchUpdateAsync();
    }, [onFetchUpdateAsync]);

    const runUpdate = async () => {
        try {
            setIsUpdating(true);
            await Updates.fetchUpdateAsync();
            setIsFetchComplete(true);
        } catch (error) {
            setIsUpdating(false);
            Alert.alert('خطأ', 'تعذر تحميل التحديث حالياً، يرجى المحاولة لاحقاً');
        }
    };

    const applyUpdate = async () => {
        try {
            await Updates.reloadAsync();
        } catch (error) {
             console.error('[Updates] Reload failed:', error);
             setIsUpdating(false);
        }
    };

    return { 
        updateAvailable, 
        isUpdating, 
        isFetchComplete,
        runUpdate,
        applyUpdate,
        setUpdateAvailable
    };
};
