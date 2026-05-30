import { Stack } from 'expo-router';
import { Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOP_GAP = SCREEN_HEIGHT * 0.02;

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="register" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="[...rest]" />
        </Stack>

    );
}
