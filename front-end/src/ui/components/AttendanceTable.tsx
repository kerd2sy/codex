import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';

export interface EmployeeAttendanceSummary {
    id: string;
    name: string;
    presentDays: number;
    absentDays: number;
    role: string;
}

interface Props {
    employees: EmployeeAttendanceSummary[];
    onSelectEmployee: (id: string) => void;
    selectedEmployeeId: string | null;
}

export const AttendanceTable: React.FC<Props> = ({ employees, onSelectEmployee, selectedEmployeeId }) => {
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.headerCell, styles.nameCol, { color: theme.textSecondary }]}>الموظف</Text>
                <Text style={[styles.headerCell, styles.statCol, { color: theme.textSecondary }]}>حضور</Text>
                <Text style={[styles.headerCell, styles.statCol, { color: theme.textSecondary }]}>غياب</Text>
            </View>

            {employees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.id;
                return (
                    <TouchableOpacity 
                        key={emp.id} 
                        style={[
                            styles.row, 
                            { borderBottomColor: theme.border },
                            isSelected && { backgroundColor: theme.primary + '15' }
                        ]}
                        onPress={() => onSelectEmployee(emp.id)}
                    >
                        <View style={styles.nameCol}>
                            <Text style={[styles.empName, { color: theme.text }]}>{emp.name}</Text>
                            <Text style={[styles.empRole, { color: theme.muted }]}>{emp.role}</Text>
                        </View>
                        <View style={styles.statCol}>
                            <View style={[styles.badge, { backgroundColor: '#4CAF5020' }]}>
                                <Text style={[styles.badgeText, { color: '#4CAF50' }]}>{emp.presentDays}</Text>
                            </View>
                        </View>
                        <View style={styles.statCol}>
                            <View style={[styles.badge, { backgroundColor: '#F4433620' }]}>
                                <Text style={[styles.badgeText, { color: '#F44336' }]}>{emp.absentDays}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        direction: 'rtl',
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row-reverse',
        padding: 12,
        borderBottomWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    headerCell: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row-reverse',
        padding: 12,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    nameCol: {
        flex: 2,
        alignItems: 'flex-start',
    },
    statCol: {
        flex: 1,
        alignItems: 'center',
    },
    empName: {
        fontSize: 16,
        fontWeight: '600',
    },
    empRole: {
        fontSize: 12,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 14,
        fontWeight: 'bold',
    }
});
