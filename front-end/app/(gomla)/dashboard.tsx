import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    ActivityIndicator, Alert, ScrollView, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from '@/hooks/useRouter';
import { Colors } from '../../src/core/theme';
import { useTheme } from '@/context/ThemeContext';
import { BarcodeScannerModal } from '../../src/modules/gomla/components/BarcodeScannerModal';
import { fetchGomlaInvoice } from '../../src/modules/gomla/services/gomlaService';
import { emitForceLogout } from '../../src/shared/guards/auth-events';

export default function GomlaDashboard() {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const [invoiceId, setInvoiceId] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
    const [scannerVisible, setScannerVisible] = useState(false);

    const loadUserAndRecent = async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                setCurrentUser(JSON.parse(userJson));
            }
            const recentJson = await AsyncStorage.getItem('@recent_gomla_invoices');
            if (recentJson) {
                const parsed = JSON.parse(recentJson);
                if (Array.isArray(parsed)) {
                    const now = Date.now();
                    const filtered = parsed.filter(item => {
                        return !item.timestamp || (now - item.timestamp) < 8 * 3600 * 1000;
                    });
                    setRecentInvoices(filtered);
                    if (filtered.length !== parsed.length) {
                        await AsyncStorage.setItem('@recent_gomla_invoices', JSON.stringify(filtered));
                    }
                } else {
                    setRecentInvoices([]);
                }
            }
        } catch (error) {
            console.error("Failed to load user or recent invoices", error);
        }
    };

    useEffect(() => {
        loadUserAndRecent();
    }, []);

    // Re-check recent invoices when screen mounts or changes
    // Since Expo Router keeps screens in stack, we will reload when dashboard is re-focused
    useEffect(() => {
        const interval = setInterval(() => {
            loadUserAndRecent();
        }, 3000); // Poll recent invoices list every 3s to reflect any external changes seamlessly
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        Alert.alert(
            "تسجيل الخروج",
            "هل أنت متأكد من رغبتك في تسجيل الخروج؟",
            [
                { text: "إلغاء", style: "cancel" },
                { 
                    text: "تسجيل الخروج", 
                    style: "destructive",
                    onPress: async () => {
                        emitForceLogout();
                    }
                }
            ]
        );
    };

    const handleSearch = async (idToSearch?: string) => {
        const id = idToSearch || invoiceId;
        if (!id.trim()) {
            Alert.alert("تنبيه", "برجاء إدخال رقم الفاتورة أولاً");
            return;
        }

        setLoading(true);
        try {
            const data = await fetchGomlaInvoice(id);
            console.log("[Gomla Dashboard] Fetched Invoice Data Successfully:", data);

            if (data) {
                // Add to recent invoices list
                setRecentInvoices(prev => {
                    const filtered = prev.filter(item => item.id !== data.id);
                    const newRecent = [
                        { 
                            id: data.id, 
                            clientName: data.pharmacy_name || 'عميل غير معروف', 
                            total: data.total,
                            date: data.date,
                            timestamp: Date.now()
                        },
                        ...filtered
                    ];
                    
                    const now = Date.now();
                    const filteredRecent = newRecent.filter(item => {
                        return !item.timestamp || (now - item.timestamp) < 8 * 3600 * 1000;
                    }).slice(0, 5); // Keep last 5
                    
                    AsyncStorage.setItem('@recent_gomla_invoices', JSON.stringify(filteredRecent))
                        .catch(err => console.error("Failed to save recent invoices", err));
                    
                    return filteredRecent;
                });

                // Navigate directly to the dedicated invoice details screen!
                router.push({ pathname: '/(gomla)/invoice', params: { id: data.id.toString() } });
            }
        } catch (error) {
            console.error("[Gomla Dashboard] Fetch Error:", error);
            Alert.alert("خطأ في التحميل", "تعذر العثور على الفاتورة. يرجى التأكد من الرقم والمحاولة مجدداً.");
        } finally {
            setLoading(false);
        }
    };

    const handleScan = (barcode: string) => {
        setScannerVisible(false);
        setInvoiceId(barcode);
        handleSearch(barcode);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loaderText, { color: theme.muted }]}>جارٍ جلب الفاتورة من قاعدة البيانات...</Text>
                </View>
            ) : (
                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Gomla Dashboard Header (Transparent Pharmacist Style) */}
                    <View style={[styles.header, { marginTop: 15, marginBottom: 20 }]}>
                        <View style={styles.locationContainer}>
                            <Text style={[styles.deliverToText, { color: theme.muted }]}>
                                قسم الجملة والتوزيع
                            </Text>
                            <View style={styles.locationRow}>
                                <Text style={[styles.locationText, { color: theme.text }]}>
                                    أهلاً بك، {currentUser?.name || 'مسؤول الجرد'} 👋
                                </Text>
                            </View>
                        </View>

                        <View style={styles.headerRight}>
                            <TouchableOpacity 
                                style={[styles.logoutBtnCircle, { backgroundColor: 'rgba(244, 67, 54, 0.12)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }]}
                                onPress={handleLogout}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="log-out-outline" size={20} color="#F44336" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Glowing Search Section (Identical with correct padding) */}
                    <View style={[styles.searchSection, { marginBottom: 24 }]}>
                        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: isDark ? '#000' : '#1A237E' }]}>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="ابحث برقم الفاتورة..."
                                placeholderTextColor={theme.placeholder}
                                value={invoiceId}
                                onChangeText={setInvoiceId}
                                keyboardType="number-pad"
                                onSubmitEditing={() => handleSearch()}
                            />
                            <TouchableOpacity 
                                style={[styles.searchIconBtn, { backgroundColor: theme.accent }]}
                                onPress={() => {
                                    setScannerVisible(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="barcode-outline" size={22} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.searchBtn, { backgroundColor: theme.primary }]}
                                onPress={() => handleSearch()}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="search" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Wholesale Stats Card (Premium BalanceCard Style) */}
                    <TouchableOpacity 
                        style={styles.balanceCard} 
                        activeOpacity={0.9}
                        onPress={() => {
                            Alert.alert("معلومات الجرد", "توضح هذه البطاقة إحصائيات ونشاط عملية جرد فواتير الجملة اليوم.");
                        }}
                    >
                        <Image source={require('@/assets/images/balance_bg.png')} style={styles.balanceBg} resizeMode="cover" />
                        <View style={styles.balanceOverlay} />
                        <View style={styles.balanceContent}>
                            <View style={styles.balanceHeader}>
                                <Text style={styles.balanceLabel}>إحصائيات الجرد والنشاط</Text>
                                <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
                            </View>
                            <View style={styles.balanceMain}>
                                <Text style={styles.balanceAmount}>{recentInvoices.length}</Text>
                                <Text style={styles.currency}>فواتير اليوم</Text>
                            </View>
                            <View style={styles.balanceFooter}>
                                <View style={styles.consumptionContainer}>
                                    <View style={{ backgroundColor: '#4CAF50', width: 6, height: 6, borderRadius: 3, marginLeft: 4 }} />
                                    <Text style={styles.consumptionValue}>النظام متصل بالخادم</Text>
                                </View>
                                <Text style={styles.lastUpdate}>مستوى الدقة: 100%</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Recent Invoices Section (SmallOrderCard Style) */}
                    <View style={{ marginTop: 10, paddingHorizontal: '5%', marginBottom: 12 }}>
                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', textAlign: 'right' }}>آخر الفواتير المجرودة</Text>
                    </View>

                    {recentInvoices.length > 0 ? (
                        recentInvoices.map((item) => {
                            const steps = ['كتابة', 'تدقيق', 'حفظ'];
                            return (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={[styles.orderCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                    onPress={() => handleSearch(item.id.toString())}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.orderHeaderRow}>
                                        <Text style={[styles.orderSupplierName, { color: theme.primary }]} numberOfLines={1}>
                                            {item.clientName}
                                        </Text>
                                        <View style={[styles.orderIdBadge, { backgroundColor: theme.primary + '10' }]}>
                                            <Text style={[styles.orderIdText, { color: theme.primary }]}>#{item.id}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.orderProgressContainer}>
                                        <View style={styles.orderStepsRow}>
                                            {steps.map((step, idx) => {
                                                const stepNum = idx + 1;
                                                const isCompleted = stepNum < 3; // Created and audited are completed
                                                const isActive = stepNum === 3; // currently at save
                                                
                                                return (
                                                    <React.Fragment key={idx}>
                                                        <View style={styles.orderStepItem}>
                                                            <View style={[
                                                                styles.orderDot, 
                                                                { borderColor: theme.border },
                                                                isCompleted && { backgroundColor: theme.primary, borderColor: theme.primary },
                                                                isActive && { backgroundColor: theme.accent, borderColor: theme.accent }
                                                            ]}>
                                                                {isCompleted ? (
                                                                    <Ionicons name="checkmark" size={10} color="#FFF" />
                                                                ) : (
                                                                    <Text style={[styles.orderDotText, isActive && { color: '#FFF' }]}>{stepNum}</Text>
                                                                )}
                                                            </View>
                                                            <Text style={[
                                                                styles.orderStepLabel, 
                                                                { color: theme.muted },
                                                                (isActive || isCompleted) && { color: theme.primary, fontWeight: '800' }
                                                            ]}>{step}</Text>
                                                        </View>
                                                        {idx < steps.length - 1 && (
                                                            <View style={styles.orderConnector}>
                                                                {[1, 2, 3, 4, 5, 6].map((seg, sIdx) => (
                                                                    <View 
                                                                        key={sIdx}
                                                                        style={[
                                                                            styles.orderConnectorSegment,
                                                                            { 
                                                                                backgroundColor: (stepNum < 2) ? theme.primary : theme.border,
                                                                                marginRight: sIdx === 5 ? 0 : 3
                                                                            }
                                                                        ]}
                                                                    />
                                                                ))}
                                                            </View>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    <View style={[styles.orderFinancialFooter, { borderTopColor: theme.border }]}>
                                        <View style={styles.orderFooterItem}>
                                            <Ionicons name="calendar-outline" size={14} color={theme.muted} style={{ marginLeft: 4 }} />
                                            <Text style={[styles.orderFooterValue, { color: theme.text }]}>{item.date}</Text>
                                        </View>
                                        <View style={styles.orderFooterItem}>
                                            <Ionicons name="cash-outline" size={14} color={theme.accent} style={{ marginLeft: 4 }} />
                                            <Text style={[styles.orderPriceText, { color: theme.accent }]}>{item.total} ج.م</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <View style={[styles.recentInvoicesPlaceholder, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: '5%' }]}>
                            <Ionicons name="file-tray-outline" size={32} color={theme.muted} style={{ marginBottom: 8 }} />
                            <Text style={[styles.recentInvoicesPlaceholderText, { color: theme.muted }]}>لا توجد فواتير تم جردها مؤخراً</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Scanner Modal */}
            <BarcodeScannerModal 
                visible={scannerVisible} 
                onClose={() => setScannerVisible(false)} 
                onScan={handleScan} 
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loaderText: {
        marginTop: 15,
        fontSize: 15,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: '5%',
    },
    locationContainer: {
        alignItems: 'flex-end',
    },
    deliverToText: {
        fontSize: 12,
        fontWeight: '600',
    },
    locationRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginTop: 4,
    },
    locationText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    logoutBtnCircle: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchSection: {
        paddingHorizontal: 20,
        zIndex: 10,
    },
    searchBox: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 8,
        height: 58,
        elevation: 6,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        height: '100%',
        fontSize: 16,
        textAlign: 'right',
    },
    searchIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    searchBtn: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    balanceCard: {
        marginHorizontal: '5%',
        borderRadius: 24,
        height: 145,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 8,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    balanceBg: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    balanceOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(26, 35, 126, 0.45)',
    },
    balanceContent: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    balanceHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontWeight: 'bold',
    },
    balanceMain: {
        flexDirection: 'row-reverse',
        alignItems: 'baseline',
    },
    balanceAmount: {
        color: '#FFFFFF',
        fontSize: 34,
        fontWeight: '900',
        lineHeight: 40,
    },
    currency: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginRight: 6,
    },
    balanceFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    consumptionContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    consumptionValue: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    lastUpdate: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        fontWeight: 'bold',
    },
    orderCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 12,
        marginBottom: 12,
        marginHorizontal: '5%',
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    orderHeaderRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderSupplierName: {
        fontSize: 15,
        fontWeight: '900',
        textAlign: 'right',
        flex: 1,
    },
    orderIdBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    orderIdText: {
        fontSize: 12,
        fontWeight: '800',
    },
    orderProgressContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginVertical: 4,
        paddingHorizontal: 4,
    },
    orderStepsRow: {
        flex: 1,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderStepItem: {
        alignItems: 'center',
        gap: 4,
    },
    orderDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    orderDotText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#999',
    },
    orderStepLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
    orderConnector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: -16,
        marginHorizontal: -2,
    },
    orderConnectorSegment: {
        width: 4,
        height: 2,
        borderRadius: 1,
    },
    orderFinancialFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
    },
    orderFooterItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    orderFooterValue: {
        fontSize: 11,
        fontWeight: '800',
    },
    orderPriceText: {
        fontSize: 14,
        fontWeight: '900',
    },
    recentInvoicesPlaceholder: {
        width: '90%',
        paddingVertical: 30,
        borderRadius: 18,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    recentInvoicesPlaceholderText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
