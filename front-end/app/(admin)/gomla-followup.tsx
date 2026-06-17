import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, RefreshControl, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchRecentGomlaInvoices } from '@/modules/gomla/services/gomlaService';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Header = ({ title, onBack, onOpenCalendar, theme }: any) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
            <View style={styles.headerRight}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.primary }]}>{title}</Text>
                    <View style={[styles.titleUnderline, { backgroundColor: theme.primary }]} />
                </View>
            </View>

            <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={onOpenCalendar}>
                   <Ionicons name="calendar" size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function GomlaFollowupScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [dateModalVisible, setDateModalVisible] = useState(false);
    
    const pastDays = React.useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            days.push(`${yyyy}-${mm}-${dd}`);
        }
        return days;
    }, []);

    const [selectedDate, setSelectedDate] = useState<string>(pastDays[0]);

    const loadInvoices = useCallback(async (dateStr = selectedDate, mode: 'initial' | 'refresh' | 'background' = 'initial') => {
        if (mode === 'refresh') setRefreshing(true);
        else if (mode === 'initial') setLoading(true);

        try {
            const dbRecent = await fetchRecentGomlaInvoices(100, dateStr);
            if (dbRecent && Array.isArray(dbRecent)) {
                const formatted = dbRecent.map(inv => ({
                    id: inv.id,
                    clientName: inv.clientName || 'عميل غير معروف',
                    total: inv.total,
                    date: inv.date,
                    is_fully_audited: inv.is_fully_audited,
                    audited_items: inv.audited_items || 0,
                    total_items: inv.total_items || 0,
                    audit_status: inv.audit_status,
                    editing_by_name: inv.editing_by_name,
                    audited_by_name: inv.audited_by_name,
                    editing_by_avatar: inv.editing_by_avatar,
                    audited_by_avatar: inv.audited_by_avatar,
                }));
                
                formatted.sort((a, b) => {
                    const getPriority = (inv: any) => {
                        if (inv.audit_status === 'editing' || (!inv.is_fully_audited && inv.audited_items > 0)) return 0; 
                        if (inv.is_fully_audited || inv.audit_status === 'audited') return 2; 
                        return 1; 
                    };
                    const aPriority = getPriority(a);
                    const bPriority = getPriority(b);
                    if (aPriority !== bPriority) return aPriority - bPriority; 
                    return b.id - a.id;
                });
                
                setInvoices(formatted);
            } else {
                setInvoices([]);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            if (mode === 'initial') setLoading(false);
            if (mode === 'refresh') setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const savedDate = await AsyncStorage.getItem('@admin_gomla_date');
                if (savedDate && pastDays.includes(savedDate)) {
                    setSelectedDate(savedDate);
                    loadInvoices(savedDate);
                } else {
                    loadInvoices(pastDays[0]);
                }
            } catch (e) {
                loadInvoices(pastDays[0]);
            }
        };
        init();
    }, [pastDays, loadInvoices]);

    useFocusEffect(
        useCallback(() => {
            const interval = setInterval(() => {
                loadInvoices(selectedDate, 'background');
            }, 5000); // Poll every 5 seconds for live tracking
            return () => clearInterval(interval);
        }, [selectedDate, loadInvoices])
    );

    const onRefresh = () => loadInvoices(selectedDate, 'refresh');

    const openInvoice = (id: string) => {
        // Navigate to Gomla invoice screen to view details/edit
        router.push({ pathname: '/(gomla)/invoice', params: { id } } as any);
    };

    const totalInvoices = invoices.length;
    const auditedInvoicesCount = invoices.filter(i => i.is_fully_audited).length;
    const totalItems = invoices.reduce((sum, inv) => sum + (inv.total_items || 0), 0);
    const auditedItems = invoices.reduce((sum, inv) => sum + (inv.audited_items || 0), 0);

    const renderInvoiceItem = ({ item }: { item: any }) => {
        const isAudited = item.is_fully_audited === true || item.audit_status === 'audited';
        const isEditing = item.audit_status === 'editing' || (!isAudited && item.audited_items > 0);
        
        let statusColor = theme.muted;
        let statusText = 'في الانتظار';
        let iconName = 'time-outline';

        if (isAudited) {
            statusColor = theme.success;
            statusText = `تم بواسطة: ${item.audited_by_name || 'غير معروف'}`;
            iconName = 'checkmark-circle';
        } else if (isEditing) {
            statusColor = theme.warning;
            statusText = `جاري التحضير: ${item.editing_by_name || 'غير معروف'}`;
            iconName = 'sync-circle';
        }

        return (
            <TouchableOpacity 
                style={[styles.invoiceCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => openInvoice(item.id.toString())}
                activeOpacity={0.7}
            >
                <View style={styles.invoiceHeaderRow}>
                    <View style={[styles.idBadge, { backgroundColor: theme.primary + '15' }]}>
                        <Text style={[styles.idText, { color: theme.primary }]}>#{item.id}</Text>
                    </View>
                    <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>{item.clientName}</Text>
                </View>

                <View style={styles.invoiceProgressContainer}>
                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: 'bold' }}>إنجاز الأصناف</Text>
                        <Text style={{ color: theme.muted, fontSize: 12 }}>{item.audited_items} / {item.total_items}</Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                        <View style={[
                            styles.progressBarFill, 
                            { 
                                backgroundColor: isAudited ? theme.success : theme.primary,
                                width: item.total_items > 0 ? `${(item.audited_items / item.total_items) * 100}%` : '0%' 
                            }
                        ]} />
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border + '50' }]} />

                <View style={styles.invoiceFooter}>
                    <View style={styles.statusRow}>
                        <Ionicons name={iconName as any} size={18} color={statusColor} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                    <Text style={[styles.totalText, { color: theme.text }]}>{item.total} ج.م</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Header 
                title="متابعة الجملة" 
                onBack={() => router.back()} 
                theme={theme} 
                onOpenCalendar={() => setDateModalVisible(true)}
            />

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                <View style={styles.dateBanner}>
                    <Text style={[styles.dateBannerText, { color: theme.text }]}>إحصائيات يوم: {selectedDate}</Text>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="document-text" size={24} color={theme.primary} />
                        </View>
                        <Text style={[styles.statValue, { color: theme.text }]}>{auditedInvoicesCount} <Text style={{fontSize: 14, color: theme.muted}}>/ {totalInvoices}</Text></Text>
                        <Text style={[styles.statLabel, { color: theme.muted }]}>الفواتير المنجزة</Text>
                    </View>

                    <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="cube" size={24} color={theme.success} />
                        </View>
                        <Text style={[styles.statValue, { color: theme.text }]}>{auditedItems} <Text style={{fontSize: 14, color: theme.muted}}>/ {totalItems}</Text></Text>
                        <Text style={[styles.statLabel, { color: theme.muted }]}>الأصناف المنجزة</Text>
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>حالة الفواتير</Text>
                        {invoices.length > 0 ? (
                            invoices.map(item => <React.Fragment key={item.id}>{renderInvoiceItem({ item })}</React.Fragment>)
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="file-tray-outline" size={48} color={theme.muted} />
                                <Text style={[styles.emptyText, { color: theme.muted }]}>لا يوجد فواتير جملة في هذا اليوم</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            <Modal
                visible={dateModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>تحديد التاريخ</Text>
                            <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                                <Ionicons name="close" size={28} color={theme.muted} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ marginTop: 10 }}>
                            <FlatList
                                data={pastDays.map((d, i) => ({ 
                                    label: i === 0 ? `اليوم (${d})` : i === 1 ? `أمس (${d})` : d, 
                                    value: d 
                                }))}
                                keyExtractor={(item) => item.label}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={[
                                            styles.dateOptionBtn, 
                                            { borderBottomColor: theme.border },
                                            selectedDate === item.value && { backgroundColor: theme.primary + '15' }
                                        ]}
                                        onPress={() => {
                                            setSelectedDate(item.value);
                                            AsyncStorage.setItem('@admin_gomla_date', item.value).catch(() => {});
                                            setDateModalVisible(false);
                                            loadInvoices(item.value);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dateOptionText, 
                                            { color: selectedDate === item.value ? theme.primary : theme.text },
                                            selectedDate === item.value && { fontWeight: 'bold' }
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {selectedDate === item.value && (
                                            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    headerRight: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 12, 
        flex: 1 
    },
    backBtn: { padding: 4, marginLeft: -4 },
    headerTitleContainer: {
        alignItems: 'flex-end',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    titleUnderline: {
        width: 25,
        height: 4,
        marginTop: -2,
        borderRadius: 2,
    },
    headerIcons: { flexDirection: 'row-reverse', alignItems: 'center' },
    headerIconBtn: { padding: 4 },

    scrollContent: { padding: 20, paddingBottom: 50 },
    
    dateBanner: { marginBottom: 20, alignItems: 'flex-end' },
    dateBannerText: { fontSize: 15, fontWeight: '800' },
    
    statsRow: { flexDirection: 'row-reverse', gap: 15, marginBottom: 25 },
    statBox: { flex: 1, padding: 15, borderRadius: 20, borderWidth: 1 },
    statIconContainer: { marginBottom: 10 },
    statValue: { fontSize: 24, fontWeight: 'bold', textAlign: 'right', marginBottom: 2 },
    statLabel: { fontSize: 13, textAlign: 'right', fontWeight: '600' },
    
    progressBarBg: { height: 6, borderRadius: 3, flexDirection: 'row-reverse', overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
    
    invoiceCard: { borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1 },
    invoiceHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 15 },
    idBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
    idText: { fontSize: 12, fontWeight: 'bold' },
    clientName: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'right' },
    
    invoiceProgressContainer: { marginBottom: 10 },
    
    divider: { height: 1, marginVertical: 12 },
    
    invoiceFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    statusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 12, fontWeight: '800' },
    totalText: { fontSize: 14, fontWeight: '900' },
    
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    emptyText: { marginTop: 15, fontSize: 15, fontWeight: 'bold' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 24, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    dateOptionBtn: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
    dateOptionText: { fontSize: 15, fontWeight: '600' },
});
