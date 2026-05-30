import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Platform,
    StatusBar,
    Dimensions,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { apiFetch } from '@/api/api-client';
import { useRoleGuard } from '@/shared/guards/useRoleGuard';


// Reusing shared components logic
const Header = ({ title, onBack, theme }: any) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
            <TouchableOpacity style={[styles.backCircle, { backgroundColor: theme.card }]} onPress={onBack}>
                <Ionicons name="arrow-forward" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
                <View style={[styles.titleUnderline, { backgroundColor: theme.primary }]} />
            </View>

            <View style={styles.headerIcons}>
                {/* Filter removed as per user request */}
            </View>
        </View>
    );
};

export const AdminSales = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];
    const { loading: authLoading, authorized } = useRoleGuard('admin');

    const [sales, setSales] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;
    
    // Filtering State (Default: All History)
    const [filters, setFilters] = useState({
        store_id: 1,
        date_from: "", 
        date_to: "",
        time_from: "00:00:00",
        time_to: "23:59:59"
    });

    const fetchSales = useCallback(async (isRefresh = false, currentOffset = 0) => {
        if (isRefresh) {
            setRefreshing(true);
            setHasMore(true);
        } else if (currentOffset > 0) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setHasMore(true);
        }

        try {
            let url = `/api/v1/admin/sales?store_id=${filters.store_id}&limit=${PAGE_SIZE}&offset=${currentOffset}`;
            if (filters.date_from && filters.date_to) {
                url += `&date_from=${filters.date_from}&date_to=${filters.date_to}&time_from=${filters.time_from}&time_to=${filters.time_to}`;
            }
            const res = await apiFetch(url);
            if (res.ok) {
                const data = await res.json();
                if (isRefresh || currentOffset === 0) {
                    setSales(data);
                } else {
                    setSales(prev => [...prev, ...data]);
                }
                
                if (data.length < PAGE_SIZE) {
                    setHasMore(false);
                }
            }
        } catch (error) {
            // Error handled by status UI
        } finally {

            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [filters]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !searchQuery) {
            const nextOffset = offset + PAGE_SIZE;
            setOffset(nextOffset);
            fetchSales(false, nextOffset);
        }
    };

    const handleRefresh = () => {
        setOffset(0);
        fetchSales(true, 0);
    };

    useEffect(() => {
        setOffset(0);
        fetchSales(false, 0);
    }, [filters]);

    const filteredSales = useMemo(() => {
        if (!searchQuery) return sales;
        return sales.filter(s => 
            s.user_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.id.toString().includes(searchQuery)
        );
    }, [sales, searchQuery]);

    const renderSaleItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.saleCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push(`/(admin)/sale-details/${item.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.saleHeader}>
                <View style={[styles.idBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.idText, { color: theme.primary }]}>#{item.id}</Text>
                </View>
                <Text style={[styles.saleDate, { color: theme.muted }]}>{item.date}</Text>
            </View>

            <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
                <Text style={[styles.saleUser, { color: theme.text, fontSize: 15, fontWeight: 'bold', textAlign: 'right' }]}>
                    {item.user_name}
                </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: item.is_closed ? theme.success + '20' : theme.error + '20', alignSelf: 'flex-start', marginTop: 8 }]}>
                <Text style={[styles.statusText, { color: item.is_closed ? theme.success : theme.error }]}>
                    {item.is_closed ? 'مغلقة' : 'مفتوحة'}
                </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border + '50' }]} />

            <View style={styles.saleFooter}>
                <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={14} color={theme.muted} />
                    <Text style={[styles.footerText, { color: theme.muted }]}>{item.date}</Text>
                </View>
                <View style={styles.footerItem}>
                    <Ionicons name="cube-outline" size={14} color={theme.muted} />
                    <Text style={[styles.footerText, { color: theme.muted }]}>{item.items_count} صنف</Text>
                </View>
                <Text style={[styles.saleTotal, { color: theme.primary }]}>{item.total.toLocaleString()} ج.م</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            <Header title="قائمة المبيعات" onBack={() => router.back()} theme={theme} />
            
            <View style={styles.searchBarContainer}>
                <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="search" size={20} color={theme.muted} />
                    <TextInput 
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="بحث عن فاتورة أو عميل..."
                        placeholderTextColor={theme.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            { (authLoading || loading) && !refreshing ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : !authorized ? null : (
                <FlatList 
                    data={filteredSales}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSaleItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} /> : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={60} color={theme.border} />
                            <Text style={[styles.emptyText, { color: theme.muted }]}>لا توجد مبيعات في هذه الفترة</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 100,
    },
    backCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    titleUnderline: { width: 40, height: 3, marginTop: 4, borderRadius: 2 },
    headerIcons: { flexDirection: 'row-reverse' },
    headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    
    searchBarContainer: { padding: 15 },
    searchBar: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 50,
        borderRadius: 15,
        borderWidth: 1,
    },
    searchInput: { flex: 1, height: '100%', textAlign: 'right', fontSize: 14, marginRight: 10 },
    
    listContent: { padding: 15, paddingBottom: 50 },
    saleCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    saleHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    idBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
    idText: { fontSize: 13, fontWeight: 'bold' },
    saleDate: { fontSize: 13, fontWeight: '600' },
    saleMainInfo: { alignItems: 'flex-end' },
    saleId: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    saleUser: { fontSize: 13 },
    statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, alignSelf: 'flex-end', marginTop: 8 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    divider: { height: 1, marginVertical: 12 },
    saleFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    footerItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    footerText: { fontSize: 12 },
    saleTotal: { fontSize: 16, fontWeight: 'bold' },
    
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 15, marginTop: 15, fontWeight: '600' },

    // Details Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 25,
        height: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 20,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: '900',
    },
    detailSubtitle: {
        fontSize: 12,
        fontWeight: '600',
    },
    detailsLoading: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemsTable: {
        borderWidth: 1,
        borderRadius: 15,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        padding: 12,
    },
    headerCell: {
        fontSize: 12,
        fontWeight: '800',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    cell: {
        fontSize: 13,
        fontWeight: '600',
    },
    detailsFooter: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        gap: 10,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLabel: {
        fontSize: 14,
        fontWeight: '700',
    },
    footerVal: {
        fontSize: 14,
        fontWeight: '800',
    },
    footerTotal: {
        fontSize: 22,
        fontWeight: '900',
    },
});


