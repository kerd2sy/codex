import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@/shared/utils/storage';

/**
 * Handle tabarakpharma://auth deep links
 * Processes tokens from URL params and redirects to dashboard.
 */
export default function AuthRedirectScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        const processTokens = async () => {
            const { access_token, refresh_token, name, email, role, avatar } = params;
            
            if (access_token) {
                try {
                    await storage.setItem('access_token', access_token as string);
                    if (refresh_token) {
                        await storage.setItem('refresh_token', refresh_token as string);
                    }
                    
                    if (name) {
                        const userObj = {
                            manager_name: name as string,
                            email: email as string,
                            role: (role as string) || 'pharmacist',
                            avatar_url: (avatar as string) || null
                        };
                        await AsyncStorage.setItem('user', JSON.stringify(userObj));
                    }
                    
                    // Small delay to ensure state is committed
                    setTimeout(() => router.replace('/(pharmacy)'), 500);
                } catch (e) {
                    router.replace('/(auth)/login');
                }
            } else {
                // If no token after 3 seconds, go back to login
                const timer = setTimeout(() => {
                    router.replace('/(auth)/login');
                }, 3000);
                return () => clearTimeout(timer);
            }
        };

        processTokens();
    }, [params, router]);

    return (
        <View style={styles.container}>
            <LottieView
                source={require('../assets/json/Loader.json')}
                autoPlay
                loop
                style={styles.loader}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loader: {
        width: 140,
        height: 140,
    }
});
