import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useRouter } from '@/hooks/useRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { apiFetch } from '@/shared/api/api-client';
import { Ionicons } from '@expo/vector-icons';

const ROLES = [
    { label: 'تحضير', value: 'preparation' },
    { label: 'توزيع', value: 'distribution' },
    { label: 'كنترول', value: 'control' }
];

export default function NewEmployeeScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];
    const insets = useSafeAreaInsets();

    const [form, setForm] = useState({
        name: '',
        phone: '',
        address: '',
        national_id: '',
        firebird_code: '',
        role: 'pharmacist',
        base_salary: '0',
        user_id: null as number | null
    });
    const [loading, setLoading] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [showFbPicker, setShowFbPicker] = useState(false);
    const [fbEmployees, setFbEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchingFb, setSearchingFb] = useState(false);

    const [systemUsers, setSystemUsers] = useState<any[]>([]);
    const [showUserPicker, setShowUserPicker] = useState(false);

    React.useEffect(() => {
        const fetchSystemUsers = async () => {
            try {
                const res = await apiFetch('/api/v1/hr/users-for-linking');
                if (res.ok) {
                    const data = await res.json();
                    setSystemUsers(data || []);
                }
            } catch (err) {
                console.error('Failed to fetch system users', err);
            }
        };
        fetchSystemUsers();
    }, []);

    const handleSearchFb = async () => {
        if (!searchQuery.trim()) return;
        setSearchingFb(true);
        try {
            const res = await apiFetch(`/api/v1/hr/firebird-search?q=${encodeURIComponent(searchQuery.trim())}`);
            if (res.ok) {
                const data = await res.json();
                setFbEmployees(data || []);
            }
        } catch (err) {
            console.error('Failed to search firebird', err);
        } finally {
            setSearchingFb(false);
        }
    };

    const handleSave = async () => {
        if (!form.name) {
            Alert.alert('خطأ', 'الاسم مطلوب');
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch('/api/v1/hr/employees', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    base_salary: parseFloat(form.base_salary) || 0
                })
            });

            if (res.ok) {
                Alert.alert('نجاح', 'تم إضافة الموظف بنجاح');
                router.back();
            } else {
                const errorData = await res.json();
                Alert.alert('خطأ', errorData.error || 'فشل في إضافة الموظف');
            }
        } catch (err) {
            Alert.alert('خطأ', 'حدث خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    const selectedRoleLabel = ROLES.find(r => r.value === form.role)?.label || 'اختر الدور';

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                title="إضافة موظف جديد"
                onPressProfile={() => router.back()}
                onPressNotifications={() => {}}
                unreadCount={0}
                currentUser={null}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>الاسم</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        value={form.name}
                        onChangeText={(t) => setForm({ ...form, name: t })}
                        placeholder="اسم الموظف"
                        placeholderTextColor={theme.muted}
                        textAlign="right"
                    />

                    <Text style={[styles.label, { color: theme.textSecondary }]}>رقم الهاتف</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        value={form.phone}
                        onChangeText={(t) => setForm({ ...form, phone: t })}
                        placeholder="01xxxxxxxxx"
                        placeholderTextColor={theme.muted}
                        keyboardType="phone-pad"
                        textAlign="right"
                    />

                    <Text style={[styles.label, { color: theme.textSecondary }]}>رقم البطاقة</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        value={form.national_id}
                        onChangeText={(t) => setForm({ ...form, national_id: t })}
                        placeholder="الرقم القومي"
                        placeholderTextColor={theme.muted}
                        keyboardType="numeric"
                        textAlign="right"
                    />

                    <Text style={[styles.label, { color: theme.textSecondary }]}>العنوان</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        value={form.address}
                        onChangeText={(t) => setForm({ ...form, address: t })}
                        placeholder="العنوان"
                        placeholderTextColor={theme.muted}
                        textAlign="right"
                    />

                    <Text style={[styles.label, { color: theme.textSecondary }]}>الدور (Role)</Text>
                    <TouchableOpacity 
                        style={[styles.dropdownButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                        onPress={() => setShowRolePicker(true)}
                    >
                        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
                        <Text style={[styles.dropdownButtonText, { color: theme.text }]}>{selectedRoleLabel}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>موظف / عميل فايربيرد المربوط</Text>
                    <TouchableOpacity 
                        style={[styles.dropdownButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                        onPress={() => setShowFbPicker(true)}
                    >
                        <Ionicons name="search" size={20} color={theme.textSecondary} />
                        <Text style={[styles.dropdownButtonText, { color: theme.text }]}>
                            {form.firebird_code 
                                ? `مربوط بالكود: ${form.firebird_code}` 
                                : 'اضغط للبحث عن الموظف أو العميل'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>كود الموظف في فايربيرد</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        value={form.firebird_code}
                        onChangeText={(t) => setForm({ ...form, firebird_code: t })}
                        placeholder="يمكنك إدخاله يدوياً أو اختياره من القائمة"
                        placeholderTextColor={theme.muted}
                        textAlign="right"
                    />

                    <Text style={[styles.label, { color: theme.textSecondary, marginTop: 10 }]}>حساب النظام المربوط (اختياري)</Text>
                    <TouchableOpacity 
                        style={[styles.dropdownButton, { borderColor: theme.border, backgroundColor: theme.background }]}
                        onPress={() => setShowUserPicker(true)}
                    >
                        <Ionicons name="person-circle-outline" size={20} color={theme.textSecondary} />
                        <Text style={[styles.dropdownButtonText, { color: theme.text }]}>
                            {systemUsers.find(u => u.id === form.user_id)?.name || 'اختر حساب موظف (للدخول للتطبيق)'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.textSecondary }]}>الراتب الأساسي المبدئي</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        value={form.base_salary}
                        onChangeText={(t) => setForm({ ...form, base_salary: t })}
                        placeholder="0.00"
                        placeholderTextColor={theme.muted}
                        keyboardType="numeric"
                        textAlign="right"
                    />

                    <TouchableOpacity 
                        style={[styles.saveButton, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <Text style={styles.saveButtonText}>{loading ? 'جاري الحفظ...' : 'حفظ'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal
                visible={showRolePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRolePicker(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRolePicker(false)}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>اختر الدور</Text>
                        {ROLES.map((r) => (
                            <TouchableOpacity 
                                key={r.value}
                                style={[styles.modalItem, { borderBottomColor: theme.border }]}
                                onPress={() => {
                                    setForm({ ...form, role: r.value });
                                    setShowRolePicker(false);
                                }}
                            >
                                <Text style={[styles.modalItemText, { color: theme.text }]}>{r.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Firebird Search Modal */}
            <Modal
                visible={showFbPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFbPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '80%', width: '90%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <TouchableOpacity onPress={() => setShowFbPicker(false)}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>البحث في فايربيرد</Text>
                            <View style={{ width: 24 }} />
                        </View>
                        
                        <View style={{ flexDirection: 'row-reverse', marginBottom: 15 }}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0, color: theme.text, borderColor: theme.border }]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="اكتب الاسم أو الكود..."
                                placeholderTextColor={theme.muted}
                                textAlign="right"
                                onSubmitEditing={handleSearchFb}
                            />
                            <TouchableOpacity 
                                style={{ backgroundColor: theme.primary, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 8, marginLeft: 10 }}
                                onPress={handleSearchFb}
                            >
                                <Ionicons name="search" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {searchingFb ? (
                                <Text style={{ textAlign: 'center', marginVertical: 20, color: theme.textSecondary }}>جاري البحث...</Text>
                            ) : fbEmployees.length === 0 ? (
                                <Text style={{ textAlign: 'center', marginVertical: 20, color: theme.textSecondary }}>ابدأ البحث لعرض النتائج</Text>
                            ) : (
                                fbEmployees.map((emp) => (
                                    <TouchableOpacity 
                                        key={`${emp.source}-${emp.id}`}
                                        style={[styles.modalItem, { borderBottomColor: theme.border, flexDirection: 'row-reverse', justifyContent: 'space-between' }]}
                                        onPress={() => {
                                            setForm(prev => ({
                                                ...prev,
                                                firebird_code: emp.id,
                                                name: prev.name ? prev.name : emp.name
                                            }));
                                            setShowFbPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.modalItemText, { color: theme.text, fontWeight: 'bold' }]}>{emp.name}</Text>
                                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{emp.source} - {emp.id}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* System Users Modal */}
            <Modal
                visible={showUserPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowUserPicker(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUserPicker(false)}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>اختر حساب النظام المربوط</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Option to unselect */}
                            <TouchableOpacity 
                                style={[styles.modalItem, { borderBottomColor: theme.border }]}
                                onPress={() => {
                                    setForm(prev => ({ ...prev, user_id: null }));
                                    setShowUserPicker(false);
                                }}
                            >
                                <Text style={[styles.modalItemText, { color: theme.primary }]}>-- بدون حساب (لا يمكنه الدخول) --</Text>
                            </TouchableOpacity>

                            {systemUsers.length === 0 ? (
                                <Text style={{ textAlign: 'center', marginVertical: 20, color: theme.textSecondary }}>جاري التحميل أو لا يوجد مستخدمين...</Text>
                            ) : (
                                systemUsers.map((user) => (
                                    <TouchableOpacity 
                                        key={user.id}
                                        style={[styles.modalItem, { borderBottomColor: theme.border, flexDirection: 'row-reverse', justifyContent: 'space-between' }]}
                                        onPress={() => {
                                            setForm(prev => ({
                                                ...prev,
                                                user_id: user.id
                                            }));
                                            setShowUserPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.modalItemText, { color: theme.text, fontWeight: 'bold' }]}>{user.name}</Text>
                                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{user.email}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
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
        marginBottom: 20,
        fontSize: 16,
    },
    saveButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dropdownButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownButtonText: {
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 12,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    modalItemText: {
        fontSize: 16,
        textAlign: 'center',
    }
});
