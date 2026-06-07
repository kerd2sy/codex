import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { apiFetch } from '@/shared/api/api-client';

export default function AttendanceScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];
    const insets = useSafeAreaInsets();

    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const loadAttendance = async (date: string) => {
        try {
            const res = await apiFetch(`/api/v1/hr/attendance?date=${date}`);
            if (res.ok) {
                const data = await res.json();
                setAttendanceData(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        loadAttendance(selectedDate);
    }, [selectedDate]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAttendance(selectedDate);
    };

    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleAbsentPress = (employeeId: number, name: string) => {
        Alert.alert(
            'تسجيل غياب',
            `يرجى تحديد نوع الغياب للموظف ${name}`,
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'بدون إذن',
                    style: 'destructive',
                    onPress: () => handleRecord(employeeId, 'absent_unauthorized', name)
                },
                {
                    text: 'غياب بعذر',
                    onPress: () => handleRecord(employeeId, 'absent', name)
                }
            ]
        );
    };

    const handleRecord = async (employeeId: number, status: string, name: string) => {
        const timeIn = status === 'present' ? new Date().toISOString() : null;

        Alert.alert(
            'تأكيد تسجيل الحضور',
            `هل أنت متأكد من تغيير الحالة للموظف ${name}؟`,
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'تأكيد',
                    onPress: async () => {
                        try {
                            const res = await apiFetch('/api/v1/hr/attendance', {
                                method: 'POST',
                                body: JSON.stringify({
                                    employee_id: employeeId,
                                    date: selectedDate,
                                    status: status,
                                    time_in: timeIn,
                                }),
                            });
                            if (res.ok) {
                                loadAttendance(selectedDate);
                            } else {
                                Alert.alert('خطأ', 'حدث خطأ أثناء التسجيل');
                            }
                        } catch (err) {
                            Alert.alert('خطأ', 'تعذر الاتصال بالخادم');
                        }
                    }
                }
            ]
        );
    };

    const renderEmployee = ({ item }: { item: any }) => {
        const formatTime = (isoString: string) => {
            if (!isoString) return '';
            const d = new Date(isoString);
            return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        };

        const dDate = new Date(selectedDate);
        const isSelectedThursday = dDate.getDay() === 4;

        return (
            <View style={[styles.employeeCard, { backgroundColor: theme.surface }]}>
                <View style={styles.employeeInfo}>
                    <Text style={[styles.employeeName, { color: theme.text }]}>{item.employee_name}</Text>
                    {item.status === 'present' && item.time_in && (
                        <Text style={[styles.timeText, { color: theme.success }]}>حضر: {formatTime(item.time_in)}</Text>
                    )}
                    {item.status === 'absent' && (
                        <Text style={[styles.timeText, { color: theme.error }]}>غائب (بعذر)</Text>
                    )}
                    {item.status === 'absent_unauthorized' && (
                        <Text style={[styles.timeText, { color: theme.error }]}>غائب (بدون إذن)</Text>
                    )}
                    {item.status === 'holiday' && (
                        <Text style={[styles.timeText, { color: '#FFC107' }]}>إجازة</Text>
                    )}
                </View>
                
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={[
                            styles.actionBtn, 
                            { backgroundColor: item.status === 'present' ? theme.success : theme.background, borderColor: theme.success, borderWidth: 1 }
                        ]}
                        onPress={() => handleRecord(item.employee_id, 'present', item.employee_name)}
                    >
                        <Text style={[styles.actionBtnText, { color: item.status === 'present' ? '#fff' : theme.success }]}>حضور</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.actionBtn, 
                            { 
                                backgroundColor: ['absent', 'absent_unauthorized'].includes(item.status) ? theme.error : theme.background, 
                                borderColor: theme.error, 
                                borderWidth: 1, 
                                marginLeft: 8 
                            }
                        ]}
                        onPress={() => handleAbsentPress(item.employee_id, item.employee_name)}
                    >
                        <Text style={[
                            styles.actionBtnText, 
                            { color: ['absent', 'absent_unauthorized'].includes(item.status) ? '#fff' : theme.error }
                        ]}>
                            {item.status === 'absent' ? 'بعذر' : (item.status === 'absent_unauthorized' ? 'بدون إذن' : 'غياب')}
                        </Text>
                    </TouchableOpacity>

                    {isSelectedThursday && (
                        <TouchableOpacity 
                            style={[
                                styles.actionBtn, 
                                { 
                                    backgroundColor: item.status === 'holiday' ? '#FFC107' : theme.background, 
                                    borderColor: '#FFC107', 
                                    borderWidth: 1, 
                                    marginLeft: 8 
                                }
                            ]}
                            onPress={() => handleRecord(item.employee_id, 'holiday', item.employee_name)}
                        >
                            <Text style={[
                                styles.actionBtnText, 
                                { color: item.status === 'holiday' ? '#fff' : '#FFC107' }
                            ]}>
                                إجازة
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const dDate = new Date(selectedDate);
    const isThursday = dDate.getDay() === 4;
    const dayName = dDate.toLocaleDateString('ar-EG', { weekday: 'long' });

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                title="سجل الحضور والغياب"
                onPressProfile={() => router.back()}
                onPressNotifications={() => {}}
                unreadCount={0}
                currentUser={null}
            />

            <View style={[styles.dateSelector, { backgroundColor: theme.surface }]}>
                <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.primary} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.dateText, { color: theme.text }]}>{selectedDate}</Text>
                    <Text style={[styles.dayNameText, { color: isThursday ? theme.primary : theme.textSecondary }]}>
                        {dayName} {isThursday ? '(إجازة رسمية)' : ''}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateBtn}>
                    <Ionicons name="chevron-forward" size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={attendanceData}
                    keyExtractor={(item) => item.employee_id.toString()}
                    renderItem={renderEmployee}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
                    }
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>لا يوجد موظفين مسجلين.</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        margin: 20,
        marginBottom: 10,
        borderRadius: 12,
        elevation: 2,
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    dayNameText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dateBtn: {
        padding: 5,
    },
    listContent: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    employeeCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    employeeInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    employeeName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    actionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    }
});
