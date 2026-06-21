import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useInvoiceDetail, InvoiceType } from '../../hooks/useInvoiceDetail';
import { InvoiceDetailsTemplate } from '../../components/InvoiceDetailsTemplate';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface TransactionDetailsProps {
    type: InvoiceType;
    titlePrefix: string;
    accentColor?: string;
}

export const TransactionDetails = ({ 
    type, 
    titlePrefix,
    accentColor,
    id: propId
}: TransactionDetailsProps & { id?: string }) => {
    const { id: routeId } = useLocalSearchParams<{ id: string }>();
    const id = propId || routeId;
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { details, items, loading } = useInvoiceDetail({ type, id: id || '' });
    const [infoVisible, setInfoVisible] = useState(false);

    const displayColor = accentColor || theme.primary;

    const renderItem = ({ item }: { item: any }) => {
        const isReturned = Number(item.IS_RETURN || item.is_return || 0) !== 0;
        const name = item.name || item.product_name || item.PRODUCT_NAME || item.item_name || item.p_name || 'صنف غير معروف';
        const qty = item.qty || item.quantity || item.QTY || item.items_qty || 0;
        const price = item.price || item.unit_price || item.PRICE || item.price_unit || 0;
        let discount = Number(item.discount || item.discount_value || item.DISCOUNT || 0);
        const total = Number(item.total || item.line_total || item.TOTAL || item.amount || (qty * price));

        // If backend discount is 0 but there is an actual discount in the total, calculate the percentage
        if (discount === 0 && qty > 0 && price > 0 && total > 0) {
            const expectedTotal = qty * price;
            if (expectedTotal > total) {
                discount = ((expectedTotal - total) / expectedTotal) * 100;
            }
        }

        return (
            <View style={[styles.itemCard, { backgroundColor: theme.surface }]}>
                <View style={styles.nameRow}>
                    <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>{name}</Text>
                    {isReturned && (
                        <View style={styles.returnBadge}>
                            <Text style={styles.returnBadgeText}>مرتجع</Text>
                        </View>
                    )}
                </View>
                <View style={styles.itemDivider} />
                <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: theme.muted }]}>الكمية</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>{qty}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: theme.muted }]}>السعر</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>{Number(price).toFixed(2)}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: '#FF5252', opacity: 0.8 }]}>الخصم</Text>
                        <Text style={[styles.statValue, { color: '#FF5252' }]}>{discount.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={[styles.statLabel, { color: '#3F51B5', opacity: 0.8 }]}>الإجمالي</Text>
                        <Text style={[styles.statValue, { color: '#3F51B5', fontWeight: '900' }]}>{Number(total).toFixed(2)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <InvoiceDetailsTemplate
                title={titlePrefix}
                loading={loading}
                details={details}
                items={items}
                renderHeaderInfo={() => null}
                renderItem={renderItem}
                accentColor={displayColor}
                onInfo={() => setInfoVisible(true)}
                footer={undefined}
            />

            <Modal
                visible={infoVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setInfoVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setInfoVisible(false)}
                >
                    <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 15 }]}>
                        <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
                            <View style={styles.sheetHandle} />
                            
                            <View style={styles.sheetHeader}>
                                <Text style={[styles.sheetTitle, { color: displayColor }]}>بيانات العملية</Text>
                                <TouchableOpacity onPress={() => setInfoVisible(false)} style={styles.closeIconBtn}>
                                    <Ionicons name="close-circle" size={28} color={theme.muted} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.infoContent}>
                                <View style={[styles.infoBox, { backgroundColor: displayColor + '05', borderColor: displayColor + '10' }]}>
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoTextGroup}>
                                            <Text style={[styles.infoLabel, { color: theme.muted }]}>اسم الصيدلية</Text>
                                            <Text style={[styles.infoValue, { color: theme.text }]}>{details?.pharmacy_name || details?.customer || details?.supplier || '---'}</Text>
                                        </View>
                                        <Ionicons name="business" size={20} color={displayColor} />
                                    </View>

                                    <View style={styles.sheetDivider} />

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoTextGroup}>
                                            <Text style={[styles.infoLabel, { color: theme.muted }]}>رقم المرجع</Text>
                                            <Text style={[styles.infoValue, { color: theme.text }]}>#{id}</Text>
                                        </View>
                                        <Ionicons name="document-text" size={20} color={displayColor} />
                                    </View>

                                    <View style={styles.sheetDivider} />

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoTextGroup}>
                                            <Text style={[styles.infoLabel, { color: theme.muted }]}>الإجمالي</Text>
                                            <Text style={[styles.infoValue, { color: displayColor, fontWeight: '900' }]}>
                                                {Number(details?.total || details?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                                            </Text>
                                        </View>
                                        <Ionicons name="cash" size={20} color={displayColor} />
                                    </View>

                                        <>
                                            <View style={styles.sheetDivider} />
                                            <View style={styles.infoRow}>
                                                <View style={styles.infoTextGroup}>
                                                    <Text style={[styles.infoLabel, { color: theme.muted }]}>الملحوظات</Text>
                                                    <Text style={[styles.infoValue, { color: theme.text, fontSize: 13 }]} numberOfLines={3}>
                                                        {details?.notes && details.notes !== '' ? details.notes : 'لا يوجد (فارغ)'}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chatbubble-ellipses" size={20} color={displayColor} />
                                            </View>
                                        </>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: displayColor }]} 
                                onPress={() => setInfoVisible(false)}
                            >
                                <Text style={styles.actionBtnText}>إغلاق</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    itemCard: { 
        marginHorizontal: '5%', 
        padding: 15, 
        borderRadius: 24, 
        marginBottom: 12,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        backgroundColor: '#FFF'
    },
    itemName: { fontSize: 16, fontWeight: '800', textAlign: 'right', flex: 1 },
    nameRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 },
    returnBadge: { backgroundColor: '#FF525215', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FF525230' },
    returnBadgeText: { color: '#FF5252', fontSize: 11, fontWeight: '900' },
    itemDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 12 },
    statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    statCol: { alignItems: 'center', flex: 1, gap: 2 },
    statLabel: { fontSize: 9, fontWeight: '800', marginBottom: 2 },
    statValue: { fontSize: 14, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheetContainer: { width: '100%' },
    bottomSheet: { 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        paddingHorizontal: 20, 
        paddingTop: 12,
        paddingBottom: 20,
        backgroundColor: '#FFF',
        elevation: 25
    },
    sheetHandle: { width: 35, height: 4, backgroundColor: '#EEE', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sheetTitle: { fontSize: 18, fontWeight: '900' },
    closeIconBtn: { padding: 2 },
    infoContent: { marginBottom: 15 },
    infoBox: { borderRadius: 20, padding: 12, borderWidth: 1 },
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 2 },
    infoTextGroup: { flex: 1, alignItems: 'flex-end' },
    infoLabel: { fontSize: 9, fontWeight: '800', marginBottom: 1 },
    infoValue: { fontSize: 15, fontWeight: '800' },
    sheetDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.03)', marginVertical: 8 },
    actionBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' }
});

