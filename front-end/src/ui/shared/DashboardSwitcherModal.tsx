import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useRouter } from '@/hooks/useRouter';
import { storage } from '@/utils/storage';

const ROLE_ROUTES: Record<string, { label: string; icon: any; route: any }> = {
    'admin': { label: 'لوحة الإدارة', icon: 'settings', route: '/(admin)/dashboard' },
    'pharmacist': { label: 'الصيدلية الخارجية', icon: 'medkit', route: '/(pharmacy)' },
    'employee': { label: 'لوحة الموظفين', icon: 'people', route: '/(employee)/dashboard' },
};

interface Props {
    visible: boolean;
    onClose: () => void;
    userRoles: string[];
    employeeRole?: string; // Job title for employees (e.g., 'gomla', 'preparation')
    currentRole: string; // The one currently active
}

export const DashboardSwitcherModal = ({ visible, onClose, userRoles, employeeRole, currentRole }: Props) => {
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];
    const router = useRouter();

    // Build unique dashboards list based on roles + employee job
    const uniqueDashboards = Array.from(new Set(userRoles
        .filter(r => r !== 'employee' || !employeeRole || employeeRole !== 'gomla') // if gomla worker, skip generic employee
        .map(r => {
            if (r === 'employee') return 'employee';
            return r;
        })
    ));

    // If user is an employee with a gomla job, show 'gomla' option instead of 'employee'
    if (userRoles.includes('employee') && employeeRole === 'gomla' && !uniqueDashboards.includes('gomla')) {
        const empIndex = uniqueDashboards.indexOf('employee');
        if (empIndex >= 0) uniqueDashboards.splice(empIndex, 1, 'gomla');
        else uniqueDashboards.push('gomla');
    } else if (userRoles.includes('employee') && employeeRole && employeeRole !== 'gomla' && !uniqueDashboards.includes('employee')) {
        uniqueDashboards.push('employee');
    }

    if (uniqueDashboards.length <= 1) return null; // No need to switch if only one dashboard

    const ROLE_ROUTES_WITH_GOMLA: Record<string, { label: string; icon: any; route: any }> = {
        ...ROLE_ROUTES,
        'gomla': { label: 'مخزن الجملة', icon: 'cube', route: '/(gomla)/dashboard' },
    };

    const handleSwitch = async (dashboardKey: string) => {
        onClose();
        const routes = ROLE_ROUTES_WITH_GOMLA;
        if (routes[dashboardKey]) {
            await storage.setItem('@last_guard', dashboardKey);
            router.replace(routes[dashboardKey].route);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.container, { backgroundColor: theme.surface }]}>
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: theme.text }]}>تبديل لوحة التحكم</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close" size={24} color={theme.icon} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.list}>
                                {uniqueDashboards.map(dashboardKey => {
                                    const info = ROLE_ROUTES[dashboardKey];
                                    if (!info) return null;
                                    const isActive = dashboardKey === currentRole || (dashboardKey === 'employee' && ['employee', 'preparation', 'control', 'distribution', 'reviewer'].includes(currentRole));

                                    return (
                                        <TouchableOpacity
                                            key={dashboardKey}
                                            style={[styles.item, { backgroundColor: isActive ? theme.primary + '20' : 'transparent', borderColor: isActive ? theme.primary : theme.border }]}
                                            onPress={() => handleSwitch(dashboardKey)}
                                        >
                                            <Ionicons name={info.icon} size={20} color={isActive ? theme.primary : theme.textSecondary} style={{ marginLeft: 10 }} />
                                            <Text style={[styles.itemText, { color: isActive ? theme.primary : theme.text, fontWeight: isActive ? 'bold' : 'normal' }]}>
                                                {dashboardKey === 'employee' && currentRole === 'gomla' ? 'مخزن الجملة' : info.label}
                                            </Text>
                                            {isActive && <Ionicons name="checkmark-circle" size={20} color={theme.primary} style={{ marginRight: 'auto' }} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        borderRadius: 16,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    list: {
        gap: 12,
    },
    item: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
    },
    itemText: {
        fontSize: 16,
    }
});
