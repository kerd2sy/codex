import { 
    StyleSheet, Text, View, ScrollView, 
    TouchableOpacity, ActivityIndicator, RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminStats } from '../../hooks/useAdminStats';
import { StatCard } from '../../components/StatCard';
import { AdminHeader } from '../../components/AdminHeader';
import { useState, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { useRouter } from '@/hooks/useRouter';
import { useRoleGuard } from '@/shared/guards/useRoleGuard';


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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'صباح الخير';
        if (hour < 18) return 'مساء الخير';
        return 'طابت ليلتك';
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
            <AdminHeader 
                theme={theme}
                insets={insets}
                currentUser={currentUser}
                unreadCount={stats?.pendingRequests || 0}
                onPressProfile={() => router.push('/(admin)/settings')}
                onPressNotifications={() => {}}
            />

            <ScrollView 
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.primary} />
                }
            >
                {/* Greeting Section */}
                <View style={styles.greetingSection}>
                    <Text style={[styles.greetingText, { color: theme.muted }]}>{getGreeting()}</Text>
                    <Text style={[styles.userNameText, { color: theme.text }]}>
                        {currentUser?.display_name || 'أدمن أورجاسوفت'} 👋
                    </Text>
                </View>

                {/* Stats Section */}
                {stats && (
                    <View style={styles.statsContainer}>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.statsScrollContent}
                            pagingEnabled={false}
                            snapToInterval={200}
                            decelerationRate="fast"
                        >
                            <StatCard 
                                title="إجمالي الصيدليات" 
                                value={stats.totalPharmacies} 
                                icon="business" 
                                colors={['#3B82F6', '#2563EB']} 
                                style={styles.statCard}
                            />
                            <StatCard 
                                title="المستخدمين النشطين" 
                                value={stats.activeUsers} 
                                icon="people" 
                                colors={['#10B981', '#059669']} 
                                style={styles.statCard}
                            />
                            <StatCard 
                                title="فواتير اليوم" 
                                value={stats.todayInvoices} 
                                icon="receipt" 
                                colors={['#F59E0B', '#D97706']} 
                                style={styles.statCard}
                            />
                            <StatCard 
                                title="تحصيلات اليوم" 
                                value={stats.todayCollections.toLocaleString() + ' ج.م'} 
                                icon="wallet" 
                                colors={['#8B5CF6', '#7C3AED']} 
                                style={styles.statCard}
                            />
                        </ScrollView>
                    </View>
                )}

                {/* Alerts Banner */}
                {stats && stats.pendingRequests > 0 && (
                    <TouchableOpacity 
                        style={[styles.alertBanner, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => router.push('/(admin)/pharmacies')}
                    >
                        <Ionicons name="alert-circle" size={24} color="#EF4444" />
                        <Text style={styles.alertText}>
                            لديك {stats.pendingRequests} طلبات صيدليات معلقة بانتظار المراجعة
                        </Text>
                        <Ionicons name="arrow-back" size={20} color="#EF4444" />
                    </TouchableOpacity>
                )}

                {/* Main Menu / Actions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>الإدارة والتحكم</Text>
                        <Ionicons name="options-outline" size={20} color={theme.muted} />
                    </View>
                    
                    <View style={styles.menuList}>
                        <MenuButton 
                            title="إحصائيات وتقارير" 
                            subtitle="متابعة حركة المخازن والفواتير"
                            icon="bar-chart-outline"
                            color="#10B981"
                            theme={theme}
                            onPress={() => router.push('/(admin)/statistics')}
                        />
                        <MenuButton 
                            title="قائمة المبيعات" 
                            subtitle="عرض جميع الفواتير والمبيعات"
                            icon="receipt-outline"
                            color="#3B82F6"
                            theme={theme}
                            onPress={() => router.push('/(admin)/sales')}
                        />
                        <MenuButton 
                            title="إدارة الصيدليات" 
                            subtitle="تعديل بيانات الصيدليات والمندوبين"
                            icon="business-outline"
                            color="#8B5CF6"
                            theme={theme}
                            onPress={() => router.push('/(admin)/pharmacies')}
                        />
                        <MenuButton 
                            title="تحويل الفواتير" 
                            subtitle="نقل فواتير المبيعات بين العملاء"
                            icon="swap-horizontal-outline"
                            color="#F59E0B"
                            theme={theme}
                            onPress={() => router.push('/(admin)/invoice-transfer')}
                        />
                        <MenuButton 
                            title="تكويد الأصناف" 
                            subtitle="تعديل الأسعار والباركود والكوتة"
                            icon="barcode-outline"
                            color="#10B981"
                            theme={theme}
                            onPress={() => router.push('/(admin)/product-coding')}
                        />
                    </View>
                </View>

                {/* System Section */}
                <View style={[styles.section, { marginTop: 20 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>النظام والإعدادات</Text>
                    <View style={styles.menuList}>
                        <MenuButton 
                            title="إعدادات الحساب" 
                            subtitle="الملف الشخصي وكلمة المرور"
                            icon="person-outline"
                            color={theme.muted}
                            theme={theme}
                            onPress={() => router.push('/(admin)/settings')}
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const MenuButton = ({ title, subtitle, icon, color, theme, onPress }: any) => (
    <TouchableOpacity 
        style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.menuIconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.menuTextContainer}>
            <Text style={[styles.menuTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.menuSubtitle, { color: theme.muted }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-back" size={20} color={theme.muted} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    greetingSection: { paddingHorizontal: 20, paddingTop: 10, alignItems: 'flex-end' },
    greetingText: { fontSize: 14, fontWeight: '600' },
    userNameText: { fontSize: 24, fontWeight: '900', marginTop: 4 },
    statsContainer: { marginTop: 25 },
    statsScrollContent: { paddingHorizontal: 20, gap: 15 },
    statCard: { width: 180, height: 130 },
    alertBanner: { 
        marginHorizontal: 20, 
        marginTop: 25, 
        padding: 16, 
        borderRadius: 20, 
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        gap: 12
    },
    alertText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#EF4444', textAlign: 'right' },
    section: { marginTop: 35, paddingHorizontal: 20 },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
    menuList: { gap: 12 },
    menuItem: { 
        flexDirection: 'row-reverse', 
        padding: 16, 
        borderRadius: 22, 
        borderWidth: 1, 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    menuIconContainer: { 
        width: 48, height: 48, borderRadius: 16, 
        justifyContent: 'center', alignItems: 'center' 
    },
    menuTextContainer: { flex: 1, marginRight: 15, alignItems: 'flex-end' },
    menuTitle: { fontSize: 16, fontWeight: '800' },
    menuSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2, opacity: 0.7 }
});

