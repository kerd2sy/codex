import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ActivityIndicator, 
    FlatList,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/api/api-client';

import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';

export default function ProductCodingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [search, setSearch] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        price: '',
        barcode: '',
        location: '',
        quota: '',
        quotaEnabled: false
    });

    const fetchProducts = async (searchText: string = '') => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/v1/admin/products?limit=50&search=${searchText}`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Fetch products error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSearch = (text: string) => {
        setSearch(text);
        // Debounce search if needed, but for now just fetch
        if (text.length >= 2 || text.length === 0) {
            fetchProducts(text);
        }
    };

    const openEdit = (product: any) => {
        setEditingProduct(product);
        setForm({
            price: product.price.toString(),
            barcode: product.barcode || '',
            location: product.location || '',
            quota: product.quota.toString(),
            quotaEnabled: product.quota_enabled
        });
        setEditModalVisible(true);
    };

    const saveProduct = async () => {
        if (!editingProduct) return;
        setSaving(true);
        try {
            const res = await apiFetch(`/api/v1/admin/products/${editingProduct.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    price: parseFloat(form.price),
                    barcode: form.barcode,
                    location: form.location,
                    quota: parseFloat(form.quota),
                    quota_enabled: form.quotaEnabled
                })
            });

            if (res.ok) {
                Alert.alert('نجاح', 'تم تحديث بيانات الصنف بنجاح');
                setEditModalVisible(false);
                fetchProducts(search);
            } else {
                Alert.alert('خطأ', 'فشل في تحديث البيانات');
            }
        } catch (error) {
            console.error('Update product error:', error);
            Alert.alert('خطأ', 'حدث خطأ غير متوقع');
        } finally {
            setSaving(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => openEdit(item)}
        >
            <View style={styles.itemHeader}>
                <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1}}>
                    <Text style={[styles.itemID, { color: theme.muted }]}>#{item.id}</Text>
                    <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                </View>
                <View style={[
                    styles.quotaBadge, 
                    { backgroundColor: item.quota_enabled ? theme.success + '20' : theme.error + '20' }
                ]}>
                    <Text style={[
                        styles.quotaBadgeText, 
                        { color: item.quota_enabled ? theme.success : theme.error }
                    ]}>
                        {item.quota_enabled ? 'كوتة مفعلة' : 'كوتة غير مفعلة'}
                    </Text>
                </View>
            </View>

            <View style={styles.detailsGrid}>
                <DetailBox label="الموقع" value={item.location || '---'} icon="location-outline" theme={theme} color="#3B82F6" />
                <DetailBox label="الكوتة" value={item.quota} icon="stats-chart-outline" theme={theme} color="#8B5CF6" />
                <DetailBox label="السعر" value={`${item.price} ج.م`} icon="pricetag-outline" theme={theme} color="#10B981" />
                <DetailBox label="الباركود" value={item.barcode || '---'} icon="barcode-outline" theme={theme} color="#F59E0B" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: theme.primary }]}>تكويد الأصناف</Text>
                        <View style={[styles.titleUnderline, { backgroundColor: theme.primary }]} />
                    </View>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name="search" size={20} color={theme.muted} />
                    <TextInput 
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="ابحث بالاسم، الكود، أو الباركود..."
                        placeholderTextColor={theme.muted}
                        value={search}
                        onChangeText={handleSearch}
                        textAlign="right"
                    />
                </View>
            </View>

            {loading && products.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList 
                    data={products}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={{ color: theme.muted }}>لا توجد نتائج</Text>
                        </View>
                    }
                />
            )}

            <Modal 
                visible={editModalVisible} 
                transparent 
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>تعديل بيانات الصنف</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={28} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        {editingProduct && (
                            <Text style={[styles.editingName, { color: theme.primary }]}>{editingProduct.name}</Text>
                        )}

                        <ScrollView style={styles.modalBody}>
                            <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10}}>
                                    <Ionicons name="shield-checkmark" size={24} color={form.quotaEnabled ? theme.success : theme.muted} />
                                    <Text style={[styles.toggleLabel, { color: theme.text }]}>تفعيل نظام الكوتة</Text>
                                </View>
                                <Switch 
                                    value={form.quotaEnabled} 
                                    onValueChange={(v) => setForm({...form, quotaEnabled: v})}
                                    trackColor={{ false: theme.border, true: theme.primary }}
                                    thumbColor="#FFF"
                                />
                            </View>

                            <FormField label="سعر الجمهور" value={form.price} onChange={(v: string) => setForm({...form, price: v})} icon="pricetag" keyboardType="numeric" theme={theme} />
                            <FormField label="الباركود" value={form.barcode} onChange={(v: string) => setForm({...form, barcode: v})} icon="barcode" keyboardType="numeric" theme={theme} />
                            <FormField label="الموقع (POIS_ALL)" value={form.location} onChange={(v: string) => setForm({...form, location: v})} icon="location" theme={theme} />
                            <FormField label="الكوتة (الكمية)" value={form.quota} onChange={(v: string) => setForm({...form, quota: v})} icon="stats-chart" keyboardType="numeric" theme={theme} />
                        </ScrollView>

                        <TouchableOpacity 
                            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                            onPress={saveProduct}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>حفظ التغييرات</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const DetailBox = ({ label, value, icon, theme, color }: any) => (
    <View style={[styles.detailBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.detailTitleRow}>
            <Text style={[styles.detailLabel, { color: theme.muted }]}>{label}</Text>
            <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
    </View>
);

const FormField = ({ label, value, onChange, icon, keyboardType, theme }: any) => (
    <View style={styles.formGroup}>
        <View style={styles.formLabelRow}>
            <Text style={[styles.formLabel, { color: theme.muted }]}>{label}</Text>
            <Ionicons name={icon} size={16} color={theme.primary} />
        </View>
        <TextInput 
            style={[styles.formInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={value}
            onChangeText={onChange}
            keyboardType={keyboardType}
            textAlign="right"
        />
    </View>
);

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
    
    searchContainer: { padding: 20 },
    searchBox: { flexDirection: 'row-reverse', alignItems: 'center', height: 55, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1 },
    searchInput: { flex: 1, height: '100%', marginRight: 10, fontSize: 14 },
    
    listContent: { padding: 20, paddingTop: 0, gap: 15 },
    itemCard: { borderRadius: 22, padding: 18, borderWidth: 1 },
    itemHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    itemName: { fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'right', marginLeft: 10 },
    itemID: { fontSize: 12, fontWeight: '600' },
    
    quotaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    quotaBadgeText: { fontSize: 11, fontWeight: 'bold' },

    detailsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
    detailBox: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1 },
    detailTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginBottom: 5 },
    detailLabel: { fontSize: 11, fontWeight: '600' },
    detailValue: { fontSize: 13, fontWeight: '800' },
    
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    editingName: { fontSize: 16, fontWeight: 'bold', marginBottom: 20, textAlign: 'right' },
    
    toggleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 20 },
    toggleLabel: { fontSize: 16, fontWeight: 'bold' },

    modalBody: { marginBottom: 20 },
    
    formGroup: { marginBottom: 15 },
    formLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 },
    formLabel: { fontSize: 14, fontWeight: '600' },
    formInput: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, fontSize: 15 },
    
    saveBtn: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
