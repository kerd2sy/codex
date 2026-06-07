import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform, ActivityIndicator, Modal, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { useRouter } from '@/hooks/useRouter';
import { storage } from '@/shared/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceCalendar, AttendanceRecord } from '@/ui/components/AttendanceCalendar';
import { EmployeeLoansView } from '@/ui/components/EmployeeLoansView';
import { useFocusEffect } from 'expo-router';
import { apiFetch } from '@/shared/api/api-client';

export default function EmployeeDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [employeeData, setEmployeeData] = useState<any>(null);
    const [employeeProfile, setEmployeeProfile] = useState<any>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);

    const [attendanceData, setAttendanceData] = useState<AttendanceRecord>({});
    const [dailyProductivity, setDailyProductivity] = useState<any[]>([]);
    const [selectedDailyProd, setSelectedDailyProd] = useState<any | null>(null);
    const [prodModalVisible, setProdModalVisible] = useState(false);

    const loadData = async (targetDate: Date = currentCalendarDate) => {
        try {
            const userJson = await storage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                setCurrentUser(user);
                
                if (user.employee_id) {
                        // Use local time to avoid timezone shift on the 1st of the month
                        const year = targetDate.getFullYear();
                        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                        const currentMonth = `${year}-${month}`; 
                        const [monthlyRes, empsRes, attRes] = await Promise.all([
                            apiFetch(`/api/v1/hr/employees/${user.employee_id}/records/${currentMonth}`),
                            apiFetch(`/api/v1/hr/employees`),
                            apiFetch(`/api/v1/hr/employees/${user.employee_id}/attendance?month=${currentMonth}`)
                        ]);

                        if (attRes.ok) {
                            const attData = await attRes.json();
                            setAttendanceData(attData || {});
                        }

                        // Fetch daily productivity if role is control/reviewer
                        // We will just fetch it for everyone, backend will return empty if not authorized
                        // But wait, the date range for productivity is the *cycle* (26th to 25th)
                        // We can just fetch it with the cycle dates, but first we need the employeeProfile to know the role
                        // So let's fetch employee profile first
                        let isControlOrReviewer = false;
                        if (empsRes.ok) {
                            const emps = await empsRes.json();
                            const myEmp = emps.find((e: any) => e.id === user.employee_id);
                            if (myEmp) {
                                setEmployeeProfile(myEmp);
                                isControlOrReviewer = (myEmp.role === 'control' || myEmp.role === 'reviewer');
                            }
                        }

                        if (isControlOrReviewer) {
                            // Figure out cycle dates
                            const currentYear = targetDate.getFullYear();
                            const currentMonthIdx = targetDate.getMonth();
                            const currentDay = targetDate.getDate();

                            let startDate: Date;
                            let endDate: Date;

                            if (currentDay > 25) {
                                startDate = new Date(currentYear, currentMonthIdx, 26);
                                endDate = new Date(currentYear, currentMonthIdx + 1, 25);
                            } else {
                                startDate = new Date(currentYear, currentMonthIdx - 1, 26);
                                endDate = new Date(currentYear, currentMonthIdx, 25);
                            }

                            const formatYMD = (d: Date) => {
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const dStr = String(d.getDate()).padStart(2, '0');
                                return `${y}-${m}-${dStr}`;
                            };

                            const prodRes = await apiFetch(`/api/v1/hr/employees/daily-productivity?dateFrom=${formatYMD(startDate)}&dateTo=${formatYMD(endDate)}`);
                            if (prodRes.ok) {
                                const pData = await prodRes.json();
                                setDailyProductivity(pData || []);
                            }
                        }

                        if (monthlyRes.ok) {
                            const data = await monthlyRes.json();
                            setEmployeeData(data);
                        }
                }
            }
        } catch (e) {
            console.error('Error loading employee data', e);
        } finally {
            setRefreshing(false);
            setLoadingData(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            const now = new Date();
            setCurrentCalendarDate(now);
            loadData(now);
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData(currentCalendarDate);
    };

    if (loadingData && !refreshing) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    let totalSalary = 0;
    if (employeeData) {
        const base = Number(employeeData.base_salary) || 0;
        const inc = Number(employeeData.incentive) || 0;
        const penalties = Number(employeeData.penalties) || 0;
        const delays = Number(employeeData.delays) || 0;
        const damages = Number(employeeData.damages) || 0;
        const advance = Number(employeeData.registered_advance) || 0;
        const goods = Number(employeeData.goods_debt) || 0;
        const prodAmt = Number(employeeData.productivity_amount) || 0;
        const paid = Number(employeeData.paid_amount) || 0;

        totalSalary = (base + inc + prodAmt + paid) - (penalties + delays + damages + advance + goods);
    }

    let dashboardTitle = "لوحة الموظف";
    if (employeeProfile?.role === 'preparation') dashboardTitle = "لوحة التحضير";
    else if (employeeProfile?.role === 'distribution') dashboardTitle = "لوحة التوزيع";
    else if (employeeProfile?.role === 'reviewer') dashboardTitle = "لوحة المراجع";

    const userName = currentUser?.manager_name || currentUser?.username || '';

    const getCycleDatesLocal = (baseDate: Date) => {
        const currentYear = baseDate.getFullYear();
        const currentMonth = baseDate.getMonth();
        const currentDay = baseDate.getDate();
        if (currentDay > 25) {
            return { start: new Date(currentYear, currentMonth, 26), end: new Date(currentYear, currentMonth + 1, 25) };
        } else {
            return { start: new Date(currentYear, currentMonth - 1, 26), end: new Date(currentYear, currentMonth, 25) };
        }
    };

    const cycle = getCycleDatesLocal(currentCalendarDate);
    let presentCount = 0;
    let absentCount = 0;
    Object.entries(attendanceData).forEach(([dateStr, status]) => {
        const d = new Date(dateStr);
        if (d >= cycle.start && d <= cycle.end) {
            if (status === 'present' || status === 'holiday') presentCount++;
            if (status === 'absent' || status === 'absent_unauthorized') absentCount++;
        }
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                currentUser={currentUser}
                unreadCount={0}
                onPressProfile={() => router.push('/(employee)/settings')}
                onPressNotifications={() => {}}
                title={dashboardTitle}
                subtitle={`مرحباً بك يا ${userName}`}
            />
            <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
                }
            >

                <View style={styles.calendarControls}>
                    <Text style={[styles.sectionTitle, { color: theme.text, alignSelf: 'flex-start', width: '100%', textAlign: 'right' }]}>سجل حضوري</Text>
                    
                    <View style={[styles.monthSelector, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: theme.primary + '15' }]} onPress={() => {
                            const d = new Date(currentCalendarDate);
                            d.setMonth(d.getMonth() - 1);
                            setCurrentCalendarDate(d);
                            loadData(d);
                        }}>
                            <Ionicons name="arrow-forward" size={20} color={theme.primary} />
                        </TouchableOpacity>

                        <Text style={[styles.monthText, { color: theme.text }]}>
                            شهر {currentCalendarDate.getMonth() + 1} / {currentCalendarDate.getFullYear()}
                        </Text>

                        <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: theme.primary + '15' }]} onPress={() => {
                            const d = new Date(currentCalendarDate);
                            d.setMonth(d.getMonth() + 1);
                            setCurrentCalendarDate(d);
                            loadData(d);
                        }}>
                            <Ionicons name="arrow-back" size={20} color={theme.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <AttendanceCalendar 
                    baseDate={currentCalendarDate}
                    attendanceData={attendanceData}
                    onDayPress={(dateString, status) => {
                        if (employeeProfile?.role === 'control' || employeeProfile?.role === 'reviewer') {
                            const dailyProd = dailyProductivity.find(p => p.date === dateString);
                            if (dailyProd) {
                                setSelectedDailyProd({ date: dateString, ...dailyProd });
                            } else {
                                setSelectedDailyProd({ date: dateString, total_items: 0, total_amount: 0 });
                            }
                            setProdModalVisible(true);
                        }
                    }}
                />

                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                        <Text style={[styles.legendText, { color: theme.text }]}>حضور</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                        <Text style={[styles.legendText, { color: theme.text }]}>غياب</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                        <Text style={[styles.legendText, { color: theme.text }]}>بدون إذن</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                        <Text style={[styles.legendText, { color: theme.text }]}>إجازة</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { borderWidth: 1, borderColor: theme.border }]} />
                        <Text style={[styles.legendText, { color: theme.text }]}>لم يسجل</Text>
                    </View>
                </View>
                
                

                <TouchableOpacity 
                    style={[styles.detailsBtn, { backgroundColor: theme.primary, marginBottom: 20, marginTop: 30 }]}
                    onPress={() => setDetailsModalVisible(true)}
                >
                    <Ionicons name="information-circle-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    <Text style={styles.detailsBtnText}>تفاصيل الراتب والدوام</Text>
                </TouchableOpacity>


            </ScrollView>


            <Modal
                visible={detailsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={() => setDetailsModalVisible(false)}
                    />
                    <View style={[styles.bottomSheet, { backgroundColor: theme.background, height: '85%', paddingBottom: 0 }]}>
                        <View style={styles.bottomSheetHeader}>
                            <View style={styles.bottomSheetHandle} />
                            <Text style={[styles.bottomSheetTitle, { color: theme.text, fontSize: 18, marginBottom: 0 }]}>تفاصيل الراتب والدوام</Text>
                        </View>
                        
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                            

                            {/* Earnings */}
                            <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, backgroundColor: '#4CAF5015', alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                    <Text style={[styles.cardSectionTitle, { color: '#4CAF50', marginBottom: 0 }]}>المستحقات 🟢</Text>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>الراتب الأساسي</Text>
                                    <Text style={[styles.modalDetailValue, { color: theme.text }]}>{employeeData?.base_salary || 0} ج.م</Text>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>الحافز</Text>
                                    <Text style={[styles.modalDetailValue, { color: theme.text }]}>{employeeData?.incentive || 0} ج.م</Text>
                                </View>
                                <View style={[styles.modalDetailRow, !(employeeProfile?.role === 'control' || employeeProfile?.role === 'reviewer') && { borderBottomWidth: 0 }]}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>سداد نقدي للخزينة</Text>
                                    <Text style={[styles.modalDetailValue, { color: theme.text }]}>{employeeData?.paid_amount ? Number(employeeData.paid_amount).toFixed(2).replace(/\.?0+$/, '') : 0} ج.م</Text>
                                </View>
                                {(employeeProfile?.role === 'control' || employeeProfile?.role === 'reviewer') && (
                                    <>
                                        <View style={styles.modalDetailRow}>
                                            <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>الإنتاجية</Text>
                                            <Text style={[styles.modalDetailValue, { color: theme.text }]}>{employeeData?.productivity_items || 0} صنف</Text>
                                        </View>
                                        <View style={[styles.modalDetailRow, { borderBottomWidth: 0 }]}>
                                            <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>حافز الكنترول</Text>
                                            <Text style={[styles.modalDetailValue, { color: theme.text }]}>{employeeData?.productivity_amount ? Number(employeeData.productivity_amount).toFixed(2).replace(/\.?0+$/, '') : 0} ج.م</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Deductions */}
                            <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, backgroundColor: '#F4433615', alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                    <Text style={[styles.cardSectionTitle, { color: '#F44336', marginBottom: 0 }]}>الاستقطاعات 🔴</Text>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>الجزاءات</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#F44336' }]}>{employeeData?.penalties || 0} ج.م</Text>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>التأخيرات</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#F44336' }]}>{employeeData?.delays || 0} ج.م</Text>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>التوالف</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#F44336' }]}>{employeeData?.damages || 0} ج.م</Text>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>سلف نقدية</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#F44336' }]}>{employeeData?.registered_advance || 0} ج.م</Text>
                                </View>
                                <View style={[styles.modalDetailRow, { borderBottomWidth: 0 }]}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>مسحوبات بضاعة</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#F44336' }]}>{employeeData?.goods_debt ? Number(employeeData.goods_debt).toFixed(2).replace(/\.?0+$/, '') : 0} ج.م</Text>
                                </View>
                            </View>

                            {/* Attendance */}
                            <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, backgroundColor: theme.primary + '15', alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                    <Text style={[styles.cardSectionTitle, { color: theme.primary, marginBottom: 0 }]}>الدوام 🗓️</Text>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>أيام الحضور (للدورة)</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#4CAF50' }]}>{presentCount} أيام</Text>
                                </View>
                                <View style={[styles.modalDetailRow, { borderBottomWidth: 0 }]}>
                                    <Text style={[styles.modalDetailLabel, { color: theme.textSecondary }]}>أيام الغياب (للدورة)</Text>
                                    <Text style={[styles.modalDetailValue, { color: '#F44336' }]}>{absentCount} أيام</Text>
                                </View>
                            </View>

                            {/* Active Loans */}
                            {currentUser?.employee_id && (
                                <EmployeeLoansView employeeId={currentUser.employee_id} />
                            )}

                            {/* Summary Card */}
                            <View style={[styles.detailCard, { backgroundColor: theme.primary, elevation: 4, shadowOpacity: 0.2, marginTop: 4, marginBottom: 15, padding: 12 }]}>
                                <Text style={[styles.modalCardTitle, { color: '#ffffff', opacity: 0.9, fontSize: 13 }]}>الصافي المتوقع (بعد الخصم)</Text>
                                <Text style={[styles.cardTotal, { color: '#ffffff', fontSize: 24 }]}>{totalSalary.toFixed(2).replace(/\.?0+$/, '')} ج.م</Text>
                            </View>

                            <TouchableOpacity 
                                style={[styles.closeButton, { backgroundColor: '#FF9800', marginBottom: 5 }]}
                                onPress={() => setDetailsModalVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.closeButtonText}>حسناً</Text>
                            </TouchableOpacity>
                            
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={prodModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setProdModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={() => setProdModalVisible(false)}
                    />
                    <View style={[styles.bottomSheet, { backgroundColor: theme.background }]}>
                        <View style={styles.bottomSheetHeader}>
                            <View style={styles.bottomSheetHandle} />
                            <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>
                                إنتاجية يوم {selectedDailyProd?.date}
                            </Text>
                            <Text style={[styles.bottomSheetSubtitle, { color: theme.textSecondary }]}>
                                تفاصيل الجرد المحتسبة لك في هذا اليوم
                            </Text>
                        </View>
                        
                        <View style={styles.bottomSheetContent}>
                            <View style={styles.cardsRow}>
                                <View style={[styles.miniCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                                        <Ionicons name="cube" size={26} color={theme.primary} />
                                    </View>
                                    <Text style={[styles.miniCardValue, { color: theme.primary }]}>
                                        {selectedDailyProd?.total_items || 0}
                                    </Text>
                                    <Text style={[styles.miniCardLabel, { color: theme.primary }]}>صنف مجرود</Text>
                                </View>

                                <View style={[styles.miniCard, { backgroundColor: '#4CAF5010', borderColor: '#4CAF5030' }]}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#4CAF5020' }]}>
                                        <Ionicons name="cash" size={26} color="#4CAF50" />
                                    </View>
                                    <Text style={[styles.miniCardValue, { color: '#4CAF50' }]}>
                                        {selectedDailyProd?.total_amount ? Number(selectedDailyProd.total_amount).toFixed(2).replace(/\.?0+$/, '') : 0}
                                    </Text>
                                    <Text style={[styles.miniCardLabel, { color: '#4CAF50' }]}>جنيه مكافأة</Text>
                                </View>
                            </View>
                            
                            <TouchableOpacity 
                                style={[styles.closeButton, { backgroundColor: theme.primary }]}
                                onPress={() => setProdModalVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.closeButtonText}>حسناً</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 15, paddingBottom: 20, alignItems: 'center' },
    salaryCard: {
        width: '100%',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    salaryAmount: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
    salaryDetailsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        width: '100%',
    },
    salaryDetailBox: {
        alignItems: 'center',
    },
    detailLabel: { fontSize: 12, marginBottom: 5 },
    detailValue: { fontSize: 14, fontWeight: 'bold' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    subtitle: { fontSize: 16, textAlign: 'center' },
    productivityButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56, 
        paddingHorizontal: 20,
        borderRadius: 16,
        marginTop: 10,
        marginBottom: 30,
        width: '100%',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    productivityButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    baseSalaryCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginTop: 15,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    baseSalaryIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 15,
    },
    baseSalaryContent: {
        flex: 1,
        alignItems: 'flex-start',
    },
    baseSalaryLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    baseSalaryAmount: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    calendarControls: {
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
        marginBottom: 15,
        gap: 12,
    },
    monthSelector: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        borderRadius: 24,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderWidth: 1,
    },
    monthNavBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthText: {
        fontSize: 18,
        fontWeight: '900',
        marginHorizontal: 10,
        textAlign: 'center',
    },
    legendContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 15,
        gap: 15,
        width: '100%',
    },
    legendItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 12,
    },
    detailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        marginTop: 15,
        width: '100%',
    },
    detailsBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalBody: {
        marginBottom: 20,
    },
    detailCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    cardSectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'right',
    },
    modalCardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    cardTotal: {
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
    },
    modalDetailRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    modalDetailLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalDetailValue: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    bottomSheet: {
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 45 : 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 15,
    },
    bottomSheetHeader: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    bottomSheetHandle: {
        width: 48,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginBottom: 18,
    },
    bottomSheetTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 6,
    },
    bottomSheetSubtitle: {
        fontSize: 15,
    },
    bottomSheetContent: {
        paddingHorizontal: 24,
    },
    cardsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 30,
        gap: 15,
    },
    miniCard: {
        flex: 1,
        borderRadius: 24,
        borderWidth: 1.5,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    miniCardValue: {
        fontSize: 26,
        fontWeight: '900',
        marginBottom: 4,
    },
    miniCardLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    closeButton: {
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    }
});
