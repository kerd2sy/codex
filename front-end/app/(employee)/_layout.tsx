import { Stack } from 'expo-router';
import { View, ActivityIndicator, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useRoleGuard } from '@/shared/guards/useRoleGuard';
import { Loader } from '@/ui/shared/Loader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOP_GAP = SCREEN_HEIGHT * 0.02;

export default function EmployeeLayout() {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    const { loading, authorized } = useRoleGuard('employee');

    if (loading || !authorized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <Loader />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ 
            headerShown: false,
            contentStyle: { backgroundColor: theme.background, paddingTop: TOP_GAP },
            animation: 'fade'
        }}>
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
    );
}
