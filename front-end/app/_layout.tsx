import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Dimensions, View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import 'react-native-reanimated';
import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const NavigationBar = Platform.OS === 'android' ? require('expo-navigation-bar') : null;
const SystemUI = Platform.OS === 'android' ? require('expo-system-ui') : null;
import { LogBox } from 'react-native';

// Global Accessibility Fix: Cap font scaling to 1.3x to prevent UI components from breaking
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.maxFontSizeMultiplier = 1.3;
if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.3;
import { Colors } from '../src/core/theme';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, usePathname } from 'expo-router';
import { onForceLogout } from '../src/shared/guards/auth-events';
import { usePushNotifications } from '../src/shared/hooks/usePushNotifications';
import { useRouter } from '../src/shared/hooks/useRouter';
import { useColorScheme } from '../src/shared/hooks/useColorScheme';
import { useAppUpdates } from '../src/shared/hooks/useAppUpdates';
import { StatusModal } from '../src/ui/shared/StatusModal';
import LottieView from 'lottie-react-native';
import { pdfGenerator } from '../src/modules/pharmacy/utils/pdf-generator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../src/shared/utils/storage';
import { ErrorBoundary } from '../src/shared/components/ErrorBoundary';
import { DatabaseManager } from '../src/modules/pharmacy/utils/database';
import { BackgroundSyncManager } from '../src/modules/pharmacy/utils/BackgroundSyncManager';

// Suppress annoying development warnings
LogBox.ignoreLogs([
  'setLayoutAnimationEnabledExperimental is currently a no-op',
  '`setBehaviorAsync` is not supported with edge-to-edge enabled',
  '`setPositionAsync` is not supported with edge-to-edge enabled',
  '`setBackgroundColorAsync` is not supported with edge-to-edge enabled',
  'Splashscreen.setOptions cannot be used in Expo Go'
]);


function RootLayoutContent() {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  const router = useRouter();

  useEffect(() => {
    // Hide splash screen immediately on mount to transition to custom animations
    SplashScreen.hideAsync();
  }, []);

  // Root Notifications Logic
  usePushNotifications();
  
  useEffect(() => {
    DatabaseManager.init();
    
    // Start background sync for offline items
    BackgroundSyncManager.start();
  }, []);
  
  // App Update Logic
  const { 
    updateAvailable, isUpdating, isFetchComplete,
    runUpdate, applyUpdate 
  } = useAppUpdates();

  const [animationFinished, setAnimationFinished] = React.useState(false);

  useEffect(() => {
    if (updateAvailable && !isUpdating) {
        runUpdate();
    }
  }, [updateAvailable, isUpdating, runUpdate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isUpdating) {
        // We keep it centered now, but set animationFinished after a delay
        // to ensure the user experiences the smooth animation.
        timer = setTimeout(() => {
            setAnimationFinished(true);
        }, 2000);
    } else {
        setAnimationFinished(false);
    }
    return () => clearTimeout(timer);
  }, [isUpdating]);

  useEffect(() => {
    if (animationFinished && isFetchComplete) {
        applyUpdate();
    }
  }, [animationFinished, isFetchComplete, applyUpdate]);


  useEffect(() => {
    const cleanup = onForceLogout(async () => {
      console.log("[Auth] Force logout requested, redirecting...");
      
      // Clear security tokens and user data to prevent loops
      try {
        // Clear ONLY session tokens. Keep pharmacy IDs and Vault data for instant return.
        await storage.deleteItem('access_token');
        await storage.deleteItem('refresh_token');
        await storage.deleteItem('user');
        
        await storage.setItem('user_has_logged_out', 'true');

        // Ensure Google session is cleared and FORGOTTEN so it doesn't auto-login
        try {
          const { GoogleSignin } = require('@react-native-google-signin/google-signin');
          await GoogleSignin.signOut().catch(() => {});
          await GoogleSignin.revokeAccess().catch(() => {});
        } catch (gErr) {}
      } catch (e) {
        console.error("[Auth] Failed to clear storage during force logout:", e);
      }

      router.replace('/(auth)/login');
    });
    return cleanup;
  }, [router]);

  const pathname = usePathname();
  
  useEffect(() => {
    let active = true;
    if (Platform.OS === 'android' && NavigationBar) {
      const initNavBar = async () => {
        try {
          const isDark = colorScheme === 'dark';
          const bgColor = isDark ? '#000000' : '#FFFFFF';
          const btnStyle = isDark ? 'light' : 'dark';

          if (!active) return;
          // EDGE-TO-EDGE: In modern Expo, manual nav bar colors are unsupported/redundant. 
          // We rely on the theme and safe-area-context for a 10/10 premium look.
          await NavigationBar.setButtonStyleAsync(btnStyle).catch(() => {});
          await NavigationBar.setVisibilityAsync('visible').catch(() => {});
          
          setTimeout(async () => {
             if (active) {
                await NavigationBar.setButtonStyleAsync(btnStyle).catch(() => {});
             }
          }, 300);
        } catch (e) {
          console.error('NavigationBar setup failed:', e);
        }
      };
      initNavBar();
    }
    return () => {
      active = false;
    };
  }, [colorScheme, pathname]);

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ErrorBoundary theme={colorScheme}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <Stack screenOptions={{ 
            contentStyle: { backgroundColor: theme.background },
            headerShown: false 
          }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(pharmacy)" options={{ headerShown: false }} />
            <Stack.Screen name="(gomla)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            <Stack.Screen name="(employee)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar 
            style={colorScheme === 'dark' ? 'light' : 'dark'} 
            backgroundColor={colorScheme === 'dark' ? '#121212' : '#FFFFFF'} 
            translucent={false} 
          />
        </View>

        {/* Full Screen Update Progress Overlay */}
        {isUpdating && (
          <View style={StyleSheet.absoluteFillObject}>
             <View style={[styles.updateOverlay, { backgroundColor: theme.background }]}>
                <View style={[styles.animationBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <LottieView 
                      source={require('../assets/json/Rocket2.json')}
                      autoPlay
                      loop
                      style={styles.rocketLottie}
                  />
                </View>
                <View style={styles.txtWrap}>
                  <Text style={[styles.updateTxt, { color: theme.text }]}>جارٍ تحديث النظام</Text>
                  <Text style={[styles.updateSub, { color: theme.muted }]}>يرجى الانتظار، لا تقم بإغلاق التطبيق...</Text>
                </View>
             </View>
          </View>
        )}
      </ErrorBoundary>
    </NavThemeProvider>
  );
}

const styles = StyleSheet.create({
    updateOverlay: {
        flex: 1,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    animationBox: {
        width: 320,
        height: 320,
        borderRadius: 160,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        overflow: 'hidden'
    },
    rocketLottie: {
        width: '120%',
        height: '120%',
    },
    txtWrap: {
        marginTop: 40,
        alignItems: 'center',
        gap: 8
    },
    updateTxt: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
        textAlign: 'center'
    },
    updateSub: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        opacity: 0.7
    }
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
