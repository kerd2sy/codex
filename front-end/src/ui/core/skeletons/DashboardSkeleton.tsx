import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { BaseSkeleton } from './BaseSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';

const { width } = Dimensions.get('window');

export const DashboardSkeleton = () => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
            {/* Header Skeleton */}
            <View style={[styles.header, { 
                paddingTop: insets.top + HEADER_TOP_GAP, 
                height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP 
            }]}>
                <View style={styles.headerText}>
                    <BaseSkeleton width={100} height={10} style={{ marginBottom: 6 }} />
                    <BaseSkeleton width={160} height={16} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <BaseSkeleton width={44} height={44} borderRadius={22} />
                    <BaseSkeleton width={44} height={44} borderRadius={22} />
                </View>
            </View>

            {/* Search Bar Skeleton */}
            <View style={styles.searchBar}>
                <BaseSkeleton width="100%" height={60} borderRadius={20} />
            </View>

            {/* Balance Card Skeleton */}
            <View style={styles.balanceCard}>
                <BaseSkeleton width="100%" height={140} borderRadius={12} />
            </View>

            {/* Categories Grid Skeleton */}
            <View style={styles.categories}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.categoryItem}>
                        <BaseSkeleton width={70} height={70} borderRadius={20} />
                        <BaseSkeleton width={50} height={10} style={{ marginTop: 8 }} />
                    </View>
                ))}
            </View>

            {/* Recent Items Section */}
            <View style={styles.sectionHeader}>
                <BaseSkeleton width={120} height={20} />
                <BaseSkeleton width={60} height={14} />
            </View>
            <View style={styles.recentScroll}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.productCard}>
                        <View style={styles.productCardImageSkeleton}>
                            <BaseSkeleton width={48} height={48} borderRadius={10} />
                        </View>
                        <BaseSkeleton width="90%" height={12} style={{ marginTop: 10 }} />
                        <BaseSkeleton width="70%" height={12} style={{ marginTop: 6 }} />
                    </View>
                ))}
            </View>

            {/* Order Tracking Section Skeleton */}
            <View style={styles.sectionHeader}>
                <BaseSkeleton width={120} height={20} />
                <BaseSkeleton width={60} height={14} />
            </View>
            <View style={[styles.ordersSkeletonCard, { backgroundColor: theme.card, borderColor: theme.border + '30' }]}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.orderSkeletonItem}>
                        <View style={styles.orderSkeletonRight}>
                            <BaseSkeleton width={120} height={14} style={{ marginBottom: 8 }} />
                            <View style={styles.skeletonSteps}>
                                {[1, 2, 3, 4].map(s => <BaseSkeleton key={s} width={18} height={18} borderRadius={9} />)}
                            </View>
                        </View>
                        <BaseSkeleton width={80} height={20} borderRadius={8} />
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        paddingHorizontal: '5%',
        gap: 12
    },
    headerText: { flex: 1, alignItems: 'flex-end' },
    searchBar: { marginHorizontal: '5%', marginVertical: 20 },
    balanceCard: { paddingHorizontal: '5%', marginBottom: 32 },
    categories: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        paddingHorizontal: '5%', 
        paddingBottom: 24 
    },
    categoryItem: { alignItems: 'center' },
    sectionHeader: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        paddingHorizontal: '5%', 
        marginBottom: 15 
    },
    recentScroll: { 
        flexDirection: 'row-reverse', 
        paddingHorizontal: '5%', 
        gap: 16,
        marginBottom: 10
    },
    productCard: { 
        width: 155, 
        height: 185,
        padding: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#00000010',
        alignItems: 'center'
    },
    productCardImageSkeleton: {
        width: '100%',
        height: 85,
        borderRadius: 18,
        backgroundColor: '#00000005',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6
    },
    ordersSkeletonCard: {
        marginHorizontal: '5%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10
    },
    orderSkeletonItem: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10
    },
    orderSkeletonRight: { alignItems: 'flex-end', flex: 1 },
    skeletonSteps: {
        flexDirection: 'row-reverse',
        gap: 20,
        marginTop: 4
    }
});
