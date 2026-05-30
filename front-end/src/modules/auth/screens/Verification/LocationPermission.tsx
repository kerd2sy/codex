import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export const LocationPermission = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();

    const handleAllow = () => {
        router.replace('/(auth)/login');
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            
            <View style={styles.imageContainer}>
                <LottieView
                    source={require('@/assets/json/location.json')}
                    autoPlay
                    loop
                    style={styles.illustration}
                />
            </View>

            <View style={styles.contentContainer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleAllow}>
                    <Text style={styles.buttonText}>السماح بالوصول للموقع</Text>
                    <View style={styles.iconCircle}>
                        <Ionicons name="location-outline" size={20} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>

                <Text style={[styles.description, { color: theme.muted }]}>
                    سيقوم تطبيق "تبارك فارما" بالوصول إلى موقعك{"\n"}
                    فقط أثناء استخدام التطبيق
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
    illustration: { width: 300, height: 300 },
    contentContainer: { width: '100%', alignItems: 'center', paddingBottom: 40 },
    button: {
        width: '100%', height: 56, borderRadius: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        position: 'relative', marginBottom: 24,
    },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    iconCircle: {
        position: 'absolute', right: 16, width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center',
    },
    description: { fontSize: 14, textAlign: 'center', lineHeight: 24 }
});

