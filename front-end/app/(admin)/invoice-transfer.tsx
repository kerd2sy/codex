import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ActivityIndicator, 
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/api/api-client';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';

export default function InvoiceTransferScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [invoiceId, setInvoiceId] = useState('');
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [pharmaSearch, setPharmaSearch] = useState('');
    const [selectedPharma, setSelectedPharma] = useState<any>(null);
    const [transferring, setTransferring] = useState(false);

    const lookupInvoice = async () => {
        if (!invoiceId) return;
        setLoading(true);
        setInvoice(null);
        setSelectedPharma(null);
        try {
            const res = await apiFetch(`/api/v1/admin/invoices/${invoiceId}`);
            if (res.ok) {
                const data = await res.json();
                setInvoice(data);
            } else {
                Alert.alert('خطأ', 'الفاتورة غير موجودة');
            }
        } catch (error) {
            console.error('Lookup error:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchPharmacies = async (search: string) => {
        setPharmaSearch(search);
        if (search.length < 2) {
            setPharmacies([]);
            return;
        }
        try {
            const res = await apiFetch(`/api/v1/admin/pharmacies?limit=10&search=${search}`);
            if (res.ok) {
                const data = await res.json();
                setPharmacies(data);
            }
        } catch (error) {
            console.error('Pharma search error:', error);
        }
    };

    const handleTransfer = async () => {
        if (!invoice || !selectedPharma) return;

        Alert.alert(
            'تأكيد النقل',
            `هل أنت متأكد من تحويل الفاتورة رقم ${invoiceId} من ${invoice.account_name} إلى ${selectedPharma.name}؟`,
            [
                { text: 'الغاء', style: 'cancel' },
                { 
                    text: 'تأكيد النقل', 
                    style: 'destructive',
                    onPress: async () => {
                        setTransferring(true);
                        try {
                            const res = await apiFetch(`/api/v1/admin/invoices/${invoiceId}/transfer`, {
                                method: 'POST',
                                body: JSON.stringify({ target_account_id: selectedPharma.id })
                            });
                            if (res.ok) {
                                Alert.alert('نجاح', 'تم تحويل الفاتورة بنجاح');
                                setInvoice(null);
                                setInvoiceId('');
                                setSelectedPharma(null);
                            } else {
                                Alert.alert('خطأ', 'فشل في عملية النقل');
                            }
                        } catch (error) {
                            console.error('Transfer error:', error);
                        } finally {
                            setTransferring(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: theme.primary }]}>تحويل الفواتير</Text>
                        <View style={[styles.titleUnderline, { backgroundColor: theme.primary }]} />
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.label, { color: theme.text }]}>رقم الفاتورة</Text>
                    <View style={styles.searchRow}>
                        <TextInput 
                            style={[styles.input, { flex: 1, backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            placeholder="مثال: 943"
                            placeholderTextColor={theme.muted}
                            keyboardType="numeric"
                            value={invoiceId}
                            onChangeText={setInvoiceId}
                        />
                        <TouchableOpacity 
                            style={[styles.lookupBtn, { backgroundColor: theme.primary }]} 
                            onPress={lookupInvoice}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Ionicons name="search" size={24} color="#FFF" />}
                        </TouchableOpacity>
                    </View>
                </View>

                {invoice && (
                    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 15 }]}>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>تفاصيل الفاتورة الحالية</Text>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: theme.muted }]}>العميل الحالي:</Text>
                            <Text style={[styles.infoVal, { color: theme.text }]}>{invoice.account_name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: theme.muted }]}>التاريخ:</Text>
                            <Text style={[styles.infoVal, { color: theme.text }]}>{invoice.date}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: theme.muted }]}>الإجمالي:</Text>
                            <Text style={[styles.infoVal, { color: theme.success, fontWeight: 'bold' }]}>{invoice.total} ج.م</Text>
                        </View>
                    </View>
                )}

                {invoice && (
                    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 15 }]}>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>التحويل إلى عميل جديد</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            placeholder="ابحث عن العميل الجديد (بالاسم أو الكود)..."
                            placeholderTextColor={theme.muted}
                            value={pharmaSearch}
                            onChangeText={searchPharmacies}
                            textAlign="right"
                        />
                        
                        {pharmacies.length > 0 && (
                            <View style={styles.pharmaList}>
                                {pharmacies.map((item) => (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        style={[
                                            styles.pharmaItem, 
                                            { borderColor: theme.border },
                                            selectedPharma?.id === item.id && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
                                        ]}
                                        onPress={() => setSelectedPharma(item)}
                                    >
                                        <Text style={[styles.pharmaName, { color: theme.text }]}>{item.name}</Text>
                                        <Text style={[styles.pharmaId, { color: theme.muted }]}>#{item.id}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {selectedPharma && (
                            <TouchableOpacity 
                                style={[styles.transferBtn, { backgroundColor: theme.primary }]}
                                onPress={handleTransfer}
                                disabled={transferring}
                            >
                                {transferring ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Text style={styles.transferBtnText}>تأكيد التحويل إلى {selectedPharma.name}</Text>
                                        <Ionicons name="swap-horizontal" size={20} color="#FFF" />
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>
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
    scrollContent: { padding: 20 },
    card: { borderRadius: 20, padding: 20, borderWidth: 1 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 10, textAlign: 'right' },
    searchRow: { flexDirection: 'row-reverse', gap: 10 },
    input: { height: 55, borderRadius: 15, borderWidth: 1, paddingHorizontal: 15, textAlign: 'right' },
    lookupBtn: { width: 55, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
    infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 },
    infoLabel: { fontSize: 14 },
    infoVal: { fontSize: 14, fontWeight: '600' },
    
    pharmaList: { marginTop: 10, gap: 8 },
    pharmaItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1 },
    pharmaName: { fontSize: 14, fontWeight: '600' },
    pharmaId: { fontSize: 12 },
    
    transferBtn: { height: 60, borderRadius: 15, marginTop: 20, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 10 },
    transferBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});
