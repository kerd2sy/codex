import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { useTransactionList } from '../../hooks/useTransactionList';
import { FinancialListTemplate } from '../../components/FinancialListTemplate';
import { FinancialModule } from '../../hooks/useBaseFinancialList';
import { SmallOrderCard } from '../../components/SmallOrderCard';
import { PharmacyVault } from '../../utils/vault';

interface TransactionsListProps {
    type: FinancialModule;
    title: string;
    accentColor?: string;
    emptyText?: string;
}

export const TransactionsList = ({ 
    type, 
    title, 
    accentColor = '#2196F3', 
    emptyText = 'لا توجد بيانات' 
}: TransactionsListProps) => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const { 
        transactions, loading, isFetchingMore, 
        loadMore, refreshing, refresh, isSyncing 
    } = useTransactionList({ type });

    const [cachedDetailIds, setCachedDetailIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        let isMounted = true;
        const updateCacheStatus = async () => {
            try {
                const activePharmId = await AsyncStorage.getItem('@active_pharmacy_id');
                if (!activePharmId || !isMounted) return;

                const allKeys = await AsyncStorage.getAllKeys();
                const prefix = PharmacyVault.makeKey(activePharmId, 'details', '');
                const detailIds = allKeys
                    .filter(key => key.startsWith(prefix))
                    .map(key => key.replace(prefix, ''));
                
                setCachedDetailIds(new Set(detailIds));
            } catch (e) {}
        };

        updateCacheStatus();
        
        // Refresh when syncing is active to catch new downloads
        let interval: any;
        if (isSyncing) {
            interval = setInterval(updateCacheStatus, 3000);
        }
        
        return () => {
            isMounted = false;
            if (interval) clearInterval(interval);
        };
    }, [isSyncing, transactions.length, type]);

    const isCash = type === 'cash';
    const isOrderStyle = type === 'orders';

    const renderItem = ({ item }: { item: any }) => {
        if (isOrderStyle) {
            // Mapping for SmallOrderCard
            const orderData = {
                ...item,
                supplier: item.title,
            };

            return (
                <SmallOrderCard 
                    order={orderData}
                    theme={theme}
                    onPress={() => {
                        router.push({
                            pathname: '/(pharmacy)/purchases/[id]',
                            params: { 
                                id: item.id, 
                                count: item.items_count || item.count || item.items_qty || item.QTY_ROWS 
                            }
                        } as any);
                    }}
                />
            );
        }

        // Handle Cash specific styling
        const isIncome = isCash && item.type === 'in';
        const itemColor = isCash ? (isIncome ? theme.success : theme.error) : accentColor;
        
        // Handle navigation path
        const detailPaths: Record<string, string> = {
            'purchases': '/(pharmacy)/purchases/[id]',
            'sales': '/(pharmacy)/sales/[id]',
            'returns': '/(pharmacy)/returns/[id]',
            'cash': '#' // Cash doesn't have a detail screen yet
        };

        const handlePress = () => {
            const path = detailPaths[type];
            if (path && path !== '#') {
                router.push({
                    pathname: path,
                    params: { 
                        id: item.id, 
                        count: item.items_count || item.count || item.items_qty || item.QTY_ROWS 
                    }
                } as any);
            }
        };

        return (
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={handlePress}
                activeOpacity={0.7}
                disabled={!detailPaths[type] || detailPaths[type] === '#'}
            >
                <View style={styles.cardInfo}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.supplierTopName, { color: theme.primary }]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <View style={[styles.idBadge, { backgroundColor: theme.primary + '10' }]}>
                            <Text style={[styles.idText, { color: theme.primary }]}>#{String(item.id).replace(/^[A-Za-z]_|^#/, '')}</Text>
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.dateCol}>
                            <View style={styles.dateTimeRow}>
                                <Ionicons name="calendar-outline" size={13} color={theme.muted} style={{ marginLeft: 4 }} />
                                <Text style={[styles.dateText, { color: theme.muted }]}>{item.date}</Text>
                                {item.time && (
                                    <>
                                        <View style={[styles.timeDivider, { backgroundColor: theme.border + '40' }]} />
                                        <Ionicons name="time-outline" size={13} color={theme.muted} style={{ marginLeft: 4 }} />
                                        <Text style={[styles.dateText, { color: theme.muted }]}>{item.time}</Text>
                                    </>
                                )}
                            </View>
                        </View>
                        <View style={styles.priceCol}>
                            <Text style={[styles.amount, { color: isCash ? itemColor : theme.text }]}>
                                {Number(item.amount || 0).toLocaleString('en-US')}
                            </Text>
                            <Text style={[styles.currency, { color: theme.muted }]}>ج.م</Text>
                        </View>
                    </View>
                </View>
                <View style={[styles.accent, { backgroundColor: (cachedDetailIds.has(String(item.id)) || isCash) ? itemColor : 'transparent' }]} />
            </TouchableOpacity>
        );
    };

    return (
        <FinancialListTemplate
            title={title}
            data={transactions}
            loading={loading}
            refreshing={refreshing}
            onRefresh={refresh}
            onLoadMore={loadMore}
            isSyncing={isSyncing}
            isFetchingMore={isFetchingMore}
            renderItem={renderItem}
            emptyText={emptyText}
            accentColor={isCash ? theme.success : accentColor}
        />
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row-reverse',
        borderRadius: 24,
        marginHorizontal: '5%',
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
    },
    accent: { width: 6 },
    cardInfo: { flex: 1, padding: 20 },
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    supplierTopName: { fontSize: 16, fontWeight: '900', flex: 1, textAlign: 'right' },
    idBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    idText: { fontSize: 12, fontWeight: '800' },
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)' },
    dateCol: { flex: 1, alignItems: 'flex-end' },
    dateTimeRow: { flexDirection: 'row-reverse', alignItems: 'center' },
    timeDivider: { width: 1, height: 10, marginHorizontal: 8 },
    dateText: { fontSize: 12, fontWeight: '700' },
    priceCol: { flex: 1, flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'flex-end' },
    amount: { fontSize: 18, fontWeight: '900' },
    currency: { fontSize: 11, fontWeight: '700', marginRight: 4 }
});

