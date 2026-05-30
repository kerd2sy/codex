import { useRouter } from '../src/shared/hooks/useRouter';
import { Colors } from '../src/core/theme';
import { useColorScheme } from '../src/shared/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@/shared/utils/storage';
import { useRootNavigationState } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';

export default function Index() {
    const [status, setStatus] = useState<'loading' | 'done'>('loading');
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();
    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? 'dark' : 'light';
    const currentColors = Colors[theme];

    useEffect(() => {
        // Hide the native splash screen immediately to show our Lottie animation
        SplashScreen.hideAsync();
    }, []);

    useEffect(() => {
        if (!rootNavigationState?.key || status !== 'loading') return;

        const checkOnboarding = async () => {
            try {
                // Add a small delay to ensure the animation is seen
                await new Promise(resolve => setTimeout(resolve, 2000));

                const onboarded = await storage.getItem('@onboarded');
                // console.log('[Init] Onboarding status:', onboarded);

                if (onboarded !== 'true') {
                    // console.log('[Init] Redirecting to onboarding');
                    router.replace('/(auth)/onboarding');
                    return;
                }

                // Session check is separate
                const accessToken = await storage.getItem('access_token');
                const refreshToken = await storage.getItem('refresh_token');
                const userJson = await storage.getItem('user');
                const rememberMe = await storage.getItem('@remember_me');

                if ((accessToken || refreshToken) && userJson) {
                    const lastLogin = await storage.getItem('last_login_timestamp');
                    const now = Date.now();
                    const loginTime = lastLogin ? parseInt(lastLogin, 10) : 0;
                    const hoursPassed = (now - loginTime) / (1000 * 60 * 60);

                    if (rememberMe === 'true' || hoursPassed < 168) {
                        try {
                            // Biometric check...
                            const bioEnabled = await storage.getItem('user_biometric_enabled');
                            if (bioEnabled === 'true') {
                                const lastBioAuth = await storage.getItem('last_biometric_auth_timestamp');
                                const lastBioTime = lastBioAuth ? parseInt(lastBioAuth, 10) : 0;
                                const daysSinceBio = (now - lastBioTime) / (1000 * 60 * 60 * 24);

                                if (daysSinceBio >= 30) {
                                    const auth = await LocalAuthentication.authenticateAsync({
                                        promptMessage: 'قم بتأكيد هويتك للدخول (مطلوب كل 30 يوم)',
                                        cancelLabel: 'استخدام كلمة المرور',
                                        disableDeviceFallback: false,
                                    });
                                    if (!auth.success) {
                                        router.replace('/(auth)/login');
                                        return;
                                    }
                                    await storage.setItem('last_biometric_auth_timestamp', now.toString());
                                }
                            }

                            const user = JSON.parse(userJson);
                            if (user?.role) {
                                if (user.role === 'admin') router.replace('/(admin)/dashboard');
                                else if (user.role === 'gomla') router.replace('/(gomla)/dashboard');
                                else if (['pharmacist', 'pharmacy', 'employee'].includes(user.role)) router.replace('/(pharmacy)');
                                else router.replace('/(auth)/login');
                                return;
                            }
                        } catch (innerError) {
                            console.error('[Init] Session restore failed:', innerError);
                        }
                    }
                }
                
                // console.log('[Init] No valid session, going to login');
                router.replace('/(auth)/login');
            } catch (e) {
                console.error('[Init] Critical failure:', e);
                // Only fallback to onboarding if we really haven't seen it
                const onboarded = await storage.getItem('@onboarded');
                if (onboarded !== 'true') router.replace('/(auth)/onboarding');
                else router.replace('/(auth)/login');
            } finally {
                setStatus('done');
            }
        };
        checkOnboarding();
    }, [rootNavigationState?.key, status, router]);

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <LottieView
                source={require('../assets/json/logo.json')}
                autoPlay
                loop={false}
                style={{ width: 300, height: 300 }}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
