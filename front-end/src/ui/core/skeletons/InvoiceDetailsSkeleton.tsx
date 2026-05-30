import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { BaseSkeleton } from './BaseSkeleton';

interface InvoiceDetailsSkeletonProps {
    count?: number;
}

export const InvoiceDetailsSkeleton: React.FC<InvoiceDetailsSkeletonProps> = ({ count }) => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    // Use passed count if valid (even if 1 or 2), otherwise default to 6 for a balanced look
    const parsedCount = count !== undefined && count !== null ? Number(count) : NaN;
    const safeCount = !isNaN(parsedCount) ? Math.max(1, parsedCount) : 6;
    const skeletonItems = Array.from({ length: safeCount }, (_, i) => i + 1);

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.invoiceCard, { backgroundColor: theme.background }]}>
                {/* Items List */}
                {skeletonItems.map(i => (
                    <View key={i} style={styles.itemCard}>
                        <View style={[styles.itemInfoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={styles.itemNameWrapper}>
                                <BaseSkeleton width="70%" height={16} />
                            </View>
                            <View style={styles.itemSpecsGrid}>
                                {[1, 2, 3, 4].map(s => (
                                    <View key={s} style={{ alignItems: 'center', flex: 1 }}>
                                        <BaseSkeleton width={30} height={10} style={{ marginBottom: 6 }} />
                                        <BaseSkeleton width={45} height={14} />
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                ))}

                {/* Prominent Total Section Skeleton */}
                <View style={[styles.totalSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <BaseSkeleton width={120} height={20} style={{ marginBottom: 8 }} />
                    <BaseSkeleton width={180} height={32} />
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    content: { padding: 0 },
    summaryHub: {
        flexDirection: 'row-reverse',
        marginHorizontal: '5%',
        paddingVertical: 12,
        paddingHorizontal: 5,
        borderRadius: 20,
        borderWidth: 1,
        marginTop: 10,
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'space-around'
    },
    hubSegment: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 2
    },
    hubDivider: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(0,0,0,0.05)'
    },
    invoiceCard: { 
        borderTopLeftRadius: 35, 
        borderTopRightRadius: 35, 
        padding: 24, 
        flex: 1,
        minHeight: 500,
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    itemsList: { marginBottom: 24 },
    itemCard: { paddingVertical: 12 },
    itemInfoCard: { 
        padding: 16, 
        borderRadius: 20, 
        borderWidth: 1,
    },
    itemNameWrapper: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)'
    },
    itemSpecsGrid: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    totalSection: { 
        width: '100%',
        padding: 24,
        borderRadius: 25,
        borderWidth: 1,
        alignItems: 'center',
        marginTop: 20,
    },
});
