import { 
    StyleSheet, Text, View, ScrollView, 
    TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminStats } from '../../hooks/useAdminStats';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { useState, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { useRouter } from '@/hooks/useRouter';
import { useRoleGuard } from '@/shared/guards/useRoleGuard';
import { CategoryGrid } from '../../../pharmacy/components/CategoryGrid';

const ADMIN_CATEGORIES = [
    { id: '1', title: 'التقارير', iconName: 'bar-chart', color: '#10B981' },
    { id: '2', title: 'المبيعات', iconName: 'receipt', color: '#3B82F6' },
    { id: '3', title: 'الصيدليات', iconName: 'business', color: '#8B5CF6' },
    { id: '4', title: 'الجملة', iconName: 'people', color: '#F43F5E' },
    { id: '5', title: 'الفواتير', iconName: 'swap-horizontal', color: '#F59E0B' },
    { id: '6', title: 'الأصناف', iconName: 'barcode', color: '#EC4899' },
    { id: '7', title: 'الموظفين', iconName: 'briefcase', color: '#6366F1' },
    { id: '8', title: 'المستخدمون', iconName: 'people-circle', color: '#14B8A6' },
];

export const AdminDashboard = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { loading: authLoading, authorized } = useRoleGuard('admin');
    const { stats, loading, refresh } = useAdminStats();

    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const loadUser = async () => {
            const userJson = await storage.getItem('user');
            if (userJson) setCurrentUser(JSON.parse(userJson));
        };
        loadUser();
    }, []);

    const handleCategoryPress = (cat: any) => {
        const routes: Record<string, string> = {
            '1': '/(admin)/statistics',
            '2': '/(admin)/sales',
            '3': '/(admin)/pharmacies',
            '4': '/(admin)/gomla-followup',
            '5': '/(admin)/invoice-transfer',
            '6': '/(admin)/product-coding',
            '7': '/(admin)/employees',
            '8': '/(admin)/users',
        };
        const path = routes[cat.id];
        if (path) router.push(path as any);
    };

    if ((authLoading || loading) && !stats) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!authorized) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                currentUser={currentUser}
                unreadCount={stats?.pendingRequests || 0}
                onPressProfile={() => router.push('/(admin)/settings')}
                onPressNotifications={() => {}}
                title="لوحة الإدارة"
                subtitle="مرحباً بك في"
            />

            <ScrollView 
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.primary} />
                }
            >
                {/* Alerts Banner */}
                {stats && stats.pendingRequests > 0 && (
                    <TouchableOpacity 
                        style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                        onPress={() => router.push('/(admin)/pharmacies')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.alertIconPulse}>
                            <Ionicons name="notifications-circle" size={32} color="#EF4444" />
                        </View>
                        <Text style={styles.alertText}>
                            لديك <Text style={{ fontWeight: '900' }}>{stats.pendingRequests}</Text> طلبات صيدليات معلقة بانتظار المراجعة
                        </Text>
                        <Ionicons name="arrow-back" size={20} color="#EF4444" />
                    </TouchableOpacity>
                )}

                <View style={{ marginTop: 25 }}>
                    <CategoryGrid 
                        categories={ADMIN_CATEGORIES} 
                        onCategoryPress={handleCategoryPress} 
                    />
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    alertBanner: { 
        marginHorizontal: '5%', 
        marginTop: 20, 
        padding: 16, 
        borderRadius: 24, 
        borderWidth: 1,
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        gap: 12,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3
    },
    alertIconPulse: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 2,
    },
    alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#B91C1C', textAlign: 'right', lineHeight: 20 },
});
