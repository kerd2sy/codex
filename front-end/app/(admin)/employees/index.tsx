import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardHeader } from '@/ui/shared/DashboardHeader';
import { apiFetch } from '@/shared/api/api-client';

export default function EmployeesListScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];
    const insets = useSafeAreaInsets();

    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadEmployees = async () => {
        try {
            const res = await apiFetch('/api/v1/hr/employees');
            if (res.ok) {
                const data = await res.json();
                setEmployees(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadEmployees();
    };

    const renderEmployee = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.employeeCard, { backgroundColor: theme.surface }]}
            onPress={() => router.push(`/(admin)/employees/${item.id}` as any)}
        >
            <View style={styles.employeeInfo}>
                <Text style={[styles.employeeName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.employeePhone, { color: theme.textSecondary }]}>{item.phone || 'بدون رقم'}</Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={theme.muted} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <DashboardHeader 
                theme={theme}
                insets={insets}
                title="إدارة الموظفين"
                onPressProfile={() => router.back()}
                onPressNotifications={() => {}}
                unreadCount={0}
                currentUser={null}
            />

            <View style={styles.actionsContainer}>
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: theme.primary, flex: 1, marginLeft: 5 }]}
                    onPress={() => router.push('/(admin)/employees/new' as any)}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>إضافة موظف</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: theme.secondary || '#4CAF50', flex: 1, marginRight: 5 }]}
                    onPress={() => router.push('/(admin)/attendance' as any)}
                >
                    <Ionicons name="calendar" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>الحضور والغياب</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={employees}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderEmployee}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
                    }
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>لا يوجد موظفين حالياً.</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    actionsContainer: {
        flexDirection: 'row-reverse',
        padding: 20,
        paddingBottom: 10,
    },
    addButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        elevation: 2,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
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
    employeePhone: {
        fontSize: 13,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    }
});
