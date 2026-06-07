import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { useRouter } from '@/hooks/useRouter';
import { storage } from '@/shared/utils/storage';
import { apiFetch } from '@/shared/api/api-client';
import { Ionicons } from '@expo/vector-icons';

export default function ProductivityScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [employeeStats, setEmployeeStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Date filters
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateArabic = (d: Date) => {
        return d.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const loadData = async (start = startDate, end = endDate) => {
        const userJson = await storage.getItem('user');
        if (userJson) {
            const user = JSON.parse(userJson);
            setCurrentUser(user);
        }
        
        try {
            setLoading(true);
            const dateFrom = formatDate(start);
            const dateTo = formatDate(end);
            const res = await apiFetch(`/api/v1/hr/employees/my-stats?dateFrom=${dateFrom}&dateTo=${dateTo}`);
            if (res.ok) {
                const data = await res.json();
                setEmployeeStats(data);
            }
        } catch (err) {
            console.log("Error fetching employee stats:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const adjustStartDate = (days: number) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + days);
        setStartDate(d);
        loadData(d, endDate);
    };

    const adjustEndDate = (days: number) => {
        const d = new Date(endDate);
        d.setDate(d.getDate() + days);
        setEndDate(d);
        loadData(startDate, d);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                currentUser={currentUser}
                unreadCount={0}
                onPressProfile={() => router.back()}
                onPressNotifications={() => {}}
                title="الإنتاجية"
                subtitle="قسم الموظفين"
            />
            <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
                }
            >
                <View style={[styles.dateFilterContainer, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>تصفية الإحصائيات</Text>
                    <View style={styles.dateFilterRow}>
                        <View style={[styles.dateControlGroup, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            <TouchableOpacity onPress={() => adjustStartDate(-1)} style={styles.arrowBtn}>
                                <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                            </TouchableOpacity>
                            
                            <View style={styles.dateButtonTextContainer}>
                                <Text style={[styles.dateLabelSmall, { color: theme.muted }]}>من تاريخ</Text>
                                <Text style={[styles.dateButtonText, { color: theme.text }]} numberOfLines={1}>
                                    {formatDateArabic(startDate)}
                                </Text>
                            </View>

                            <TouchableOpacity onPress={() => adjustStartDate(1)} style={styles.arrowBtn}>
                                <Ionicons name="chevron-back" size={20} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.dateSeparator}>
                            <Ionicons name="arrow-back-outline" size={20} color={theme.muted} />
                        </View>

                        <View style={[styles.dateControlGroup, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            <TouchableOpacity onPress={() => adjustEndDate(-1)} style={styles.arrowBtn}>
                                <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                            </TouchableOpacity>
                            
                            <View style={styles.dateButtonTextContainer}>
                                <Text style={[styles.dateLabelSmall, { color: theme.muted }]}>إلى تاريخ</Text>
                                <Text style={[styles.dateButtonText, { color: theme.text }]} numberOfLines={1}>
                                    {formatDateArabic(endDate)}
                                </Text>
                            </View>

                            <TouchableOpacity onPress={() => adjustEndDate(1)} style={styles.arrowBtn}>
                                <Ionicons name="chevron-back" size={20} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>إحصائيات الإنتاجية الخاصة بي</Text>
                    {loading && !refreshing ? (
                        <Text style={{ color: theme.textSecondary }}>جاري التحميل...</Text>
                    ) : employeeStats ? (
                        <View style={[styles.employeeRow, { borderBottomColor: theme.border, borderBottomWidth: 0 }]}>
                            <Text style={[styles.employeeName, { color: theme.text }]}>{employeeStats.name || currentUser?.manager_name || currentUser?.username || 'حسابي'}</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statBadge}>
                                    <Text style={[styles.statValue, { color: theme.primary }]}>{employeeStats.total_items || 0}</Text>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>صنف</Text>
                                </View>
                                <View style={styles.statBadge}>
                                    <Text style={[styles.statValue, { color: theme.primary }]}>{employeeStats.invoices_count || 0}</Text>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>فاتورة</Text>
                                </View>
                                <View style={styles.statBadge}>
                                    <Text style={[styles.statValue, { color: theme.primary }]}>{employeeStats.total_amount ? employeeStats.total_amount.toLocaleString() : 0}</Text>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>جنية</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <Text style={{ color: theme.textSecondary }}>لا توجد بيانات متاحة حالياً</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, alignItems: 'center' },
    card: {
        width: '100%',
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        marginTop: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'right',
    },
    employeeRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    employeeName: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'right',
    },
    statsRow: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    statBadge: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 60,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    dateFilterContainer: {
        width: '100%',
        padding: 15,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        marginBottom: 20,
    },
    dateFilterRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateControlGroup: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 5,
        paddingVertical: 5,
    },
    arrowBtn: {
        padding: 5,
    },
    dateSeparator: {
        marginHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateButtonTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    dateLabelSmall: {
        fontSize: 11,
        marginBottom: 2,
    },
    dateButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'right',
        width: '100%',
    }
});
