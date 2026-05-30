import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { BaseSkeleton } from './BaseSkeleton';

interface FinancialCardSkeletonProps {
    accentColor?: string;
}

export const FinancialCardSkeleton: React.FC<FinancialCardSkeletonProps> = ({ accentColor }) => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardInfo}>
                {/* Header Row - Supplier Name Skeleton */}
                <View style={styles.headerRow}>
                    <BaseSkeleton width="70%" height={22} borderRadius={4} />
                </View>

                {/* 3-Column Footer Skeleton */}
                <View style={styles.cardFooter}>
                    {/* Date Column (Right) */}
                    <View style={styles.column}>
                        <BaseSkeleton width={80} height={14} borderRadius={4} />
                    </View>
                    
                    {/* ID Column (Center) */}
                    <View style={[styles.column, { alignItems: 'center' }]}>
                        <BaseSkeleton width={60} height={24} borderRadius={8} />
                    </View>

                    {/* Price Column (Left) */}
                    <View style={[styles.column, { alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline' }}>
                            <BaseSkeleton width={60} height={24} borderRadius={4} />
                            <View style={{ width: 4 }} />
                            <BaseSkeleton width={20} height={12} borderRadius={2} />
                        </View>
                    </View>
                </View>
            </View>
            <View style={[styles.accent, { backgroundColor: accentColor || theme.primary, opacity: 0.15 }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    card: { 
        flexDirection: 'row-reverse',
        borderRadius: 20, 
        marginHorizontal: '5%',
        marginBottom: 16, 
        borderWidth: 1, 
        overflow: 'hidden', 
        backgroundColor: '#FFF',
        // Premium depth
        elevation: 4, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.06, 
        shadowRadius: 10 
    },
    accent: { width: 6 },
    cardInfo: { flex: 1, padding: 20 },
    headerRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
    },
    column: {
        flex: 1,
        alignItems: 'flex-end',
    },
});
