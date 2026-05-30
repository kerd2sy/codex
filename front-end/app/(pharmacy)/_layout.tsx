import { Colors } from '../../src/core/theme';
import { useColorScheme } from '../../src/shared/hooks/useColorScheme';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, Platform, Alert, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { apiFetch, API_ENDPOINTS } from '../../src/shared/api/api-client';
import { useRoleGuard } from '../../src/shared/guards/useRoleGuard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOP_GAP = SCREEN_HEIGHT * 0.02;

export default function PharmacyLayout() {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark'];
    
    const { loading, authorized } = useRoleGuard('pharmacist');

    if (loading || !authorized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background, paddingTop: TOP_GAP },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="[...rest]" />
        </Stack>
    );
}
