import { Colors } from '../../src/core/theme';
import { useColorScheme } from '../../src/shared/hooks/useColorScheme';
import { Stack } from 'expo-router';
import React from 'react';
import { Dimensions, View, ActivityIndicator } from 'react-native';
import { useRoleGuard } from '../../src/shared/guards/useRoleGuard';
import { Loader } from '../../src/ui/shared/Loader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOP_GAP = SCREEN_HEIGHT * 0.02;

export default function GomlaLayout() {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark'];
    
    // Guard this section for the 'gomla' role
    const { loading, authorized } = useRoleGuard('gomla');

    if (loading || !authorized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <Loader />
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
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="invoice" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}
