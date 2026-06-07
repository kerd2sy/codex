import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { apiFetch } from '@/shared/api/api-client';

interface EmployeeLoan {
    id: number;
    total_amount: number;
    monthly_installment: number;
    remaining_amount: number;
    is_active: boolean;
    created_at: string;
}

export const EmployeeLoansView = ({ employeeId }: { employeeId: string | number }) => {
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [loans, setLoans] = useState<EmployeeLoan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employeeId) {
            fetchLoans();
        }
    }, [employeeId]);

    const fetchLoans = async () => {
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

    const activeLoans = loans.filter(l => l.is_active && l.remaining_amount > 0);

    if (loading) {
        return <ActivityIndicator size="small" color={theme.primary} />;
    }

    if (activeLoans.length === 0) {
        return null; // Hide if no active loans
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: '#FF9800' }]}>تفاصيل السلف النشطة 💳</Text>
            </View>

            {activeLoans.map(loan => (
                <View key={loan.id} style={[styles.loanRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.col}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>المتبقي</Text>
                        <Text style={[styles.value, { color: theme.primary }]}>{loan.remaining_amount} ج</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>القسط المخصوم</Text>
                        <Text style={[styles.value, { color: '#F44336' }]}>{loan.monthly_installment} ج</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>إجمالي السلفة</Text>
                        <Text style={[styles.value, { color: theme.text }]}>{loan.total_amount} ج</Text>
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 15,
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#FF980030',
        backgroundColor: '#FF980005',
    },
    header: {
        marginBottom: 10,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    loanRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    col: {
        alignItems: 'center',
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
    },
    value: {
        fontSize: 14,
        fontWeight: 'bold',
    }
});
