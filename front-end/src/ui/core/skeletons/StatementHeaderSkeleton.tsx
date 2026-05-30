import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { BaseSkeleton } from './BaseSkeleton';

export const StatementHeaderSkeleton = () => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    return (
        <View style={styles.container}>
            {/* Limitation Note Skeleton */}
            <View style={[styles.limitNote, { borderColor: theme.border }]}>
                <BaseSkeleton width={20} height={20} borderRadius={10} />
                <BaseSkeleton width="80%" height={14} style={{ marginLeft: 10 }} />
            </View>

            {/* Period Container Skeleton */}
            <View style={styles.periodContainer}>
                <View style={styles.chipsRow}>
                    <BaseSkeleton width={60} height={35} borderRadius={12} />
                    <BaseSkeleton width={70} height={35} borderRadius={12} />
                    <BaseSkeleton width={85} height={35} borderRadius={12} />
                </View>
                
                <View style={{ flex: 1 }} />
                
                <BaseSkeleton width={44} height={44} borderRadius={22} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: 15 },
    limitNote: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        padding: 15, 
        borderRadius: 16, 
        borderWidth: 1, 
        marginBottom: 10 
    },
    periodContainer: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        marginBottom: 20 
    },
    chipsRow: { 
        flexDirection: 'row-reverse', 
        gap: 10 
    }
});
