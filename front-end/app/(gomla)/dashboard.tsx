import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    ActivityIndicator, Alert, ScrollView, Image, Modal, FlatList, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from '@/hooks/useRouter';
import { Colors } from '../../src/core/theme';
import { useTheme } from '@/context/ThemeContext';
import { BarcodeScannerModal } from '../../src/modules/gomla/components/BarcodeScannerModal';
import BarcodeLottie from '../../src/ui/shared/BarcodeLottie';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { fetchGomlaInvoice, fetchRecentGomlaInvoices } from '../../src/modules/gomla/services/gomlaService';
import { emitForceLogout } from '../../src/shared/guards/auth-events';
import { storage } from '@/shared/utils/storage';
import { processSyncQueue, getQueueLength, getFailedQueueLength } from '../../src/modules/gomla/services/syncManager';
import { getAvatarUrl } from '@/shared/utils/avatar';

export default function GomlaDashboard() {
    const { colorScheme } = useTheme();
    const insets = useSafeAreaInsets();
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const [invoiceId, setInvoiceId] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [openedInvoices, setOpenedInvoices] = useState<string[]>([]);
    const [syncCount, setSyncCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    
    const [dateModalVisible, setDateModalVisible] = useState(false);
    
    const pastDays = React.useMemo(() => {
        const days = [];
        for (let i = 0; i < 5; i++) {
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

    const loadUserAndRecent = async (dateStr = selectedDate) => {
        try {
            const userJson = await storage.getItem('user');
            if (userJson) {
                setCurrentUser(JSON.parse(userJson));
            }
            
            try {
                const dbRecent = await fetchRecentGomlaInvoices(50, dateStr || undefined);
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
                        timestamp: Date.now()
                    }));
                    
                    formatted.sort((a, b) => {
                        const getPriority = (inv: any) => {
                            // Highest priority (top): Currently being edited OR partially audited
                            if (inv.audit_status === 'editing' || (!inv.is_fully_audited && inv.audited_items > 0)) {
                                return 0; 
                            }
                            // Lowest priority (bottom): Fully audited
                            if (inv.is_fully_audited || inv.audit_status === 'audited') {
                                return 2; 
                            }
                            // Pending (Middle)
                            return 1; 
                        };
                        
                        const aPriority = getPriority(a);
                        const bPriority = getPriority(b);
                        
                        if (aPriority !== bPriority) {
                            return aPriority - bPriority; 
                        }
                        return b.id - a.id;
                    });
                    
                    setRecentInvoices(formatted);
                } else {
                    setRecentInvoices([]);
                }
            } catch (err) {
                console.error("Failed to fetch recent invoices from server:", err);
            }
            
            try {
                const openedJson = await AsyncStorage.getItem('@opened_gomla_invoices');
                if (openedJson) {
                    setOpenedInvoices(JSON.parse(openedJson));
                }
            } catch (e) {}
        } catch (error) {
            console.error("Failed to load user", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const savedDate = await AsyncStorage.getItem('@gomla_dashboard_date');
                if (savedDate && pastDays.includes(savedDate)) {
                    setSelectedDate(savedDate);
                    loadUserAndRecent(savedDate);
                } else {
                    loadUserAndRecent(pastDays[0]);
                }
            } catch (e) {
                loadUserAndRecent(pastDays[0]);
            }
        };
        init();
    }, [pastDays]);

    // Re-check recent invoices when screen mounts or changes
    // Since Expo Router keeps screens in stack, we will reload when dashboard is re-focused
    useEffect(() => {
        const interval = setInterval(() => {
            loadUserAndRecent(selectedDate);
            
            // Background Sync Manager
            processSyncQueue().then(() => {
                getQueueLength().then(setSyncCount);
                getFailedQueueLength().then(setFailedCount);
            });
        }, 3000); // Poll recent invoices list every 3s to reflect any external changes seamlessly
        
        // Initial check for sync queue
        getQueueLength().then(setSyncCount);
        getFailedQueueLength().then(setFailedCount);
        
        return () => clearInterval(interval);
    }, [selectedDate]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadUserAndRecent(selectedDate);
        setRefreshing(false);
    }, [selectedDate]);



    const handleSearch = async (idToSearch?: string) => {
        const id = idToSearch || invoiceId;
        if (!id.trim()) {
            Alert.alert("تنبيه", "برجاء إدخال رقم الفاتورة أولاً");
            return;
        }

        // Track opened invoice locally to dim it if needed
        setOpenedInvoices(prev => {
            if (!prev.includes(id.toString())) {
                const newOpened = [...prev, id.toString()];
                AsyncStorage.setItem('@opened_gomla_invoices', JSON.stringify(newOpened)).catch(() => {});
                return newOpened;
            }
            return prev;
        });

        // Navigate directly without doing a duplicate fetch!
        router.push({ pathname: '/(gomla)/invoice', params: { id: id.toString() } });
    };

    const handleScan = (barcode: string) => {
        setScannerVisible(false);
        setInvoiceId(barcode);
        handleSearch(barcode);
    };

    const totalInvoices = recentInvoices.length;
    const auditedInvoicesCount = recentInvoices.filter(i => i.is_fully_audited).length;
    const totalItems = recentInvoices.reduce((sum, inv) => sum + (inv.total_items || 0), 0);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loaderText, { color: theme.muted }]}>جارٍ جلب البيانات من قاعدة البيانات...</Text>
                </View>
            ) : (
                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
                    }
                >
                    {/* Gomla Dashboard Header */}
                    <View style={{ marginBottom: 20 }}>
                        <DashboardHeader 
                            theme={theme}
                            insets={insets}
                            currentUser={currentUser}
                            unreadCount={0}
                            onPressProfile={() => router.push('/(gomla)/settings')}
                            onPressNotifications={() => {}}
                            title="قسم الجملة"
                            subtitle="مرحباً بك في"
                        />
                    </View>

                    <View style={[styles.searchSection, { marginBottom: 24 }]}>
                        <View style={[
                            styles.searchBox, 
                            { 
                                backgroundColor: isDark ? theme.surface : '#FFFFFF', 
                                borderColor: theme.primary + '30', 
                                shadowColor: theme.primary,
                                elevation: isDark ? 4 : 12,
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: isDark ? 0.2 : 0.15,
                                shadowRadius: 16,
                            }
                        ]}>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="ابحث برقم الفاتورة..."
                                placeholderTextColor={theme.placeholder}
                                value={invoiceId}
                                onChangeText={setInvoiceId}
                                keyboardType="number-pad"
                                onSubmitEditing={() => handleSearch()}
                            />
                            {invoiceId.length > 0 && (
                                <TouchableOpacity 
                                    style={styles.clearBtn}
                                    onPress={() => setInvoiceId('')}
                                >
                                    <Ionicons name="close-circle" size={20} color={theme.placeholder} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setScannerVisible(true)}>
                                <BarcodeLottie style={{ width: 40, height: 40 }} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {syncCount > 0 && (
                        <View style={{ marginHorizontal: '5%', marginBottom: 16, backgroundColor: theme.accent + '20', padding: 12, borderRadius: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="cloud-offline-outline" size={24} color={theme.accent} />
                                <Text style={{ color: theme.accent, fontWeight: 'bold' }}>وضع عدم الاتصال</Text>
                            </View>
                            <Text style={{ color: theme.text, fontSize: 13 }}>{syncCount} صنف في انتظار المزامنة</Text>
                        </View>
                    )}

                    {failedCount > 0 && (
                        <View style={{ marginHorizontal: '5%', marginBottom: 16, backgroundColor: '#FFEBEB', padding: 12, borderRadius: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#FFCDD2' }}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="warning-outline" size={24} color="#D32F2F" />
                                <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>تحذير هام</Text>
                            </View>
                            <Text style={{ color: '#D32F2F', fontSize: 13, flex: 1, textAlign: 'left', marginRight: 10 }}>يوجد {failedCount} أصناف رفض السيرفر حفظها، يرجى مراجعة الفواتير.</Text>
                        </View>
                    )}

                    {/* Wholesale Stats Card (Premium BalanceCard Style) */}
                    <TouchableOpacity 
                        style={styles.balanceCard} 
                        activeOpacity={0.9}
                        onPress={() => setDateModalVisible(true)}
                    >
                        <Image source={require('@/assets/images/balance_bg.png')} style={styles.balanceBg} resizeMode="cover" />
                        <View style={styles.balanceOverlay} />
                        <View style={styles.balanceContent}>
                            <View style={styles.balanceHeader}>
                                <Text style={styles.balanceLabel}>إحصائيات الإنجاز (يوم {selectedDate})</Text>
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>مباشر</Text>
                                </View>
                            </View>
                            
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
                                {/* Invoices Stats Box */}
                                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 'bold' }}>الفواتير</Text>
                                        <Ionicons name="document-text" size={16} color="#A5D6A7" />
                                    </View>
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', marginTop: 10, gap: 4 }}>
                                        <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFF' }}>{auditedInvoicesCount}</Text>
                                        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>من {totalInvoices}</Text>
                                    </View>
                                    
                                    {/* Progress Bar */}
                                    <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 10, overflow: 'hidden', flexDirection: 'row-reverse' }}>
                                        <View style={{ width: totalInvoices > 0 ? `${(auditedInvoicesCount/totalInvoices)*100}%` : '0%', height: '100%', backgroundColor: '#A5D6A7', borderRadius: 3 }} />
                                    </View>
                                    <Text style={{ fontSize: 11, color: '#FFB74D', marginTop: 8, textAlign: 'left', fontWeight: 'bold' }}>{totalInvoices - auditedInvoicesCount} متبقية</Text>
                                </View>

                                {/* Items Stats Box */}
                                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 'bold' }}>الأصناف</Text>
                                        <Ionicons name="cube" size={16} color="#81C784" />
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', marginTop: 10, gap: 4 }}>
                                        <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFF' }}>{recentInvoices.reduce((sum, inv) => sum + (inv.audited_items || 0), 0)}</Text>
                                        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>من {recentInvoices.reduce((sum, inv) => sum + (inv.total_items || 0), 0)}</Text>
                                    </View>

                                    {/* Progress Bar */}
                                    <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 10, overflow: 'hidden', flexDirection: 'row-reverse' }}>
                                        <View style={{ width: recentInvoices.reduce((sum, inv) => sum + (inv.total_items || 0), 0) > 0 ? `${(recentInvoices.reduce((sum, inv) => sum + (inv.audited_items || 0), 0)/recentInvoices.reduce((sum, inv) => sum + (inv.total_items || 0), 0))*100}%` : '0%', height: '100%', backgroundColor: '#81C784', borderRadius: 3 }} />
                                    </View>
                                    <Text style={{ fontSize: 11, color: '#FFB74D', marginTop: 8, textAlign: 'left', fontWeight: 'bold' }}>{recentInvoices.reduce((sum, inv) => sum + ((inv.total_items || 0) - (inv.audited_items || 0)), 0)} متبقية</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Recent Invoices Section (SmallOrderCard Style) */}
                    <View style={{ marginTop: 10, paddingHorizontal: '5%', marginBottom: 12 }}>
                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', textAlign: 'right' }}>فواتير يوم {selectedDate}</Text>
                    </View>

                    {recentInvoices.length > 0 ? (
                        recentInvoices.map((item) => {
                            const steps = ['كتابة', 'بداية التحضير', 'تم التحضير'];
                            const isAudited = item.is_fully_audited === true || item.audit_status === 'audited';
                            
                            return (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={[styles.orderCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                    onPress={() => handleSearch(item.id.toString())}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.orderHeaderRow}>
                                        <Text style={[styles.orderSupplierName, { color: theme.primary }]} numberOfLines={1}>
                                            {item.clientName}
                                        </Text>
                                        <View style={[styles.orderIdBadge, { backgroundColor: theme.primary + '10' }]}>
                                            <Text style={[styles.orderIdText, { color: theme.primary }]}>#{item.id}</Text>
                                        </View>
                                    </View>

                                    {(item.editing_by_name || item.audited_by_name) ? (() => {
                                        const auditorName = item.audited_by_name || item.editing_by_name;
                                        const statusText = isAudited ? `تم التحضير بواسطة: ${auditorName}` : `جاري التحضير بواسطة: ${auditorName}`;
                                        const statusColor = isAudited ? '#4CAF50' : theme.accent;
                                        return (
                                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, marginTop: -4 }}>
                                                <Ionicons name="person-circle-outline" size={16} color={statusColor} style={{ marginLeft: 4 }} />
                                                <Text style={{ fontSize: 12, color: statusColor, fontWeight: 'bold' }}>
                                                    {statusText}
                                                </Text>
                                            </View>
                                        );
                                    })() : null}

                                    <View style={styles.orderProgressContainer}>
                                        <View style={styles.orderStepsRow}>
                                            {steps.map((step, idx) => {
                                                const stepNum = idx + 1;
                                                let isCompleted = false;
                                                let isActive = false;
                                                
                                                const hasItems = (item.audited_items && item.audited_items > 0);
                                                if (stepNum === 1) {
                                                    isCompleted = true; // Always created
                                                } else if (stepNum === 2) {
                                                    isCompleted = hasItems || isAudited;
                                                    isActive = !isCompleted;
                                                } else if (stepNum === 3) {
                                                    isCompleted = isAudited;
                                                    isActive = hasItems && !isAudited;
                                                }
                                                
                                                return (
                                                    <React.Fragment key={idx}>
                                                        <View style={styles.orderStepItem}>
                                                            <View style={[
                                                                styles.orderDot, 
                                                                { borderColor: theme.border },
                                                                isCompleted && { backgroundColor: theme.primary, borderColor: theme.primary },
                                                                isActive && { backgroundColor: theme.accent, borderColor: theme.accent }
                                                            ]}>
                                                                {isCompleted ? (
                                                                    <Ionicons name="checkmark" size={10} color="#FFF" />
                                                                ) : (
                                                                    <Text style={[styles.orderDotText, isActive && { color: '#FFF' }]}>{stepNum}</Text>
                                                                )}
                                                            </View>
                                                            <Text style={[
                                                                styles.orderStepLabel, 
                                                                { color: theme.muted },
                                                                (isActive || isCompleted) && { color: theme.primary, fontWeight: '800' }
                                                            ]}>{step}</Text>
                                                        </View>
                                                        {idx < steps.length - 1 && (
                                                            <View style={styles.orderConnector}>
                                                                {[1, 2, 3, 4, 5, 6].map((seg, sIdx) => (
                                                                    <View 
                                                                        key={sIdx}
                                                                        style={[
                                                                            styles.orderConnectorSegment,
                                                                            { 
                                                                                backgroundColor: (stepNum < 2) ? theme.primary : theme.border,
                                                                                marginRight: sIdx === 5 ? 0 : 3
                                                                            }
                                                                        ]}
                                                                    />
                                                                ))}
                                                            </View>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    <View style={[styles.orderFinancialFooter, { borderTopColor: theme.border }]}>
                                        <View style={styles.orderFooterItem}>
                                            <Ionicons name="calendar-outline" size={14} color={theme.muted} style={{ marginLeft: 4 }} />
                                            <Text style={[styles.orderFooterValue, { color: theme.text }]}>{item.date}</Text>
                                        </View>
                                        <View style={styles.orderFooterItem}>
                                            <Ionicons name="cube-outline" size={14} color={theme.primary} style={{ marginLeft: 4 }} />
                                            <Text style={[styles.orderFooterValue, { color: theme.text }]}>
                                                {item.audited_items || 0} / {item.total_items || 0} صنف
                                            </Text>
                                        </View>
                                        <View style={styles.orderFooterItem}>
                                            <Ionicons name="cash-outline" size={14} color={theme.accent} style={{ marginLeft: 4 }} />
                                            <Text style={[styles.orderPriceText, { color: theme.accent }]}>{item.total} ج.م</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <View style={[styles.recentInvoicesPlaceholder, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: '5%' }]}>
                            <Ionicons name="file-tray-outline" size={32} color={theme.muted} style={{ marginBottom: 8 }} />
                            <Text style={[styles.recentInvoicesPlaceholderText, { color: theme.muted }]}>لا توجد فواتير تم تحضيرها مؤخراً</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Scanner Modal */}
            <BarcodeScannerModal 
                visible={scannerVisible} 
                onClose={() => setScannerVisible(false)} 
                onScan={handleScan} 
                hintText="قم بتوجيه الكاميرا إلى باركود الفاتورة"
            />

            {/* Date Selection Modal */}
            <Modal
                visible={dateModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setDateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>تحديد تاريخ التحضير</Text>
                            <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                                <Ionicons name="close-circle" size={28} color={theme.muted} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: theme.muted }]}>اختر اليوم الذي ترغب في عرض فواتيره:</Text>
                        
                        <View style={{ flex: 1, marginTop: 10 }}>
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
                                            AsyncStorage.setItem('@gomla_dashboard_date', item.value).catch(() => {});
                                            setDateModalVisible(false);
                                            loadUserAndRecent(item.value);
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
    container: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loaderText: {
        marginTop: 15,
        fontSize: 15,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: '5%',
    },
    locationContainer: {
        alignItems: 'flex-end',
    },
    deliverToText: {
        fontSize: 12,
        fontWeight: '600',
    },
    locationRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginTop: 4,
    },
    locationText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    logoutBtnCircle: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchSection: {
        paddingHorizontal: 20,
        zIndex: 10,
    },
    searchBox: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 60,
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        height: '100%',
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'right',
    },
    clearBtn: {
        padding: 5,
        marginHorizontal: 5,
    },
    balanceCard: {
        marginHorizontal: '5%',
        borderRadius: 24,
        minHeight: 190,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 8,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    balanceBg: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    balanceOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(26, 35, 126, 0.45)',
    },
    balanceContent: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    balanceHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontWeight: 'bold',
    },
    balanceMain: {
        flexDirection: 'row-reverse',
        alignItems: 'baseline',
    },
    balanceAmount: {
        color: '#FFFFFF',
        fontSize: 34,
        fontWeight: '900',
        lineHeight: 40,
    },
    currency: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginRight: 6,
    },
    balanceFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    consumptionContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    consumptionValue: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    lastUpdate: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        fontWeight: 'bold',
    },
    orderCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 12,
        marginBottom: 12,
        marginHorizontal: '5%',
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    orderHeaderRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderSupplierName: {
        fontSize: 15,
        fontWeight: '900',
        textAlign: 'right',
        flex: 1,
    },
    orderIdBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    orderIdText: {
        fontSize: 12,
        fontWeight: '800',
    },
    orderProgressContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginVertical: 4,
        paddingHorizontal: 4,
    },
    orderStepsRow: {
        flex: 1,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderStepItem: {
        alignItems: 'center',
        gap: 4,
    },
    orderDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    orderDotText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#999',
    },
    orderStepLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
    orderConnector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: -16,
        marginHorizontal: -2,
    },
    orderConnectorSegment: {
        width: 4,
        height: 2,
        borderRadius: 1,
    },
    orderFinancialFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
    },
    orderFooterItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    orderFooterValue: {
        fontSize: 11,
        fontWeight: '800',
    },
    orderPriceText: {
        fontSize: 14,
        fontWeight: '900',
    },
    recentInvoicesPlaceholder: {
        width: '90%',
        paddingVertical: 30,
        borderRadius: 18,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    recentInvoicesPlaceholderText: {
        fontSize: 13,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        height: '60%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        fontSize: 14,
        textAlign: 'right',
        marginBottom: 10,
    },
    dateOptionBtn: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderRadius: 8,
    },
    dateOptionText: {
        fontSize: 16,
    },
});
