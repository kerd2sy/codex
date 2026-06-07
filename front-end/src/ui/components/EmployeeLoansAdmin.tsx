import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { apiFetch } from '@/shared/api/api-client';
import { Ionicons } from '@expo/vector-icons';

interface EmployeeLoan {
    id: number;
    total_amount: number;
    monthly_installment: number;
    remaining_amount: number;
    is_active: boolean;
    notes: string;
    created_at: string;
}

export const EmployeeLoansAdmin = ({ employeeId }: { employeeId: string | number }) => {
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [loans, setLoans] = useState<EmployeeLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Form state
    const [totalAmount, setTotalAmount] = useState('');
    const [installment, setInstallment] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (employeeId) {
            fetchLoans();
        }
    }, [employeeId]);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/v1/hr/employees/${employeeId}/loans`);
            if (res.ok) {
                const data = await res.json();
                setLoans(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLoan = async () => {
        if (!totalAmount || !installment) {
            Alert.alert('خطأ', 'الرجاء إدخال المبلغ والقسط');
            return;
        }

        const total = parseFloat(totalAmount);
        const inst = parseFloat(installment);

        if (isNaN(total) || isNaN(inst) || total <= 0 || inst <= 0) {
            Alert.alert('خطأ', 'الرجاء إدخال أرقام صحيحة أكبر من الصفر');
            return;
        }

        if (inst > total) {
            Alert.alert('خطأ', 'القسط لا يمكن أن يكون أكبر من إجمالي السلفة');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch(`/api/v1/hr/employees/${employeeId}/loans`, {
                method: 'POST',
                body: JSON.stringify({
                    total_amount: total,
                    monthly_installment: inst,
                    notes: notes
                })
            });

            if (res.ok) {
                Alert.alert('نجاح', 'تم إضافة السلفة بنجاح');
                setShowModal(false);
                setTotalAmount('');
                setInstallment('');
                setNotes('');
                fetchLoans();
            } else {
                Alert.alert('خطأ', 'فشل إضافة السلفة');
            }
        } catch (err) {
            console.error(err);
            Alert.alert('خطأ', 'حدث خطأ في الاتصال');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLoan = async (loanId: number) => {
        Alert.alert(
            'حذف سلفة',
            'هل أنت متأكد من حذف هذه السلفة؟ سيتم إيقاف خصم الأقساط إذا تم حذفها.',
            [
                { text: 'إلغاء', style: 'cancel' },
                { 
                    text: 'حذف', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await apiFetch(`/api/v1/hr/employees/loans/${loanId}`, { method: 'DELETE' });
                            if (res.ok) {
                                fetchLoans();
                            } else {
                                Alert.alert('خطأ', 'فشل حذف السلفة');
                            }
                        } catch (err) {
                            Alert.alert('خطأ', 'حدث خطأ في الاتصال');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch {
            return dateStr;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={() => setShowModal(true)}
                >
                    <Ionicons name="add" size={18} color="#fff" style={{ marginLeft: 5 }} />
                    <Text style={styles.addButtonText}>إضافة سلفة</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>سلف الموظف</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ margin: 20 }} />
            ) : loans.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>لا توجد سلف مسجلة لهذا الموظف</Text>
            ) : (
                <View style={styles.list}>
                    {loans.map(loan => (
                        <View key={loan.id} style={[styles.loanCard, { borderColor: theme.border }]}>
                            <View style={styles.loanRow}>
                                <View style={styles.statusBadge}>
                                    {loan.is_active ? (
                                        <Text style={[styles.statusText, { color: '#FF9800' }]}>نشطة (قيد الخصم)</Text>
                                    ) : (
                                        <Text style={[styles.statusText, { color: '#4CAF50' }]}>مكتملة / مغلقة</Text>
                                    )}
                                </View>
                                <Text style={[styles.dateText, { color: theme.textSecondary }]}>{formatDate(loan.created_at)}</Text>
                            </View>

                            <View style={styles.amountsRow}>
                                <View style={styles.amountBox}>
                                    <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>المتبقي</Text>
                                    <Text style={[styles.amountValue, { color: theme.primary }]}>{loan.remaining_amount} ج</Text>
                                </View>
                                <View style={styles.amountBox}>
                                    <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>القسط الشهري</Text>
                                    <Text style={[styles.amountValue, { color: theme.text }]}>{loan.monthly_installment} ج</Text>
                                </View>
                                <View style={styles.amountBox}>
                                    <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>إجمالي السلفة</Text>
                                    <Text style={[styles.amountValue, { color: theme.text }]}>{loan.total_amount} ج</Text>
                                </View>
                            </View>

                            {loan.notes ? (
                                <Text style={[styles.notesText, { color: theme.textSecondary }]}>ملاحظات: {loan.notes}</Text>
                            ) : null}

                            <TouchableOpacity 
                                style={styles.deleteButton}
                                onPress={() => handleDeleteLoan(loan.id)}
                            >
                                <Ionicons name="trash-outline" size={16} color="#F44336" />
                                <Text style={styles.deleteText}>حذف</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <Modal
                visible={showModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowModal(false)} />
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>إضافة سلفة جديدة</Text>

                        <Text style={[styles.label, { color: theme.textSecondary }]}>إجمالي السلفة</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                            value={totalAmount}
                            onChangeText={setTotalAmount}
                            keyboardType="numeric"
                            placeholder="مثال: 5000"
                            placeholderTextColor={theme.muted}
                            textAlign="right"
                        />

                        <Text style={[styles.label, { color: theme.textSecondary }]}>القسط الشهري المخصوم</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                            value={installment}
                            onChangeText={setInstallment}
                            keyboardType="numeric"
                            placeholder="مثال: 1000"
                            placeholderTextColor={theme.muted}
                            textAlign="right"
                        />

                        <Text style={[styles.label, { color: theme.textSecondary }]}>ملاحظات (اختياري)</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.border, height: 80 }]}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            textAlignVertical="top"
                            textAlign="right"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: theme.border }]}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={[styles.actionText, { color: theme.text }]}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: theme.primary, opacity: submitting ? 0.7 : 1 }]}
                                onPress={handleAddLoan}
                                disabled={submitting}
                            >
                                <Text style={[styles.actionText, { color: '#fff' }]}>
                                    {submitting ? 'جاري الحفظ...' : 'حفظ'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginVertical: 20,
        fontSize: 15,
    },
    list: {
        gap: 15,
    },
    loanCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
    },
    loanRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    dateText: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#00000008',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    amountsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        paddingVertical: 10,
        marginBottom: 10,
    },
    amountBox: {
        alignItems: 'center',
    },
    amountLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    notesText: {
        fontSize: 13,
        textAlign: 'right',
        marginBottom: 10,
    },
    deleteButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#F4433610',
        borderRadius: 6,
    },
    deleteText: {
        color: '#F44336',
        fontSize: 13,
        marginRight: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 16,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 20,
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
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    actionBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    actionText: {
        fontSize: 16,
        fontWeight: 'bold',
    }
});
