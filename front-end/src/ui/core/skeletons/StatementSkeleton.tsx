import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { BaseSkeleton } from './BaseSkeleton';

export const StatementSkeleton = () => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.itemHeader}>
                <View style={styles.dateCol}>
                    <BaseSkeleton width={80} height={14} style={{ marginBottom: 4 }} />
                    <BaseSkeleton width={60} height={10} />
                </View>
                <BaseSkeleton width={70} height={24} borderRadius={12} />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                    <BaseSkeleton width={55} height={10} style={{ marginBottom: 4 }} />
                    <BaseSkeleton width={45} height={14} />
                </View>
                <View style={[styles.gridItem, styles.centerBorder, { borderColor: theme.border }]}>
                    <BaseSkeleton width={45} height={10} style={{ marginBottom: 4 }} />
                    <BaseSkeleton width={55} height={16} />
                </View>
                <View style={styles.gridItem}>
                    <BaseSkeleton width={55} height={10} style={{ marginBottom: 4 }} />
                    <BaseSkeleton width={50} height={16} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    itemCard: { 
        borderRadius: 24, 
        borderWidth: 1, 
        padding: 16, 
        marginBottom: 16, 
        elevation: 2, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 10 
    },
    itemHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    dateCol: { alignItems: 'flex-start' },
    divider: { height: 1, marginVertical: 12, opacity: 0.5 },
    gridRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
    gridItem: { flex: 1, alignItems: 'center' },
    centerBorder: { borderLeftWidth: 1, borderRightWidth: 1 },
});
