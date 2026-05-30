
import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator,
    RefreshControl,
    Platform,
    Modal,
    StatusBar,
    Dimensions,
    TextInput,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminStatistics } from '../../hooks/useAdminStatistics';
import { LinearGradient } from 'expo-linear-gradient';
import { storage } from '@/utils/storage';
import { useRouter } from '@/hooks/useRouter';
import { useRoleGuard } from '@/shared/guards/useRoleGuard';
import { apiFetch } from '@/api/api-client';


const { width } = Dimensions.get('window');

// Custom Components
const Header = ({ onBack, onOpenFilter, onPrepareAll, theme }: any) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
            <TouchableOpacity style={[styles.backCircle, { backgroundColor: theme.card }]} onPress={onBack}>
                <Ionicons name="arrow-forward" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>الإحصائيات</Text>
                <View style={[styles.titleUnderline, { backgroundColor: theme.primary }]} />
            </View>

            <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={onOpenFilter}>
                   <Ionicons name="filter" size={24} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn} onPress={onPrepareAll}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const KPIBlock = ({ size, title, value, icon, color, theme, onPress }: any) => {
    const isLarge = size === 'large';
    const isSmall = size === 'small';
    const CardComp = onPress ? TouchableOpacity : View;
    
    return (
        <CardComp 
            onPress={onPress}
            style={[
                styles.kpiCard, 
                isLarge && styles.kpiCardLarge,
                isSmall && styles.kpiCardSmall,
                { backgroundColor: theme.surface, borderColor: theme.border + '20' }
            ]}
        >
            <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={isLarge ? 28 : 22} color={color} />
            </View>
            <View style={styles.kpiContent}>
                <Text style={[styles.kpiValue, isLarge && styles.kpiValueLarge, { color: theme.text }]}>{value}</Text>
                <Text style={[styles.kpiTitle, { color: theme.muted }]}>{title}</Text>
            </View>
        </CardComp>
    );
};

export const AdminStatistics = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];
    const { loading: authLoading, authorized } = useRoleGuard('admin');

    const { 
        stats, loading, refresh,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        timeFrom, setTimeFrom,
        timeTo, setTimeTo,
        stores, selectedStore, setSelectedStore
    } = useAdminStatistics();

    // Calculate Progress and ETA with Shift-Aware Dynamic Speed Logic
    const totalPrepared = (stats?.inventoried_invoices ?? 0) + (stats?.uninventoried_invoices ?? 0);
    const completed = stats?.inventoried_invoices ?? 0;
    const progressPercent = totalPrepared > 0 ? Math.round((completed / totalPrepared) * 100) : 0;
    const remainingPercent = 100 - progressPercent;
    const remainingInvoices = stats?.uninventoried_invoices ?? 0;

    // Detect Active Shift:
    // Morning shift is until 5:00 PM (17:00). Night shift starts from 5:00 PM (17:00).
    const startHour = parseInt(timeFrom.split(':')[0], 10) || 0;
    const isNightShift = startHour >= 17 || startHour < 6;
    
    // Shift parameters:
    const shiftName = isNightShift ? 'الوردية المسائية (الليل)' : 'الوردية الصباحية (النهار)';
    
    // Control Start Times:
    // Morning Control starts at 9:00 AM (09:00). Night Control starts at 11:00 PM (23:00).
    const controlStartHour = isNightShift ? 23 : 9;
    const controlStartTimeStr = isNightShift ? '11:00 م' : '09:00 ص';

    const now = new Date();
    
    // Define Control start date/time for the selected dateFrom:
    const controlStart = new Date(dateFrom);
    controlStart.setHours(controlStartHour, 0, 0, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateFrom === todayStr;

    // Calculate actual invoices jarded per hour since Control shift started:
    let speedPerHour = 15; // default benchmark rate (4 mins per invoice)
    let isSpeedStandard = true;
    let controlStatusStr = '';
    let isControlWorking = false;

    if (isToday) {
        if (now < controlStart) {
            controlStatusStr = `الكنترول لم يبدأ بعد (يبدأ ${controlStartTimeStr})`;
            isControlWorking = false;
        } else {
            controlStatusStr = 'الكنترول قيد العمل ⚡';
            isControlWorking = true;
            
            // Calculate elapsed hours since Control started working
            const elapsedMs = now.getTime() - controlStart.getTime();
            const elapsedHours = elapsedMs / (1000 * 60 * 60);
            
            if (elapsedHours > 0.1) { // If at least 6 minutes have passed
                // Calculate rate: completed / elapsedHours
                const rawSpeed = completed / elapsedHours;
                // Cap it between 6 and 35 to keep it extremely realistic and stable
                speedPerHour = Math.max(Math.min(rawSpeed, 35), 6);
                isSpeedStandard = false;
            }
        }
    } else {
        // Historical / Future date
        controlStatusStr = `توقيت الوردية القياسي`;
        isControlWorking = true;
    }

    // Round the speed for presentation
    const displaySpeed = Math.round(speedPerHour);

    // Calculate remaining minutes based on the dynamic speed:
    const totalRemainingMinutes = speedPerHour > 0 
        ? Math.round((remainingInvoices / speedPerHour) * 60) 
        : 0;

    let completionTimeStr = '';
    if (remainingInvoices === 0) {
        completionTimeStr = 'تم الانتهاء من العمل بالكامل! 🎉';
        controlStatusStr = 'مكتمل ✅';
        isControlWorking = true;
    } else {
        let baseTime = new Date();
        if (isToday && now < controlStart) {
            baseTime = controlStart;
        } else {
            baseTime = now;
        }
        
        baseTime.setMinutes(baseTime.getMinutes() + totalRemainingMinutes);
        
        const expectedTimeStr = baseTime.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        completionTimeStr = `متوقع الانتهاء الساعة ${expectedTimeStr}`;
    }

    const [showFilterModal, setShowFilterModal] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
    const [inventoryModalStatus, setInventoryModalStatus] = useState<'inventoried' | 'uninventoried' | 'open'>('uninventoried');
    const [inventoryInvoices, setInventoryInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    const openInventoryModal = async (status: 'inventoried' | 'uninventoried' | 'open') => {
        setInventoryModalStatus(status);
        setInventoryModalVisible(true);
        setLoadingInvoices(true);
        try {
            const url = `/api/v1/admin/invoices/by-inventory-status?store_id=${selectedStore}&date_from=${dateFrom}&date_to=${dateTo}&time_from=${timeFrom}&time_to=${timeTo}&status=${status}`;
            const res = await apiFetch(url);
            if (res.ok) {
                const data = await res.json();
                setInventoryInvoices(data);
            }
        } catch (error) {
            console.error("Error loading inventory invoices:", error);
        } finally {
            setLoadingInvoices(false);
        }
    };

    const handlePrepareAll = async () => {
        Alert.alert(
            'تأكيد تحضير (جرد) الفواتير',
            'هل أنت متأكد من جرد/تحضير كل الفواتير المغلقة في هذه الوردية؟ سيتم تمييزها كجاهزة ومجردة.',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'نعم، جرد الكل',
                    style: 'destructive',
                    onPress: async () => {
                        setPreparing(true);
                        try {
                            const url = `/api/v1/admin/invoices/prepare-all?store_id=${selectedStore}&date_from=${dateFrom}&date_to=${dateTo}&time_from=${timeFrom}&time_to=${timeTo}`;
                            const res = await apiFetch(url, { method: 'POST' });
                            if (res.ok) {
                                Alert.alert('نجاح', 'تم تحضير وجرد جميع الفواتير المغلقة بنجاح');
                                refresh();
                            } else {
                                Alert.alert('خطأ', 'فشل في عملية جرد الفواتير');
                            }
                        } catch (error) {
                            console.error('Error preparing all closed invoices:', error);
                            Alert.alert('خطأ', 'حدث خطأ غير متوقع');
                        } finally {
                            setPreparing(false);
                        }
                    }
                }
            ]
        );
    };

    // Helpers for display
    const formatTimeArabic = (timeStr: string) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'م' : 'ص';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    };

    if ((authLoading || loading) && !stats) {
        return (
            <View style={[styles.mainContainer, { backgroundColor: '#0F172A' }]}>
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: '50%' }} />
            </View>
        );
    }

    if (!authorized) return null;

    return (

        <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            <Header 
                onBack={() => router.back()} 
                onOpenFilter={() => setShowFilterModal(true)} 
                onPrepareAll={handlePrepareAll}
                theme={theme} 
                colorScheme={colorScheme} 
            />
            
            <ScrollView 
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#3B82F6" />}
            >
                {/* Summary Section */}
                <View style={styles.summarySection}>
                    <Text style={[styles.summaryDates, { color: theme.text }]}>{dateFrom}  ←  {dateTo}</Text>
                    <Text style={[styles.summaryTimes, { color: theme.muted }]}>{formatTimeArabic(timeTo)}  ←  {formatTimeArabic(timeFrom)}</Text>
                </View>

                {/* KPI Grid */}
                <View style={styles.grid}>
                    {/* Row 1: Large Cash Card */}
                    <KPIBlock 
                        size="large"
                        title="إجمالي النقدية"
                        value={`${(stats?.total_cash ?? 0).toLocaleString()} ج.م`}
                        icon="cash-outline"
                        color="#10B981"
                        theme={theme}
                    />

                    {/* Row 2: Medium Cards */}
                    <View style={styles.row}>
                        <KPIBlock 
                            size="medium"
                            title="إجمالي الفواتير"
                            value={stats?.total_invoices}
                            icon="receipt-outline"
                            color="#3B82F6"
                            theme={theme}
                        />
                        <KPIBlock 
                            size="medium"
                            title="عدد الاصناف"
                            value={stats?.total_items}
                            icon="cube-outline"
                            color="#818CF8"
                            theme={theme}
                        />
                    </View>

                    {/* Row 3: Small Cards (3 across) */}
                    <View style={styles.row}>
                        <KPIBlock 
                            size="small"
                            title="فواتير لم تطبع"
                            value={stats?.unprinted_invoices}
                            icon="alert-circle-outline"
                            color="#EF4444"
                            theme={theme}
                        />
                        <KPIBlock 
                            size="small"
                            title="المفتوح"
                            value={stats?.open_invoices}
                            icon="reorder-two-outline"
                            color="#F59E0B"
                            theme={theme}
                            onPress={() => openInventoryModal('open')}
                        />
                        <KPIBlock 
                            size="small"
                            title="مغلق ولم تطبع"
                            value={stats?.closed_unprinted_invoices}
                            icon="lock-closed-outline"
                            color="#64748B"
                            theme={theme}
                        />
                    </View>

                    {/* Row 4: Inventory Invoices */}
                    <View style={styles.row}>
                        <KPIBlock 
                            size="medium"
                            title="فواتير لم يتم جردها"
                            value={stats?.uninventoried_invoices}
                            icon="close-circle-outline"
                            color="#F87171"
                            theme={theme}
                            onPress={() => openInventoryModal('uninventoried')}
                        />
                         <KPIBlock 
                            size="medium"
                            title="فواتير تم جردها"
                            value={stats?.inventoried_invoices}
                            icon="checkmark-circle-outline"
                            color="#10B981"
                            theme={theme}
                            onPress={() => openInventoryModal('inventoried')}
                        />
                    </View>

                    {/* Row 5: Inventory Items */}
                    <View style={styles.row}>
                        <KPIBlock 
                            size="medium"
                            title="اصناف لم تجرد"
                            value={stats?.uninventoried_items}
                            icon="list-outline"
                            color="#FB7185"
                            theme={theme}
                        />
                        <KPIBlock 
                            size="medium"
                            title="اصناف تم جردها"
                            value={stats?.inventoried_items}
                            icon="checkmark-done-circle-outline"
                            color="#059669"
                            theme={theme}
                        />
                    </View>
                </View>

                {/* Progress Indicator Card */}
                <View style={styles.progressSection}>
                    <Text style={[styles.sectionLabel, { color: theme.text, textAlign: 'right', marginBottom: 15 }]}>مؤشر إنجاز الجرد والوردية</Text>
                    <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border + '30' }]}>
                        {/* Shift and Control Header */}
                        <View style={styles.shiftHeaderRow}>
                            <View style={[styles.shiftBadge, { backgroundColor: isNightShift ? '#818CF820' : '#3B82F620' }]}>
                                <Ionicons name={isNightShift ? "moon" : "sunny"} size={14} color={isNightShift ? '#818CF8' : '#3B82F6'} />
                                <Text style={[styles.shiftBadgeText, { color: isNightShift ? '#818CF8' : '#3B82F6' }]}>{shiftName}</Text>
                            </View>
                            <View style={[styles.controlStatusBadge, { backgroundColor: remainingInvoices === 0 ? '#10B98120' : (isControlWorking ? '#10B98115' : '#F59E0B20') }]}>
                                <View style={[styles.statusDot, { backgroundColor: remainingInvoices === 0 ? '#10B981' : (isControlWorking ? '#10B981' : '#F59E0B') }]} />
                                <Text style={[styles.controlStatusText, { color: remainingInvoices === 0 ? '#10B981' : (isControlWorking ? '#10B981' : '#F59E0B') }]}>{controlStatusStr}</Text>
                            </View>
                        </View>

                        <View style={styles.progressHeader}>
                            <Text style={[styles.progressTitle, { color: theme.text }]}>نسبة الإنجاز</Text>
                            <Text style={[styles.progressPercentage, { color: theme.primary }]}>{progressPercent}%</Text>
                        </View>

                        <View style={[styles.barContainer, { backgroundColor: theme.border + '30' }]}>
                            <View 
                                style={[
                                    styles.progressBar, 
                                    { 
                                        width: `${progressPercent}%`, 
                                        backgroundColor: theme.primary 
                                    }
                                ]} 
                            />
                        </View>

                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: theme.muted }]}>سرعة الكنترول الفعلية</Text>
                            <Text style={[styles.metaValue, { color: theme.primary }]}>{displaySpeed} فاتورة / ساعة {isSpeedStandard ? '(تقديرية)' : '(أداء فعلي ⚡)'}</Text>
                        </View>

                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: theme.muted }]}>متبقي من الشغل</Text>
                            <Text style={[styles.metaValue, { color: theme.text }]}>{remainingPercent}% ({remainingInvoices} فاتورة)</Text>
                        </View>

                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: theme.muted }]}>فواتير تم جردها</Text>
                            <Text style={[styles.metaValue, { color: '#10B981' }]}>{completed} فاتورة</Text>
                        </View>

                        <View style={[styles.estimateBadge, { backgroundColor: remainingInvoices === 0 ? '#10B98115' : (isControlWorking ? theme.primary + '10' : '#F59E0B15') }]}>
                            <Ionicons 
                                name={remainingInvoices === 0 ? "checkmark-circle-outline" : (isControlWorking ? "time-outline" : "hourglass-outline")} 
                                size={18} 
                                color={remainingInvoices === 0 ? '#10B981' : (isControlWorking ? theme.primary : '#F59E0B')} 
                            />
                            <Text style={[styles.estimateText, { color: remainingInvoices === 0 ? '#10B981' : (isControlWorking ? theme.primary : '#F59E0B') }]}>{completionTimeStr}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Filter Modal */}
            <Modal visible={showFilterModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                    <Ionicons name="close" size={28} color={theme.text} />
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>تصفية النتائج</Text>
                                <View style={{ width: 28 }} />
                            </View>

                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                {/* Store Selection */}
                                <Text style={[styles.sectionLabel, { color: theme.muted }]}>
                                    <Ionicons name="business" size={16} color={theme.muted} /> المخزن / الفرع
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexDirection: 'row-reverse' }}>
                                    {stores && stores.map((store) => (
                                        <TouchableOpacity
                                            key={store.id}
                                            style={[
                                                styles.storeChip,
                                                selectedStore === store.id ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.card, borderColor: theme.border }
                                            ]}
                                            onPress={() => setSelectedStore(store.id)}
                                        >
                                            <Text style={[
                                                styles.storeChipText,
                                                selectedStore === store.id ? { color: '#FFF', fontWeight: 'bold' } : { color: theme.text }
                                            ]}>
                                                {store.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Date Section */}
                                <Text style={[styles.sectionLabel, { color: theme.muted }]}>
                                    <Ionicons name="calendar" size={16} color={theme.muted} /> نطاق التاريخ
                                </Text>
                                <View style={styles.filterGroup}>
                                    <TouchableOpacity style={[styles.filterBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                        <View style={styles.boxArrow}>
                                            <Ionicons name="chevron-back" size={20} color={theme.muted} />
                                        </View>
                                        <View style={styles.boxContent}>
                                             <Text style={[styles.boxLabel, { color: theme.muted }]}>من</Text>
                                             <TextInput 
                                                style={[styles.boxValue, { color: theme.text }]} 
                                                value={dateFrom} 
                                                onChangeText={setDateFrom}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.filterBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                        <View style={styles.boxArrow}>
                                            <Ionicons name="chevron-back" size={20} color={theme.muted} />
                                        </View>
                                        <View style={styles.boxContent}>
                                             <Text style={[styles.boxLabel, { color: theme.muted }]}>إلى</Text>
                                             <TextInput 
                                                style={[styles.boxValue, { color: theme.text }]} 
                                                value={dateTo} 
                                                onChangeText={setDateTo}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </TouchableOpacity>
                                </View>

                            {/* Time Section */}
                            <Text style={[styles.sectionLabel, { color: theme.muted }]}>
                                <Ionicons name="time" size={16} color={theme.muted} /> نطاق الوقت
                            </Text>
                            <View style={styles.filterGroup}>
                                <TouchableOpacity style={[styles.filterBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <View style={styles.boxArrow}>
                                        <Ionicons name="chevron-back" size={20} color={theme.muted} />
                                    </View>
                                    <View style={styles.boxContent}>
                                         <Text style={[styles.boxLabel, { color: theme.muted }]}>من</Text>
                                         <TextInput 
                                            style={[styles.boxValue, { color: theme.text }]} 
                                            value={formatTimeArabic(timeFrom)} 
                                            editable={false}
                                        />
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <View style={styles.boxArrow}>
                                        <Ionicons name="chevron-back" size={20} color={theme.muted} />
                                    </View>
                                    <View style={styles.boxContent}>
                                         <Text style={[styles.boxLabel, { color: theme.muted }]}>إلى</Text>
                                         <TextInput 
                                            style={[styles.boxValue, { color: theme.text }]} 
                                            value={formatTimeArabic(timeTo)} 
                                            editable={false}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Shift Preset (Night Shift) */}
                            <TouchableOpacity 
                                style={[styles.nightShiftPreset, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}
                                onPress={() => {
                                    setTimeFrom("17:00:00");
                                    setTimeTo("05:00:00");
                                }}
                            >
                                <Ionicons name="moon" size={20} color={theme.primary} />
                                <Text style={[styles.nightShiftText, { color: theme.primary }]}>تفعيل الوردية الليلية (17:00 - 05:00)</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.primary }]} onPress={() => setShowFilterModal(false)}>
                                <Text style={styles.applyBtnText}>تطبيق</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.clearBtn, { borderColor: theme.border }]} onPress={() => {
                                setDateFrom(new Date().toISOString().split('T')[0]);
                                setDateTo(new Date().toISOString().split('T')[0]);
                                setTimeFrom("00:00:00");
                                setTimeTo("23:59:59");
                                setShowFilterModal(false);
                            }}>
                                <Text style={[styles.clearBtnText, { color: theme.primary }]}>مسح التصفية</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Inventory Invoices Modal */}
            <Modal visible={inventoryModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setInventoryModalVisible(false)}>
                                <Ionicons name="close" size={28} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                {inventoryModalStatus === 'inventoried' ? 'فواتير تم جردها' : 
                                 inventoryModalStatus === 'open' ? 'فواتير مفتوحة' : 'فواتير لم يتم جردها'}
                            </Text>
                            <View style={{ width: 28 }} />
                        </View>

                        {loadingInvoices ? (
                            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 40 }} />
                        ) : !inventoryInvoices || inventoryInvoices.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: 40 }}>
                                <Ionicons name="receipt-outline" size={60} color={theme.muted} style={{ marginBottom: 15 }} />
                                <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>لا توجد فواتير في هذا النطاق</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 20 }}>
                                {inventoryInvoices.map((inv) => (
                                    <View 
                                        key={inv.id} 
                                        style={[
                                            styles.invoiceRowCard, 
                                            { backgroundColor: theme.card, borderColor: theme.border + '30' }
                                        ]}
                                    >
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 15 }}>{inv.pharmacy}</Text>
                                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                                <Text style={{ color: theme.muted, fontSize: 12 }}>رقم: {inv.id}</Text>
                                                <Text style={{ color: theme.muted, fontSize: 12 }}>{inv.time} {inv.date}</Text>
                                            </View>
                                        </View>
                                        
                                        <View style={{ alignItems: 'center', minWidth: 80, marginLeft: 15 }}>
                                            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{inv.total.toLocaleString()} ج.م</Text>
                                            <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>{inv.items_count} أصناف</Text>
                                        </View>

                                        <TouchableOpacity 
                                            style={[styles.detailsBtn, { backgroundColor: theme.primary + '15' }]}
                                            onPress={() => {
                                                setInventoryModalVisible(false);
                                                router.push({ pathname: '/(admin)/sale-details/[id]', params: { id: inv.id } });
                                            }}
                                        >
                                            <Ionicons name="eye-outline" size={20} color={theme.primary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1 },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 100,
    },
    backCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    titleUnderline: {
        width: 40,
        height: 3,
        backgroundColor: '#818CF8',
        marginTop: 4,
        borderRadius: 2,
    },
    headerIcons: {
        flexDirection: 'row-reverse',
        gap: 15,
    },
    headerIconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: { flex: 1 },
    summarySection: {
        alignItems: 'center',
        marginVertical: 10,
    },
    summaryDates: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
    },
    summaryTimes: {
        color: '#94A3B8',
        fontSize: 13,
        marginTop: 5,
    },
    grid: { padding: 15, gap: 12 },
    row: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        gap: 12,
    },
    kpiCard: {
        flex: 1,
        borderRadius: 28,
        padding: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiCardLarge: {
        height: 180,
        width: '100%',
        marginBottom: 15,
        borderRadius: 32,
    },
    kpiCardSmall: {
        flex: 1,
        padding: 10,
        borderRadius: 24,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    kpiContent: {
        alignItems: 'center',
    },
    kpiValue: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    kpiValueLarge: {
        fontSize: 32,
        marginVertical: 4,
    },
    kpiTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
        opacity: 0.8,
    },
    
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        padding: 25,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    sectionLabel: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 15,
        marginTop: 10,
    },
    filterGroup: {
        flexDirection: 'row-reverse',
        gap: 15,
        marginBottom: 20,
    },
    filterBox: {
        flex: 1,
        backgroundColor: '#33415550',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    boxArrow: {
        marginLeft: 10,
    },
    boxContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    boxLabel: {
        color: '#94A3B8',
        fontSize: 11,
        marginBottom: 4,
    },
    boxValue: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    nightShiftPreset: {
        padding: 15,
        borderRadius: 15,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        marginBottom: 20,
    },
    nightShiftText: {
        color: '#3B82F6',
        fontSize: 13,
        fontWeight: 'bold',
    },
    modalFooter: {
        flexDirection: 'row-reverse',
        gap: 15,
        marginTop: 10,
        paddingBottom: 20,
    },
    applyBtn: {
        flex: 1,
        backgroundColor: '#3B82F6',
        borderRadius: 20,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    clearBtn: {
        flex: 1,
        backgroundColor: 'transparent',
        borderRadius: 20,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    clearBtnText: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: 'bold',
    },
    
    // Progress Indicator Dashboard
    progressSection: {
        padding: 15,
        marginTop: 10,
    },
    progressCard: {
        borderRadius: 28,
        padding: 24,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    shiftHeaderRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    shiftBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    shiftBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    controlStatusBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    controlStatusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    progressHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressPercentage: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    barContainer: {
        height: 14,
        borderRadius: 7,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressBar: {
        height: '100%',
        borderRadius: 7,
    },
    metaRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    metaLabel: {
        fontSize: 13,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    estimateBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 8,
    },
    estimateText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    storeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginLeft: 10,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeChipText: {
        fontSize: 13,
    },
    invoiceRowCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    detailsBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    }
});

