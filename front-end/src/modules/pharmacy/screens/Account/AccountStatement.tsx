import React, { useState, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, 
  StyleSheet, Dimensions, Alert, Image,
  RefreshControl, Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { Colors } from '../../../../core/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

const FileSystem = Platform.OS !== 'web' ? require('expo-file-system/legacy') : null;
const Print = Platform.OS !== 'web' ? require('expo-print') : null;

import { useAccountStatement } from '../../hooks/useAccountStatement';
import { pdfGenerator } from '../../utils/pdf-generator';
import { DownloadModal } from '../../../../ui/shared/DownloadModal';
import { StatusModal } from '../../../../ui/shared/StatusModal';
import { parseDateTime } from '../../utils/date-utils';
import { StatementSkeleton } from '../../../../ui/core/skeletons/StatementSkeleton';
import { StatementHeaderSkeleton } from '../../../../ui/core/skeletons/StatementHeaderSkeleton';
import { BaseScreen } from '../../components/BaseScreen';

const { width } = Dimensions.get('window');

export const AccountStatement = () => {
    const [selectedPeriod, setSelectedPeriod] = useState(1);
    const [isChangingPeriod, setIsChangingPeriod] = useState(false);
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const lottieRef = useRef<LottieView>(null);

    const [sortAscending, setSortAscending] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [folderPermissionVisible, setFolderPermissionVisible] = useState(false);
    const [tempPdfUri, setTempPdfUri] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const isPdfReady = useRef(false);
    const isAnimationDone = useRef(false);

    const { 
        statement, balance, pharmacyName, loading, 
        refreshing, refresh, isFetching
    } = useAccountStatement(selectedPeriod);

    React.useEffect(() => {
        if (!isFetching) {
            setIsChangingPeriod(false);
        }
    }, [isFetching]);

    const isInitialLoading = (loading && statement.length === 0) || isChangingPeriod;

    const sortedData = React.useMemo(() => {
        // Backend already sorts DESCENDING by date/time. 
        // Reversing is O(N) and much faster than parsing dates and sorting O(N log N).
        if (!statement || statement.length === 0) return [];
        if (sortAscending) {
            return [...statement].reverse();
        }
        return statement;
    }, [statement, sortAscending]);

    const handleDownload = async () => {
        try {
            const branding = await pdfGenerator.getBrandingImages();
            const html = pdfGenerator.generateStatementHtml(
                pharmacyName, balance, sortedData, 
                selectedPeriod === 1 ? 'شهر واحد' : selectedPeriod === 2 ? 'شهرين' : '3 شهور', 
                theme, branding
            );
            if (Platform.OS === 'web' || !Print) {
                Alert.alert("تنبيه", "هذه الميزة متاحة فقط على تطبيق الموبايل حالياً");
                return false;
            }
            const { uri } = await Print.printToFileAsync({ html });
            setTempPdfUri(uri);
            return true;
        } catch (error) {
            console.error(error);
            Alert.alert("خطأ", "فشل إنشاء ملف PDF");
            return false;
        }
    };

    const handleSave = async () => {
        if (!tempPdfUri) return;
        try {
            const success = await pdfGenerator.saveToDevice(tempPdfUri, `كشف_حساب_${pharmacyName.replace(/\s+/g, '_')}`);
            if (success) {
                setShowDownloadModal(false);
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 2000);
            }
        } catch (e) {
            Alert.alert("خطأ", "فشل حفظ الملف");
        }
    };

    const renderHeaderActions = () => (
        statement.length > 0 && !loading && (
            <TouchableOpacity 
                onPress={async () => {
                    isPdfReady.current = false;
                    isAnimationDone.current = false;
                    lottieRef.current?.play();
                    const success = await handleDownload();
                    if (success) {
                        isPdfReady.current = true;
                        if (isAnimationDone.current) setShowDownloadModal(true);
                    }
                }} 
                style={[styles.downloadBtn, { display: 'none' }]}
            >
                <LottieView
                    ref={lottieRef}
                    source={require('@/assets/json/DownloadPDF.json')}
                    autoPlay={false}
                    loop={false}
                    speed={1.5}
                    onAnimationFinish={() => {
                        isAnimationDone.current = true;
                        if (isPdfReady.current) setShowDownloadModal(true);
                    }}
                    style={{ width: 45, height: 45 }}
                />
            </TouchableOpacity>
        )
    );

    return (
        <BaseScreen 
            title="كشف الحساب" 
            scrollable={false}
            headerAction={renderHeaderActions()}
        >
            <FlatList
                data={isInitialLoading ? [1, 2, 3, 4] : sortedData}
                keyExtractor={(item, index) => isInitialLoading ? `sk-${index}` : index.toString()}
                renderItem={({ item }) => {
                    if (isInitialLoading) return <StatementSkeleton />;
                    const isDebit = item.debit > 0;
                    const amount = isDebit ? item.debit : item.credit;
                    const invoiceId = item.ref_id || item.id || item.ID || item.bill_id || item.serial;

                    const handleTransactionPress = () => {
                        if (!invoiceId) return;
                        const source = item.raw_source;
                        
                        // Ignore cash transactions (I = Income/Receipt, P = Pay/Return Cash)
                        if (source === 'I' || source === 'P') {
                            return;
                        }

                        // Use raw_source for precise routing
                        if (source === 'OR' || source === 'R' || source === 'RR') {
                            router.push(`/(pharmacy)/returns/${invoiceId}`);
                        } else if (source === 'H' || source === 'HH') {
                            router.push(`/(pharmacy)/purchases/${invoiceId}`);
                        } else if (source === 'O') {
                            router.push(`/(pharmacy)/sales/${invoiceId}`);
                        } else {
                            // Fallback to old logic if raw_source is missing
                            const type = String(item.type || '').toLowerCase();
                            if (type.includes('مرتجع') || type.includes('return') || type.includes('مردود')) {
                                router.push(`/(pharmacy)/returns/${invoiceId}`);
                            } else if (type.includes('مشتريات') || type.includes('purchase')) {
                                router.push(`/(pharmacy)/purchases/${invoiceId}`);
                            } else if (type.includes('مبيعات') || type.includes('sale') || type.includes('فاتورة')) {
                                router.push(`/(pharmacy)/sales/${invoiceId}`);
                            }
                        }
                    };
                    
                    return (
                        <TouchableOpacity 
                            activeOpacity={0.7}
                            onPress={handleTransactionPress}
                            style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        >
                            <View style={styles.itemHeader}>
                                <View style={styles.dateCol}>
                                    <Text style={[styles.itemDate, { color: theme.text }]}>{item.date}</Text>
                                </View>
                                <View style={[styles.typeBadge, { backgroundColor: isDebit ? '#FF4B5515' : '#00C85115' }]}>
                                    <Text style={[styles.typeText, { color: isDebit ? '#FF4B55' : '#00C851' }]}>{item.type}</Text>
                                </View>
                            </View>
                            <View style={[styles.divider, { backgroundColor: theme.border }]} />
                            <View style={styles.gridRow}>
                                <View style={styles.gridItem}>
                                    <Text style={[styles.gridLabel, { color: theme.muted }]}>الرصيد السابق</Text>
                                    <Text style={[styles.gridValue, { color: theme.text }]}>{item.balance_before?.toLocaleString('en-US')}</Text>
                                </View>
                                <View style={[styles.gridItem, styles.centerBorder, { borderColor: theme.border }]}>
                                    <Text style={[styles.gridLabel, { color: theme.muted }]}>الحركة</Text>
                                    <Text style={[styles.gridValue, { color: isDebit ? '#FF4B55' : '#00C851', fontWeight: '900' }]}>
                                        {isDebit ? '+' : '-'}{amount.toLocaleString('en-US')}
                                    </Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={[styles.gridLabel, { color: theme.muted }]}>الرصيد الحالي</Text>
                                    <Text style={[styles.gridValue, { color: theme.primary, fontWeight: '900' }]}>{item.balance_after?.toLocaleString('en-US')}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListHeaderComponent={() => {
                    if (isInitialLoading) return <StatementHeaderSkeleton />;
                    if (statement.length > 0) {
                        return (
                            <View style={styles.summaryContainer}>
                                <View style={[styles.limitNote, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                                    <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
                                    <Text style={[styles.limitText, { color: theme.primary }]}>أقصى مدى لكشف الحساب في التطبيق هو 3 شهور</Text>
                                </View>
                                <View style={styles.periodContainer}>
                                    <View style={styles.chipsRow}>
                                        {[1, 2, 3].map(p => (
                                            <TouchableOpacity 
                                                key={p}
                                                onPress={() => {
                                                    if (p !== selectedPeriod) {
                                                        setIsChangingPeriod(true);
                                                        setSelectedPeriod(p);
                                                    }
                                                }} 
                                                style={[styles.periodChip, { borderColor: theme.border }, selectedPeriod === p && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                            >
                                                <Text style={[styles.periodText, { color: selectedPeriod === p ? '#FFF' : theme.text, width: 40, textAlign: 'center' }]}>{p === 1 ? 'شهر' : p === 2 ? 'شهرين' : '3 شهور'}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <View style={{ flex: 1 }} />
                                    <TouchableOpacity style={styles.sortBtn} onPress={() => setSortAscending(!sortAscending)}>
                                        <Ionicons name={sortAscending ? "arrow-up" : "arrow-down"} size={22} color={theme.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }
                    return null;
                }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[theme.primary]} />}
                contentContainerStyle={styles.scrollPadding}
                ListEmptyComponent={!isInitialLoading ? (
                    <View style={styles.empty}>
                        <LottieView source={require('@/assets/json/NoTransactionHistory.json')} autoPlay loop={false} style={{ width: 250, height: 250 }} />
                        <Text style={{ color: theme.muted, fontSize: 18, fontWeight: '800' }}>لا يوجد سجل معاملات</Text>
                    </View>
                ) : null}
            />

            <DownloadModal 
                visible={showDownloadModal} 
                onClose={() => setShowDownloadModal(false)}
                onSave={async () => {
                    const authorized = await pdfGenerator.isDirAuthorized();
                    if (!authorized) { setShowDownloadModal(false); setFolderPermissionVisible(true); } 
                    else await handleSave();
                }}
                onShare={() => tempPdfUri && pdfGenerator.share(tempPdfUri)}
                title="تحميل كشف الحساب"
                subtitle={"صيدلية : " + pharmacyName}
            />

            <StatusModal
                visible={showSuccessModal}
                type="success"
                title="تم الحفظ"
                message="تم حفظ ملف كشف الحساب بنجاح"
                onConfirm={() => setShowSuccessModal(false)}
            />

            <StatusModal
                visible={folderPermissionVisible}
                type="info"
                title="إذن الوصول للمجلد"
                message="يرجى الضغط على 'إنشاء مجلد جديد' وتسميته 'Tabarak Pharma' ثم الضغط على 'استخدام هذا المجلد'."
                onConfirm={async () => {
                    setFolderPermissionVisible(false);
                    if (await pdfGenerator.ensureSaveDirAuthorized()) await handleSave();
                }}
                onCancel={() => setFolderPermissionVisible(false)}
            />
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    downloadBtn: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center' },
    summaryContainer: { marginBottom: 15 },
    limitNote: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
    limitText: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
    periodContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20 },
    chipsRow: { flexDirection: 'row-reverse', gap: 10 },
    periodChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    periodText: { fontSize: 13, fontWeight: '700' },
    sortBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    scrollPadding: { paddingHorizontal: '5%', paddingVertical: 20, paddingBottom: 40 },
    itemCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 16 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    typeText: { fontSize: 13, fontWeight: '900' },
    dateCol: { alignItems: 'flex-start' },
    itemDate: { fontSize: 13, fontWeight: '800' },
    divider: { height: 1, marginVertical: 12, opacity: 0.5 },
    gridRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
    gridItem: { flex: 1, alignItems: 'center' },
    centerBorder: { borderLeftWidth: 1, borderRightWidth: 1 },
    gridLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
    gridValue: { fontSize: 13, fontWeight: '800' },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 40 }
});

