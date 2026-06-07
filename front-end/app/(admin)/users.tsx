import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { useRouter } from '@/hooks/useRouter';
import { apiFetch } from '@/shared/api/api-client';
import { Ionicons } from '@expo/vector-icons';

const AVAILABLE_ROLES = [
    { label: 'مدير النظام (Admin)', value: 'admin' },
    { label: 'صيدلي خارجي (Pharmacist)', value: 'pharmacist' },
    { label: 'لوحة الموظفين (Employee)', value: 'employee' },
];

const AVAILABLE_JOBS = [
    { label: 'تحضير', value: 'preparation' },
    { label: 'توزيع', value: 'distribution' },
    { label: 'كنترول', value: 'control' },
    { label: 'تحضير جملة', value: 'gomla_prep' },
];

export default function UsersManagementScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedJob, setSelectedJob] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/v1/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openRolesModal = (user: any) => {
        setSelectedUser(user);
        setSelectedRoles(user.roles || []);
        setSelectedJob(user.employee_role || '');
        setModalVisible(true);
    };

    const toggleRole = (roleValue: string) => {
        if (selectedRoles.includes(roleValue)) {
            setSelectedRoles(selectedRoles.filter(r => r !== roleValue));
        } else {
            setSelectedRoles([...selectedRoles, roleValue]);
        }
    };

    const saveRoles = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        try {
            const payload = { 
                roles: selectedRoles, 
                employee_role: selectedRoles.includes('employee') ? selectedJob : '' 
            };
            const res = await apiFetch(`/api/v1/admin/users/${selectedUser.id}/roles`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('تم حفظ الصلاحيات بنجاح');
                setModalVisible(false);
                fetchUsers();
            } else {
                alert('فشل حفظ الصلاحيات');
            }
        } catch (e) {
            alert('حدث خطأ بالاتصال بالسيرفر');
        } finally {
            setIsSaving(false);
        }
    };

    const renderUser = ({ item }: { item: any }) => (
        <View style={[styles.userCard, { backgroundColor: theme.surface }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.manager_name || 'بدون اسم'}</Text>
                <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{item.email}</Text>
                
                <View style={styles.rolesRow}>
                    {item.roles && item.roles.length > 0 ? (
                        item.roles.map((r: string, idx: number) => (
                            <View key={idx} style={[styles.roleBadge, { backgroundColor: theme.primary + '20' }]}>
                                <Text style={{ color: theme.primary, fontSize: 11 }}>{r}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{ color: theme.muted, fontSize: 12 }}>بدون صلاحيات</Text>
                    )}
                </View>
            </View>
            <TouchableOpacity 
                style={[styles.editBtn, { backgroundColor: theme.primary }]}
                onPress={() => openRolesModal(item)}
            >
                <Ionicons name="settings-outline" size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: 'bold', marginRight: 4 }}>تعديل</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                title="إدارة المستخدمين"
                onPressProfile={() => router.back()}
                onPressNotifications={() => {}}
                unreadCount={0}
                currentUser={null}
            />
            
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList 
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderUser}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 50 }}>لا يوجد مستخدمين</Text>}
                />
            )}

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>تعديل صلاحيات {selectedUser?.manager_name}</Text>
                        
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
                                        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={20} color={isSelected ? theme.primary : theme.textSecondary} style={{ marginLeft: 8 }} />
                                        <Text style={{ color: isSelected ? theme.primary : theme.text, fontSize: 14, fontWeight: isSelected ? 'bold' : 'normal' }}>{role.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {selectedRoles.includes('employee') && (
                            <View style={styles.jobsSection}>
                                <Text style={[styles.modalSubtitle, { color: theme.text }]}>الوظيفة (للموظف)</Text>
                                <View style={styles.jobsGrid}>
                                    {AVAILABLE_JOBS.map((job) => {
                                        const isSelected = selectedJob === job.value;
                                        return (
                                            <TouchableOpacity
                                                key={job.value}
                                                style={[
                                                    styles.jobChip,
                                                    { borderColor: isSelected ? theme.primary : theme.border, backgroundColor: isSelected ? theme.primary + '15' : 'transparent' }
                                                ]}
                                                onPress={() => setSelectedJob(job.value)}
                                            >
                                                <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={18} color={isSelected ? theme.primary : theme.textSecondary} style={{ marginLeft: 6 }} />
                                                <Text style={{ color: isSelected ? theme.primary : theme.text, fontSize: 13 }}>{job.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={() => setModalVisible(false)}>
                                <Text style={{ color: theme.text, fontWeight: 'bold' }}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={saveRoles} disabled={isSaving}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</Text>
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
    userCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    userName: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
    userEmail: { fontSize: 13, textAlign: 'right', marginTop: 2 },
    rolesRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    editBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 10
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        padding: 20,
        borderRadius: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 20
    },
    rolesGrid: {
        gap: 12,
        marginBottom: 25
    },
    roleChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    modalSubtitle: {
        fontSize: 15,
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 10,
        marginTop: -5
    },
    jobsSection: {
        marginBottom: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderColor: '#E0E0E0'
    },
    jobsGrid: {
        gap: 8,
        flexDirection: 'row-reverse',
        flexWrap: 'wrap'
    },
    jobChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1,
        padding: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    }
});
