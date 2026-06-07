import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    RefreshControl, 
    TextInput,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiFetch } from '@/api/api-client';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';

const Header = ({ title, onBack, onOpenFilter, theme }: any) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
            <View style={styles.headerRight}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.primary }]}>{title}</Text>
                    <View style={[styles.titleUnderline, { backgroundColor: theme.primary }]} />
                </View>
            </View>

            <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={onOpenFilter}>
                   <Ionicons name="filter" size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function PharmaciesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const PAGE_SIZE = 50;

    const fetchPharmacies = useCallback(async (isRefresh = false, currentOffset = 0, search = searchQuery) => {
        if (isRefresh) setRefreshing(true);
        else if (currentOffset === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await apiFetch(`/api/v1/admin/pharmacies?limit=${PAGE_SIZE}&offset=${currentOffset}&search=${search}`);
            if (res.ok) {
                const data = await res.json();
                if (isRefresh || currentOffset === 0) {
                    setPharmacies(data);
                } else {
                    setPharmacies(prev => [...prev, ...data]);
                }
                setHasMore(data.length === PAGE_SIZE);
            }
        } catch (error) {
            console.error('Error fetching pharmacies:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [searchQuery]);

    useFocusEffect(
        useCallback(() => {
            fetchPharmacies(true, 0, searchQuery);
        }, [fetchPharmacies, searchQuery])
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPharmacies(false, 0, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleRefresh = () => {
        setOffset(0);
        fetchPharmacies(true, 0);
    };

    const handleLoadMore = () => {
        if (hasMore && !loadingMore && !loading) {
            const nextOffset = offset + PAGE_SIZE;
            setOffset(nextOffset);
            fetchPharmacies(false, nextOffset);
        }
    };

    const openEdit = (pharma: any) => {
        router.push({
            pathname: '/(admin)/edit-pharmacy/[id]',
            params: { id: pharma.id, pharmaData: JSON.stringify(pharma) }
        });
    };

    const TIER_MAP: any = {
        0: 'بدون شريحة',
        1: 'صيدلية',
        2: 'جملة',
        3: 'عميل / مندوب',
        4: 'كبار عملاء',
        5: 'شركات'
    };

    const renderPharmaItem = ({ item }: { item: any }) => (
        <View style={[styles.pharmaCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.pharmaHeader}>
                <View style={[styles.idBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.idText, { color: theme.primary }]}>#{item.id}</Text>
                </View>
                {item.status === 1 && (
                    <View style={[styles.statusBadge, { backgroundColor: theme.error + '15' }]}>
                        <Ionicons name="warning" size={12} color={theme.error} />
                        <Text style={[styles.statusText, { color: theme.error }]}>موقوف التعامل</Text>
                    </View>
                )}
                {item.status === 2 && (
                    <View style={[styles.statusBadge, { backgroundColor: theme.muted + '15' }]}>
                        <Ionicons name="eye-off" size={12} color={theme.muted} />
                        <Text style={[styles.statusText, { color: theme.muted }]}>غير متعامل</Text>
                    </View>
                )}
                {item.status === 0 && (
                    <View style={[styles.statusBadge, { backgroundColor: theme.success + '15' }]}>
                        <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                        <Text style={[styles.statusText, { color: theme.success }]}>متاح التعامل</Text>
                    </View>
                )}
                <Text style={[styles.pharmaName, { color: theme.text }]}>{item.name}</Text>
            </View>

            <View style={styles.pharmaGrid}>
                <View style={styles.gridItem}>
                    <Ionicons name="cash-outline" size={16} color={theme.muted} />
                    <Text style={[styles.gridVal, { color: theme.text }]}>{item.limit.toLocaleString()} ج.م</Text>
                    <Text style={[styles.gridLabel, { color: theme.muted }]}>الحد الائتماني</Text>
                </View>
                <View style={styles.gridItem}>
                    <Ionicons name="layers-outline" size={16} color={theme.muted} />
                    <Text style={[styles.gridVal, { color: theme.text }]}>{TIER_MAP[item.kind] || item.kind}</Text>
                    <Text style={[styles.gridLabel, { color: theme.muted }]}>الشريحة</Text>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border + '50' }]} />

            <View style={styles.pharmaFooter}>
                <View style={styles.footerInfo}>
                    <View style={styles.infoRow}>
                        <Ionicons name="person" size={14} color={theme.primary} />
                        <Text style={[styles.footerText, { color: theme.text }]}>الصباحي: {item.emp_name || 'بدون'}</Text>
                    </View>
                    <View style={[styles.infoRow, { marginTop: 4 }]}>
                        <Ionicons name="moon" size={14} color={theme.warning} />
                        <Text style={[styles.footerText, { color: theme.text }]}>المسائي: {item.evening_name || 'بدون'}</Text>
                    </View>
                    <View style={[styles.infoRow, { marginTop: 4 }]}>
                        <Ionicons name="car" size={14} color={theme.success} />
                        <Text style={[styles.footerText, { color: theme.text }]}>الموزع: {item.dist_name || 'بدون'}</Text>
                    </View>
                </View>
                
                <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.primary }]} onPress={() => openEdit(item)}>
                    <Text style={styles.editBtnText}>تعديل</Text>
                    <Ionicons name="create-outline" size={16} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            <Header 
                title="إدارة الصيدليات" 
                onBack={() => router.back()} 
                theme={theme} 
                onOpenFilter={() => {}}
            />

            <View style={styles.searchBarContainer}>
                <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="search" size={20} color={theme.muted} />
                    <TextInput 
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="بحث عن صيدلية بالاسم أو الكود..."
                        placeholderTextColor={theme.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList 
                    data={pharmacies}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderPharmaItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={theme.primary} style={{ margin: 20 }} /> : null}
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
        paddingHorizontal: 24,
    },
    headerRight: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 12, 
        flex: 1 
    },
    backBtn: { padding: 4, marginLeft: -4 },
    headerTitleContainer: {
        alignItems: 'flex-end',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    titleUnderline: {
        width: 25,
        height: 4,
        marginTop: -2,
        borderRadius: 2,
    },
    headerIcons: { flexDirection: 'row-reverse', alignItems: 'center' },
    headerIconBtn: { padding: 4 },

    searchBarContainer: { paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1 },
    searchInput: { flex: 1, textAlign: 'right', fontSize: 14, marginRight: 10 },
    
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 15, paddingBottom: 50 },
    
    pharmaCard: { borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1 },
    pharmaHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 15 },
    idBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
    idText: { fontSize: 12, fontWeight: 'bold' },
    pharmaName: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'right' },
    
    statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    
    pharmaGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
    gridItem: { alignItems: 'center', flex: 1 },
    gridVal: { fontSize: 15, fontWeight: '800', marginVertical: 4 },
    gridLabel: { fontSize: 11, fontWeight: '600' },
    
    divider: { height: 1, marginVertical: 15 },
    
    pharmaFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    footerInfo: { gap: 5 },
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 13, fontWeight: '600' },
    
    editBtn: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 12, gap: 5 },
    editBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    
});
