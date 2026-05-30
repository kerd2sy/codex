import { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { router } from 'expo-router';

// For Expo Go SDK 53+, we must not load expo-notifications as it will crash on import.
const Notifications = Constants.appOwnership === 'expo' ? null : require('expo-notifications');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '../api/api-client';

import { storage } from '../utils/storage';

/**
 * Custom hook for setting up and managing Expo Push Notifications.
 * Handles permission requests, channel setup, and token synchronization.
 */
export const usePushNotifications = () => {
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        console.log('[Notifications] Hook useEffect triggered');
        
        // Skip notifications in development mode or when Notifications is null (e.g. Expo Go)
        if (__DEV__ || !Notifications) {
            console.log('[Notifications] Setup skipped: Running in development mode or Notifications module is null (Expo Go)');
            return;
        }

        // Skip for Web or non-device
        if (Platform.OS === 'web' || !Device.isDevice) {
            console.log('[Notifications] Setup skipped: Web or Simulator');
            return;
        }

        // Initial setup
        console.log('[Notifications] Initializing setup...');
        setupNotifications();

        // 1. Listen for notification clicks (Response)
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response: any) => {
            const data = response.notification.request.content.data;
            if (data?.type === 'update' || data?.action === 'check_update' || data?.update === true) {
                try {
                    const updateStatus = await Updates.checkForUpdateAsync();
                    if (updateStatus.isAvailable) {
                        await Updates.fetchUpdateAsync();
                        await Updates.reloadAsync();
                    }
                } catch (e) {
                    console.error('[Notifications] Auto-update failed on click:', e);
                }
            } else if (data?.id || data?.target_id) {
                let targetId = data.target_id || data.id;
                const type = data.type || data.action;

                // Normalize ID: Add prefixes if missing (Notifications often send raw database IDs)
                if ((type === 'purchase' || type === 'purchase_order' || type === 'return' || type === 'return_order') && !/^[A-Za-z]_/.test(String(targetId))) {
                    targetId = `H_${targetId}`;
                }

                if (type === 'purchase' || type === 'purchase_order') {
                    router.push(`/(pharmacy)/purchases/${targetId}`);
                } else if (type === 'return' || type === 'return_order') {
                    router.push(`/(pharmacy)/returns/${targetId}`);
                } else if (type === 'sale' || type === 'sale_order' || type === 'sales_order') {
                    router.push(`/(pharmacy)/sales/${targetId}`);
                }
            }
        });

        // 2. Listen for app state changes to re-sync token if needed (e.g. after login)
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            responseSubscription.remove();
            appStateSubscription.remove();
        };
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            // Re-sync when app comes to foreground
            setupNotifications();
        }
        appState.current = nextAppState;
    };

    const setupNotifications = async () => {
        if (!Device.isDevice) return;

        try {
            // 1. Request permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            
            if (finalStatus !== 'granted') return;

            // 2. Configure foreground notification behavior
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });

            // 3. Setup Android notification channel
            if (Platform.OS === 'android') {
                try {
                    await Notifications.setNotificationChannelAsync('default', {
                        name: 'تبارك فارما',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF7043',
                        showBadge: true,
                        // Using default sound to avoid "sound not found" errors in dev builds
                        // Once a new native build is created with the sound, this can be changed back to 'notification.wav'
                        sound: true, 
                        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                        bypassDnd: true,
                    });
                    console.log('[Notifications] Android channel "default" configured');
                } catch (channelError) {
                    console.error('[Notifications] Failed to configure channel:', channelError);
                }
            }

            // 4. Get Tokens (Expo & Device/FCM)
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
            
            // Get Expo Push Token
            const expoTokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
            const expoToken = expoTokenResponse.data;
            if (__DEV__) console.log('[Notifications] Expo Push Token:', expoToken);

            // Get Native FCM Token (Required for direct FCM V1 integration)
            let nativeToken = null;
            if (Platform.OS === 'android') {
                try {
                    const deviceTokenResponse = await Notifications.getDevicePushTokenAsync();
                    nativeToken = deviceTokenResponse.data;
                    if (__DEV__) console.log('[Notifications] Native FCM Token:', nativeToken);
                } catch (err) {
                    console.warn('[Notifications] Failed to get native device token:', err);
                }
            }

            // 5. Send tokens to backend if user is logged in
            const userStr = await storage.getItem('user');
            const token = await storage.getItem('access_token');
            console.log('[Notifications] User status check:', { hasUser: !!userStr, hasToken: !!token });

            if (userStr && token) {
                console.log('[Notifications] Syncing tokens with backend using tokens:', { expo: !!expoToken, fcm: !!nativeToken });
                try {
                    // Send both tokens so the backend can decide which one to use (FCM V1 vs Expo)
                    const payload = { 
                        token: expoToken, // Legacy field
                        expoToken: expoToken,
                        fcmToken: nativeToken,
                        deviceToken: nativeToken,
                        platform: Platform.OS
                    };
                    
                    const response = await apiFetch(API_ENDPOINTS.AUTH.PUSH_TOKEN, {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    
                    console.log('[Notifications] Token sync response status:', response.status);
                    if (response.ok) {
                        console.log('[Notifications] Tokens synced successfully');
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('[Notifications] Token sync failed:', { status: response.status, error: errorData });
                    }
                } catch (apiError) {
                    console.error('[Notifications] Failed to sync token with backend error:', apiError);
                }
            } else {
                console.log('[Notifications] Sync skipped: User not logged in or token missing');
            }
        } catch (e) {
            console.warn('[Notifications] General setup error:', e);
        }
    };
};
