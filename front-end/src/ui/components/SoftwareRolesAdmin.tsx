import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { apiFetch } from '@/shared/api/api-client';

const AVAILABLE_ROLES = [
    { label: 'مدير النظام (Admin)', value: 'admin' },
    { label: 'صيدلي خارجي (Pharmacist)', value: 'pharmacist' },
    { label: 'مخزن الجملة (Gomla)', value: 'gomla' },
    { label: 'لوحة الموظفين (Employee)', value: 'employee' },
];

export const SoftwareRolesAdmin = ({ employee, onRolesUpdated }: { employee: any, onRolesUpdated?: () => void }) => {
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    useEffect(() => {
        if (employee?.User?.roles) {
            setSelectedRoles(employee.User.roles.map((r: any) => r.name));
        } else {
            // Fallback to initial role
            if (employee?.User?.role) {
                setSelectedRoles([employee.User.role]);
            }
        }

        if (!employee?.user_id) {
            fetchSystemUsers();
        }
    }, [employee]);

    const fetchSystemUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await apiFetch('/api/v1/hr/users-for-linking');
            if (res.ok) {
                const data = await res.json();
                setAvailableUsers(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const linkUserToEmployee = async () => {
        if (!selectedUserId) return;
        setIsSaving(true);
        try {
            const res = await apiFetch(`/api/v1/hr/employees/${employee.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: employee.name,
                    phone: employee.phone,
                    address: employee.address,
                    national_id: employee.national_id,
                    firebird_code: employee.firebird_code,
                    role: employee.role,
                    base_salary: employee.base_salary,
                    user_id: selectedUserId,
                    roles: ['employee'] // default role
                })
            });
            if (res.ok) {
                alert('تم ربط الحساب بنجاح');
                if (onRolesUpdated) onRolesUpdated();
            } else {
                alert('فشل ربط الحساب');
            }
        } catch (err) {
            alert('حدث خطأ أثناء الاتصال بالخادم');
        } finally {
            setIsSaving(false);
        }
    };

    if (!employee?.user_id) {
        return (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>ربط الموظف بحساب النظام (سوبا بيز)</Text>
                <Text style={{ textAlign: 'right', color: theme.textSecondary, fontSize: 13, marginBottom: 15 }}>هذا الموظف غير مربوط بحساب دخول للتطبيق. يرجى اختيار حساب لربطه.</Text>
                
                {isLoadingUsers ? (
                    <Text style={{ textAlign: 'center', color: theme.primary }}>جاري تحميل الحسابات...</Text>
                ) : (
                    <View>
                        {availableUsers.map(u => (
                            <TouchableOpacity 
                                key={u.id}
                                style={[
                                    styles.roleChip, 
                                    { marginBottom: 8, borderColor: selectedUserId === u.id ? theme.primary : theme.border, backgroundColor: selectedUserId === u.id ? theme.primary + '15' : 'transparent' }
                                ]}
                                onPress={() => setSelectedUserId(u.id)}
                            >
                                <Ionicons name={selectedUserId === u.id ? "radio-button-on" : "radio-button-off"} size={18} color={selectedUserId === u.id ? theme.primary : theme.textSecondary} style={{ marginLeft: 6 }} />
                                <View>
                                    <Text style={{ color: theme.text, fontWeight: 'bold' }}>{u.name || u.email}</Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{u.email}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity 
                            style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: 10, alignSelf: 'flex-start' }]} 
                            onPress={linkUserToEmployee}
                            disabled={isSaving || !selectedUserId}
                        >
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{isSaving ? 'جاري الحفظ...' : 'ربط الحساب المحدد'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    const toggleRole = (roleValue: string) => {
        if (selectedRoles.includes(roleValue)) {
            setSelectedRoles(selectedRoles.filter(r => r !== roleValue));
        } else {
            setSelectedRoles([...selectedRoles, roleValue]);
        }
    };

    const saveRoles = async () => {
        setIsSaving(true);
        try {
            const res = await apiFetch(`/api/v1/hr/employees/${employee.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: employee.name,
                    phone: employee.phone,
                    address: employee.address,
                    national_id: employee.national_id,
                    firebird_code: employee.firebird_code,
                    role: employee.role, // Keep primary department role
                    base_salary: employee.base_salary,
                    user_id: employee.user_id,
                    roles: selectedRoles
                })
            });
            if (res.ok) {
                alert('تم حفظ الصلاحيات بنجاح');
                if (onRolesUpdated) onRolesUpdated();
            } else {
                alert('فشل حفظ الصلاحيات');
            }
        } catch (err) {
            alert('حدث خطأ أثناء الاتصال بالخادم');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>لوحات التحكم (الصلاحيات)</Text>
                <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: theme.primary }]} 
                    onPress={saveRoles}
                    disabled={isSaving}
                >
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{isSaving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}</Text>
                </TouchableOpacity>
            </View>
            <Text style={{ textAlign: 'right', color: theme.textSecondary, fontSize: 12, marginBottom: 15 }}>حدد الشاشات التي يحق لهذا المستخدم الدخول إليها.</Text>

            <View style={styles.rolesGrid}>
                {AVAILABLE_ROLES.map((role) => {
                    const isSelected = selectedRoles.includes(role.value);
                    return (
                        <TouchableOpacity
                            key={role.value}
                            style={[
                                styles.roleChip,
                                { borderColor: isSelected ? theme.primary : theme.border, backgroundColor: isSelected ? theme.primary + '15' : 'transparent' }
                            ]}
                            onPress={() => toggleRole(role.value)}
                        >
                            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={18} color={isSelected ? theme.primary : theme.textSecondary} style={{ marginLeft: 6 }} />
                            <Text style={{ color: isSelected ? theme.primary : theme.text, fontSize: 13, fontWeight: isSelected ? 'bold' : 'normal' }}>{role.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    saveBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    rolesGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
    },
    roleChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
    }
});
