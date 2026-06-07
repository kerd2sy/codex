import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useRouter } from '@/hooks/useRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { apiFetch } from '@/shared/api/api-client';
import { Ionicons } from '@expo/vector-icons';
import { EmployeeLoansAdmin } from '@/ui/components/EmployeeLoansAdmin';

const ROLES = [
    { label: 'تحضير', value: 'preparation' },
    { label: 'توزيع', value: 'distribution' },
    { label: 'كنترول', value: 'control' }
];

export default function EmployeeProfileScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Current month format YYYY-MM
    const currentDate = new Date();
    const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [showRolePicker, setShowRolePicker] = useState(false);

    const [employee, setEmployee] = useState<any>(null);
    const [payroll, setPayroll] = useState({
        base_salary: '0',
        incentive: '0',
        damages: '0',
        delays: '0',
        penalties: '0',
        productivity_items: '0',
        productivity_amount: '0',
        registered_advance: '0',
        firebird_total_debt: '0',
        goods_debt: 0
    });

    useEffect(() => {
        loadData();
    }, [id, selectedMonth]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Employee Data (In a real app, you might only fetch this once, not every month change)
            const empRes = await apiFetch('/api/v1/hr/employees');
            if (empRes.ok) {
                const employees = await empRes.json();
                const currentEmp = employees.find((e: any) => e.id.toString() === id);
                setEmployee(currentEmp);
            }

            // Fetch Monthly Record
            const payRes = await apiFetch(`/api/v1/hr/employees/${id}/records/${selectedMonth}`);
            if (payRes.ok) {
                const data = await payRes.json();
                setPayroll({
                    base_salary: data.base_salary?.toString() || '0',
                    incentive: data.incentive?.toString() || '0',
                    damages: data.damages?.toString() || '0',
                    delays: data.delays?.toString() || '0',
                    penalties: data.penalties?.toString() || '0',
                    productivity_items: data.productivity_items?.toString() || '0',
                    productivity_amount: data.productivity_amount?.toString() || '0',
                    registered_advance: data.registered_advance?.toString() || '0',
                    firebird_total_debt: data.firebird_total_debt?.toString() || '0',
                    goods_debt: data.goods_debt || 0
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePayroll = async () => {
        setSaving(true);
        try {
            const res = await apiFetch(`/api/v1/hr/employees/${id}/records/${selectedMonth}`, {
                method: 'POST',
                body: JSON.stringify({
                    base_salary: parseFloat(payroll.base_salary) || 0,
                    incentive: parseFloat(payroll.incentive) || 0,
                    damages: parseFloat(payroll.damages) || 0,
                    delays: parseFloat(payroll.delays) || 0,
                    penalties: parseFloat(payroll.penalties) || 0,
                    productivity_items: parseInt(payroll.productivity_items) || 0,
                    productivity_amount: parseFloat(payroll.productivity_amount) || 0,
                    registered_advance: parseFloat(payroll.registered_advance) || 0,
                    firebird_total_debt: parseFloat(payroll.firebird_total_debt) || 0,
                })
            });

            if (res.ok) {
                const savedData = await res.json();
                setPayroll(prev => ({
                    ...prev,
                    goods_debt: savedData.goods_debt || 0
                }));
                Alert.alert('نجاح', 'تم حفظ السجل الشهري بنجاح');
            } else {
                Alert.alert('خطأ', 'فشل الحفظ');
            }
        } catch (err) {
            Alert.alert('خطأ', 'حدث خطأ في الاتصال');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateRole = async (newRole: string) => {
        try {
            const res = await apiFetch(`/api/v1/hr/employees/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...employee,
                    role: newRole
                })
            });

            if (res.ok) {
                setEmployee({ ...employee, role: newRole });
                setShowRolePicker(false);
                Alert.alert('نجاح', 'تم تحديث الدور بنجاح');
            } else {
                Alert.alert('خطأ', 'فشل تحديث الدور');
            }
        } catch (err) {
            Alert.alert('خطأ', 'حدث خطأ في الاتصال');
        }
    };

    const getRoleLabel = (roleValue: string) => {
        return ROLES.find(r => r.value === roleValue)?.label || roleValue;
    };

    if (loading && !employee) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                title={employee?.name || 'ملف الموظف'}
                onPressProfile={() => router.back()}
                onPressNotifications={() => {}}
                unreadCount={0}
                currentUser={null}
            />

            <ScrollView contentContainerStyle={styles.content}>
                
                {/* Employee Info Card */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>البيانات الأساسية</Text>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoValue, { color: theme.text }]}>{employee?.phone || '-'}</Text>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>الهاتف:</Text>
                    </View>
                    <TouchableOpacity style={styles.infoRow} onPress={() => setShowRolePicker(true)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="pencil" size={16} color={theme.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.infoValue, { color: theme.primary, fontWeight: 'bold' }]}>{getRoleLabel(employee?.role)}</Text>
                        </View>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>الدور:</Text>
                    </TouchableOpacity>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoValue, { color: theme.text }]}>{employee?.firebird_code || '-'}</Text>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>كود فايربيرد:</Text>
                    </View>
                </View>

                {/* Month Selector */}
                <View style={[styles.monthSelector, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>تحديد الشهر (YYYY-MM):</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, flex: 1, marginLeft: 10, marginBottom: 0 }]}
                        value={selectedMonth}
                        onChangeText={setSelectedMonth}
                        placeholder="2026-05"
                        placeholderTextColor={theme.muted}
                        keyboardType="numbers-and-punctuation"
                        textAlign="center"
                    />
                </View>

                {/* Loans Management Section */}
                {employee && <EmployeeLoansAdmin employeeId={id as string} />}

                {/* Payroll Form */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>مفردات مرتب شهر ({selectedMonth})</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>الراتب الأساسي</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.base_salary} onChangeText={(t) => setPayroll({ ...payroll, base_salary: t })} keyboardType="numeric" textAlign="right" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>الحافز (متغير)</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.incentive} onChangeText={(t) => setPayroll({ ...payroll, incentive: t })} keyboardType="numeric" textAlign="right" />
                    </View>

                    <View style={styles.rowInputs}>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>الجزاءات</Text>
                            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.penalties} onChangeText={(t) => setPayroll({ ...payroll, penalties: t })} keyboardType="numeric" textAlign="right" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>التأخيرات</Text>
                            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.delays} onChangeText={(t) => setPayroll({ ...payroll, delays: t })} keyboardType="numeric" textAlign="right" />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>التوالف</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.damages} onChangeText={(t) => setPayroll({ ...payroll, damages: t })} keyboardType="numeric" textAlign="right" />
                    </View>

                    {(employee?.role === 'control' || employee?.role === 'reviewer') && (
                        <View style={styles.rowInputs}>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>الإنتاجية (عدد الأصناف)</Text>
                                <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.productivity_items} onChangeText={(t) => setPayroll({ ...payroll, productivity_items: t })} keyboardType="numeric" textAlign="right" />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>الإنتاجية (إجمالي القيمة)</Text>
                                <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.productivity_amount} onChangeText={(t) => setPayroll({ ...payroll, productivity_amount: t })} keyboardType="numeric" textAlign="right" />
                            </View>
                        </View>
                    )}

                    <View style={styles.divider} />
                    <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16 }]}>السلف والمسحوبات (فايربيرد)</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>إجمالي حساب فايربيرد لهذا الشهر</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.firebird_total_debt} onChangeText={(t) => setPayroll({ ...payroll, firebird_total_debt: t })} keyboardType="numeric" textAlign="right" />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>منها سلفة نقدية</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={payroll.registered_advance} onChangeText={(t) => setPayroll({ ...payroll, registered_advance: t })} keyboardType="numeric" textAlign="right" />
                    </View>

                    <View style={styles.calculatedBox}>
                        <Text style={styles.calculatedText}>البضاعة المسحوبة = {payroll.goods_debt} جنيه</Text>
                        <Text style={{fontSize: 12, color: '#666', marginTop: 5}}>يتم حسابه تلقائياً (الإجمالي - السلفة)</Text>
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveButton, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
                        onPress={handleSavePayroll}
                        disabled={saving}
                    >
                        <Text style={styles.saveButtonText}>{saving ? 'جاري الحفظ...' : 'حفظ مفردات المرتب'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={showRolePicker}
                onRequestClose={() => setShowRolePicker(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRolePicker(false)}>
                    <View style={[styles.roleModalContent, { backgroundColor: theme.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center', marginBottom: 15 }]}>تعديل الدور</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                        {ROLES.map((r) => (
                            <TouchableOpacity
                                key={r.value}
                                style={[styles.roleOption, employee?.role === r.value && { backgroundColor: theme.primary + '20' }]}
                                onPress={() => handleUpdateRole(r.value)}
                            >
                                <Text style={[styles.roleOptionText, { color: employee?.role === r.value ? theme.primary : theme.text }]}>
                                    {r.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        padding: 20,
        paddingBottom: 50,
    },
    card: {
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'right',
    },
    infoRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    infoValue: {
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    roleModalContent: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: 16,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    roleOption: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
    },
    roleOptionText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    monthSelector: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        elevation: 1,
    },
    inputGroup: {
        marginBottom: 15,
    },
    rowInputs: {
        flexDirection: 'row-reverse',
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        textAlign: 'right',
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 15,
    },
    calculatedBox: {
        backgroundColor: '#e3f2fd',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    calculatedText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    saveButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
