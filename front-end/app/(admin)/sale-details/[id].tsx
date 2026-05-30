import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    ActivityIndicator, 
    TouchableOpacity, 
    StatusBar,
    Platform,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/api/api-client';

export default function SaleDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = (Colors as any)[colorScheme];

    const [loading, setLoading] = useState(true);
    const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
    const [invoiceHeader, setInvoiceHeader] = useState<any | null>(null);
    const [reopening, setReopening] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetailsSilently = async () => {
        try {
            const resHeader = await apiFetch(`/api/v1/admin/invoices/${id}`);
            if (resHeader.ok) {
                const headerData = await resHeader.json();
                setInvoiceHeader(headerData);
            }

            const resItems = await apiFetch(`/api/v1/admin/sales/${id}/items`);
            if (resItems.ok) {
                const data = await resItems.json();
                setInvoiceItems(data);
            }
        } catch (error) {
            console.error('Error fetching details silently:', error);
        }
    };

    const fetchDetails = async () => {
        setLoading(true);
        await fetchDetailsSilently();
        setLoading(false);
    };

    const handleReopen = async () => {
        Alert.alert(
            'تأكيد فتح الفاتورة',
            'هل أنت متأكد من إعادة فتح هذه الفاتورة؟ سيتمكن المندوب من تعديلها مجدداً.',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'نعم، فتح',
                    onPress: async () => {
                        setReopening(true);
                        try {
                            const res = await apiFetch(`/api/v1/admin/invoices/${id}/reopen`, {
                                method: 'POST'
                            });
                            if (res.ok) {
                                Alert.alert('نجاح', 'تم فتح الفاتورة بنجاح');
                                fetchDetailsSilently();
                            } else {
                                Alert.alert('خطأ', 'فشل في إعادة فتح الفاتورة');
                            }
                        } catch (error) {
                            console.error('Error reopening:', error);
                        } finally {
                            setReopening(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteItem = async (itemId: number, itemName: string) => {
        Alert.alert(
            'تأكيد حذف صنف',
            `هل أنت متأكد من حذف الصنف "${itemName}" من الفاتورة؟ سيتم إعادة احتساب قيمة الفاتورة تلقائياً.`,
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'نعم، حذف',
                    style: 'destructive',
                    onPress: async () => {
                        const originalItems = [...invoiceItems];
                        // 1. Optimistic UI update: Remove the item instantly from the state
                        setInvoiceItems(prev => prev.filter(item => item.id !== itemId));
                        
                        setDeletingId(itemId);
                        try {
                            const res = await apiFetch(`/api/v1/admin/invoices/${id}/items/${itemId}`, {
                                method: 'DELETE'
                            });
                            if (res.ok) {
                                // 2. Silently fetch the updated state (recalculated total, etc) without full screen loading
                                fetchDetailsSilently();
                            } else {
                                // Restore if backend fails
                                setInvoiceItems(originalItems);
                                Alert.alert('خطأ', 'فشل في حذف الصنف من السيرفر');
                            }
                        } catch (error) {
                            setInvoiceItems(originalItems);
                            console.error('Error deleting item:', error);
                        } finally {
                            setDeletingId(null);
                        }
                    }
                }
            ]
        );
    };

    const totalAmount = invoiceItems.reduce((acc, item) => acc + item.total, 0);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
                <TouchableOpacity style={[styles.backCircle, { backgroundColor: theme.card }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-forward" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>تفاصيل الفاتورة</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.muted }]}>#{id}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.muted }]}>جاري تحميل البيانات...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                        
                        {invoiceHeader && (
                            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 15 }]}>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoVal, { color: theme.text }]}>{invoiceHeader.account_name}</Text>
                                    <Text style={[styles.infoLabel, { color: theme.muted }]}>الصيدلية</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoVal, { color: theme.text }]}>{invoiceHeader.date}</Text>
                                    <Text style={[styles.infoLabel, { color: theme.muted }]}>التاريخ</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.statusTextValue, { color: invoiceHeader.is_closed ? theme.error : theme.success, fontWeight: 'bold' }]}>
                                        {invoiceHeader.is_closed ? 'مغلقة' : 'مفتوحة'}
                                    </Text>
                                    <Text style={[styles.infoLabel, { color: theme.muted }]}>حالة الفاتورة</Text>
                                </View>
                            </View>
                        )}

                        {invoiceHeader && invoiceHeader.is_closed && (
                            <TouchableOpacity 
                                style={[styles.reopenBtn, { backgroundColor: theme.success }]} 
                                onPress={handleReopen}
                                disabled={reopening}
                            >
                                {reopening ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Text style={styles.reopenBtnText}>إعادة فتح الفاتورة</Text>
                                        <Ionicons name="lock-open-outline" size={20} color="#FFF" />
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 15 }]}>قائمة الأصناف</Text>
                        
                        <View style={[styles.itemsTable, { borderColor: theme.border }]}>
                            <View style={[styles.tableHeader, { backgroundColor: theme.card }]}>
                                <Text style={[styles.headerCell, { color: theme.muted, width: 40, textAlign: 'center' }]}></Text>
                                <Text style={[styles.headerCell, { color: theme.muted, flex: 1, textAlign: 'center' }]}>الإجمالي</Text>
                                <Text style={[styles.headerCell, { color: theme.muted, width: 50, textAlign: 'center' }]}>الكمية</Text>
                                <Text style={[styles.headerCell, { color: theme.muted, width: 70, textAlign: 'center' }]}>السعر</Text>
                                <Text style={[styles.headerCell, { color: theme.muted, flex: 2, textAlign: 'right' }]}>الصنف</Text>
                            </View>
                            
                            {invoiceItems.map((item, index) => (
                                <View key={index} style={[styles.tableRow, { borderTopWidth: 1, borderColor: theme.border + '50' }]}>
                                    <View style={{ width: 40, alignItems: 'center' }}>
                                        {deletingId === item.id ? (
                                            <ActivityIndicator size="small" color={theme.error} />
                                        ) : (
                                            <TouchableOpacity onPress={() => handleDeleteItem(item.id, item.name)}>
                                                <Ionicons name="trash-outline" size={18} color={theme.error} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <Text style={[styles.cell, { color: theme.primary, fontWeight: 'bold' }]}>{item.total.toFixed(2)}</Text>
                                    </View>
                                    <View style={{ width: 50, alignItems: 'center' }}>
                                        <Text style={[styles.cell, { color: theme.text }]}>{item.quantity}</Text>
                                    </View>
                                    <View style={{ width: 70, alignItems: 'center' }}>
                                        <Text style={[styles.cell, { color: theme.text }]}>{item.price.toFixed(2)}</Text>
                                    </View>
                                    <View style={{ flex: 2, alignItems: 'flex-end' }}>
                                        <Text style={[styles.cell, { color: theme.text, textAlign: 'right' }]}>{item.name}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Bottom Summary */}
                    <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.footerInner}>
                            <Text style={[styles.footerTotal, { color: theme.primary }]}>{totalAmount.toFixed(2)} ج.م</Text>
                            <Text style={[styles.footerLabel, { color: theme.text }]}>الإجمالي</Text>
                        </View>
                    </View>
                </View>
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
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    headerSubtitle: { fontSize: 13, fontWeight: '600' },
    
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 14, fontWeight: '600' },
    
    content: { flex: 1, padding: 20 },
    infoCard: {
        borderRadius: 25,
        padding: 20,
        borderWidth: 1,
    },
    infoRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 8,
    },
    infoLabel: { fontSize: 14, fontWeight: '600' },
    infoVal: { fontSize: 15, fontWeight: '800' },
    statusTextValue: { fontSize: 15 },
    
    reopenBtn: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        gap: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    reopenBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        textAlign: 'right',
        marginBottom: 15,
        marginRight: 5,
    },
    
    itemsTable: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    tableHeader: {
        flexDirection: 'row-reverse',
        padding: 15,
    },
    headerCell: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row-reverse',
        padding: 15,
        alignItems: 'center',
    },
    cell: {
        fontSize: 13,
        fontWeight: '600',
    },
    
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    footerInner: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLabel: { fontSize: 16, fontWeight: 'bold' },
    footerTotal: { fontSize: 24, fontWeight: '900' },
});
