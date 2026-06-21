import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    ActivityIndicator, Alert, ScrollView, Image, Modal, FlatList, SectionList, RefreshControl, Animated, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from '@/hooks/useRouter';
import { Colors } from '../../src/core/theme';
import { useTheme } from '@/context/ThemeContext';
import { BarcodeScannerModal } from '../../src/modules/gomla/components/BarcodeScannerModal';
import { TopPreparers } from '../../src/modules/gomla/components/TopPreparers';
import BarcodeLottie from '../../src/ui/shared/BarcodeLottie';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { fetchGomlaInvoice, fetchRecentGomlaInvoices } from '../../src/modules/gomla/services/gomlaService';
import { emitForceLogout } from '../../src/shared/guards/auth-events';
import { storage } from '@/shared/utils/storage';
import { processSyncQueue, getQueueLength, getFailedQueueLength } from '../../src/modules/gomla/services/syncManager';
import { getAvatarUrl } from '@/shared/utils/avatar';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

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
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    const [dateModalVisible, setDateModalVisible] = useState(false);
    const [preparersModalVisible, setPreparersModalVisible] = useState(false);
    
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

    const [headerHeight, setHeaderHeight] = useState(100);
    const [statsHeight, setStatsHeight] = useState(300);
    const scrollY = React.useRef(new Animated.Value(0)).current;
    
    const headerSpacer = Math.max(0, headerHeight - insets.top);

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, Math.max(0, statsHeight), Math.max(0, statsHeight + headerSpacer)],
        outputRange: [0, 0, -headerSpacer],
        extrapolate: 'clamp'
    });

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
                        preparation_time: inv.preparation_time,
                        date: inv.date,
                        is_fully_audited: inv.is_fully_audited,
                        audited_items: inv.audited_items || 0,
                        total_items: inv.total_items || 0,
                        audit_status: inv.audit_status,
                        editing_by_name: inv.editing_by_name,
                        audited_by_name: inv.audited_by_name,
                        editing_by_avatar: inv.editing_by_avatar,
                        audited_by_avatar: inv.audited_by_avatar,
                        timestamp: Date.now()
                    }));
                    
                    formatted.sort((a, b) => {
                        const getPriority = (inv: any) => {
                            if (inv.audit_status === 'editing' || (!inv.is_fully_audited && inv.audited_items > 0)) {
                                return 0; 
                            }
                            if (inv.is_fully_audited || inv.audit_status === 'audited') {
                                return 2; 
                            }
                            return 1; 
                        };
                        
                        const aPriority = getPriority(a);
                        const bPriority = getPriority(b);
                        
                        if (aPriority !== bPriority) {
                            return aPriority - bPriority; 
                        }
                        return b.timestamp - a.timestamp;
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
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
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

    useEffect(() => {
        const interval = setInterval(() => {
            loadUserAndRecent(selectedDate);
            
            processSyncQueue().then(() => {
                getQueueLength().then(setSyncCount);
                getFailedQueueLength().then(setFailedCount);
            });
        }, 3000); 
        
        getQueueLength().then(setSyncCount);
        getFailedQueueLength().then(setFailedCount);
        
        return () => clearInterval(interval);
    }, [selectedDate]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadUserAndRecent(selectedDate);
        setRefreshTrigger(prev => prev + 1);
    }, [selectedDate]);



    const handleSearch = async (idToSearch?: string) => {
        const id = idToSearch || invoiceId;
        if (!id.trim()) {
            Alert.alert("تنبيه", "برجاء إدخال رقم الفاتورة أولاً");
            return;
        }

        setOpenedInvoices(prev => {
            if (!prev.includes(id.toString())) {
                const newOpened = [...prev, id.toString()];
                AsyncStorage.setItem('@opened_gomla_invoices', JSON.stringify(newOpened)).catch(() => {});
                return newOpened;
            }
            return prev;
        });

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
    const firstName = (currentUser?.manager_name || currentUser?.full_name || '')?.split(' ')[0] || '';

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {loading ? (
                <View style={[styles.loaderContainer, { paddingTop: 100 }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loaderText, { color: theme.muted }]}>جارٍ جلب البيانات من قاعدة البيانات...</Text>
                </View>
            ) : (
                <AnimatedSectionList
                    style={{ flex: 1, marginTop: insets.top }}
                    sections={[{ title: `فواتير يوم ${selectedDate}`, data: recentInvoices } as any]}
                    keyExtractor={(item: any) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                    stickySectionHeadersEnabled={true}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh} 
                            colors={[theme.primary]} 
                        />
                    }
                    ListHeaderComponent={(
                        <View>
                            <DashboardHeader 
                                theme={theme}
                                insets={{ top: 0 }}
                                currentUser={currentUser}
                                unreadCount={0}
                                onPressProfile={() => router.push('/(gomla)/settings')}
                                onPressNotifications={() => setPreparersModalVisible(true)}
                                title="قسم الجملة"
                                firstName={firstName}
                                subtitle="مرحباً بك في"
                                rightIconName="trophy-outline"
                            />
                            <View style={{ paddingTop: 12 }}>
                                <View style={[styles.searchSection, { marginBottom: 12 }]}>
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

                                {/* Minimalist Stats Summary */}
                                <TouchableOpacity 
                                    style={{ marginTop: 15, marginHorizontal: '5%', flexDirection: 'row-reverse', gap: 12, marginBottom: 12 }} 
                                    activeOpacity={0.8}
                                    onPress={() => setDateModalVisible(true)}
                                >
                                    {/* Invoices Card */}
                                    <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, alignItems: 'center' }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                                            <Ionicons name="document-text" size={20} color={theme.primary} />
                                        </View>
                                        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>{auditedInvoicesCount} <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '600' }}>/ {totalInvoices}</Text></Text>
                                        <Text style={{ fontSize: 12, color: theme.muted, marginTop: 4, fontWeight: 'bold' }}>الفواتير المنجزة</Text>
                                    </View>

                                    {/* Items Card */}
                                    <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, alignItems: 'center' }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: (theme.accent || '#FF9800') + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                                            <Ionicons name="cube" size={20} color={theme.accent || '#FF9800'} />
                                        </View>
                                        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>{recentInvoices.reduce((sum, inv) => sum + (inv.audited_items || 0), 0)} <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '600' }}>/ {recentInvoices.reduce((sum, inv) => sum + (inv.total_items || 0), 0)}</Text></Text>
                                        <Text style={{ fontSize: 12, color: theme.muted, marginTop: 4, fontWeight: 'bold' }}>الأصناف المحضرة</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    renderSectionHeader={({ section: { title } }: { section: any }) => (
                        <View style={{ 
                            paddingHorizontal: '5%', 
                            paddingTop: 12, 
                            paddingBottom: 16, 
                            marginBottom: 8,
                            backgroundColor: theme.background
                        }}>
                            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900', textAlign: 'right' }}>{title}</Text>
                        </View>
                    )}
                    ListEmptyComponent={(
                        <View style={[styles.recentInvoicesPlaceholder, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: '5%', marginTop: 20 }]}>
                            <Ionicons name="file-tray-outline" size={32} color={theme.muted} style={{ marginBottom: 8 }} />
                            <Text style={[styles.recentInvoicesPlaceholderText, { color: theme.muted }]}>لا توجد فواتير تم تحضيرها مؤخراً</Text>
                        </View>
                    )}
                    renderItem={({ item }: { item: any }) => {
                            const steps = ['كتابة', 'بداية التحضير', 'تم التحضير'];
                            const isAudited = item.is_fully_audited === true || item.audit_status === 'audited';
                            
                            return (
                                <TouchableOpacity 
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

                                    <View style={[styles.orderFinancialFooter, { borderTopColor: theme.border, justifyContent: 'space-between', alignItems: 'center' }]}>
                                        {/* Right Side: Preparer Info */}
                                        <View style={[styles.orderFooterItem, { flex: 1, marginLeft: 10 }]}>
                                            {item.audited_by_avatar || item.editing_by_avatar ? (
                                                <Image 
                                                    source={{ uri: getAvatarUrl(item.audited_by_avatar || item.editing_by_avatar) || '' }} 
                                                    style={{ width: 24, height: 24, borderRadius: 12, marginLeft: 6, borderWidth: 1, borderColor: theme.primary }} 
                                                />
                                            ) : (
                                                <Ionicons name="person-circle" size={24} color={theme.primary} style={{ marginLeft: 6 }} />
                                            )}
                                            <Text style={[styles.orderFooterValue, { color: theme.text, flexShrink: 1, fontSize: 13, fontWeight: '700' }]}>
                                                {item.audited_by_name || item.editing_by_name || 'غير محدد'}
                                            </Text>
                                        </View>

                                        {/* Left Side: Items & Time */}
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 16 }}>
                                            <View style={styles.orderFooterItem}>
                                                <Ionicons name="cube-outline" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
                                                <Text style={[styles.orderFooterValue, { color: theme.text, fontSize: 13, fontWeight: '700' }]}>
                                                    {item.audited_items || 0} / {item.total_items || 0}
                                                </Text>
                                            </View>
                                            <View style={styles.orderFooterItem}>
                                                <Ionicons name="time-outline" size={16} color={theme.accent} style={{ marginLeft: 4 }} />
                                                <Text style={[styles.orderPriceText, { color: theme.accent, fontSize: 13, fontWeight: '700' }]} numberOfLines={1}>
                                                    {item.preparation_time || '--'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
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
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setDateModalVisible(false)}
                >
                    <View 
                        style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border, width: '100%' }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>تحديد يوم العمل</Text>
                            <TouchableOpacity onPress={() => setDateModalVisible(false)} style={{ backgroundColor: theme.background, padding: 6, borderRadius: 20 }}>
                                <Ionicons name="close" size={22} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: theme.muted }]}>اختر اليوم الذي ترغب في عرض وإدارة فواتيره:</Text>
                        
                        <ScrollView style={{ marginTop: 16, maxHeight: 400 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10, gap: 12 }}>
                            {pastDays.map((d, i) => {
                                const label = i === 0 ? `اليوم (${d})` : i === 1 ? `أمس (${d})` : d;
                                const isSelected = selectedDate === d;
                                return (
                                    <TouchableOpacity 
                                        key={d}
                                        style={[
                                            { 
                                                flexDirection: 'row-reverse', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between',
                                                padding: 16, 
                                                borderRadius: 16,
                                                backgroundColor: isSelected ? theme.primary + '12' : theme.background,
                                                borderWidth: 1,
                                                borderColor: isSelected ? theme.primary + '40' : theme.border,
                                            }
                                        ]}
                                        onPress={() => {
                                            setSelectedDate(d);
                                            AsyncStorage.setItem('@gomla_dashboard_date', d).catch(() => {});
                                            setDateModalVisible(false);
                                            loadUserAndRecent(d);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isSelected ? theme.primary : theme.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                                                <Ionicons name="calendar" size={20} color={isSelected ? '#FFF' : theme.muted} />
                                            </View>
                                            <Text style={{ color: isSelected ? theme.primary : theme.text, fontSize: 16, fontWeight: isSelected ? '800' : '600' }}>
                                                {label}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={26} color={theme.primary} />
                                        )}
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Top Preparers Modal */}
            <Modal visible={preparersModalVisible} transparent animationType="slide">
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPreparersModalVisible(false)}
                >
                    <View 
                        style={[styles.modalContent, { backgroundColor: theme.surface, width: '100%' }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>إحصائيات الإنجاز</Text>
                            <TouchableOpacity onPress={() => setPreparersModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, paddingBottom: 20 }}>
                            <TopPreparers selectedDate={selectedDate} refreshTrigger={refreshTrigger} />
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Dummy Status Bar Background to hide sliding content completely */}
            <View style={{ position: 'absolute', top: -300, left: -50, right: -50, height: 300 + insets.top, backgroundColor: theme.background, zIndex: 100 }} />
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
        ...StyleSheet.absoluteFill as any,
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
    modalCloseBtn: {
        padding: 4,
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
