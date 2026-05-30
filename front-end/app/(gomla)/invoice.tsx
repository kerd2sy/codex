import React, { useState, useRef, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    FlatList, ActivityIndicator, Alert, Modal, ScrollView,
    Image, PanResponder, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../src/core/theme';
import { useTheme } from '@/context/ThemeContext';
import { BarcodeScannerModal } from '../../src/modules/gomla/components/BarcodeScannerModal';
import { performOcr } from '../../src/modules/gomla/utils/ocrParser';
import { 
    fetchGomlaInvoice, 
    updateGomlaInvoiceItem, 
    GomlaInvoiceDetails, 
    GomlaInvoiceItem 
} from '../../src/modules/gomla/services/gomlaService';

const parseShorthandDate = (input: string): string => {
    const clean = input.trim();
    if (!/^\d{3,4}$/.test(clean)) {
        return input; // Not a shorthand, return as-is
    }

    let month = '';
    let year = '';

    if (clean.length === 3) {
        month = clean[0];
        year = clean.slice(1);
    } else {
        month = clean.slice(0, 2);
        year = clean.slice(2);
    }

    const monthNum = parseInt(month, 10);
    if (monthNum < 1 || monthNum > 12) {
        return input; // Invalid month, return original
    }

    const monthStr = month.padStart(2, '0');
    const yearStr = '20' + year;
    const dayStr = monthStr; // Day equals Month!

    return `${yearStr}-${monthStr}-${dayStr}`;
};

export default function GomlaInvoiceDetailsScreen() {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<GomlaInvoiceDetails | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'audited'>('pending');

    const [scannerVisible, setScannerVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<GomlaInvoiceItem | null>(null);
    const [batchInput, setBatchInput] = useState('');
    const [expiryInput, setExpiryInput] = useState('');
    const [qtyInput, setQtyInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [infoModalVisible, setInfoModalVisible] = useState(false);

    // Highlight Crop Flow State
    const [cropModalVisible, setCropModalVisible] = useState(false);
    const [cropImageUri, setCropImageUri] = useState<string | null>(null);
    const [cropStep, setCropStep] = useState<'batch' | 'expiry'>('batch');
    const [rawImageWidth, setRawImageWidth] = useState(0);
    const [rawImageHeight, setRawImageHeight] = useState(0);
    const [cropLoading, setCropLoading] = useState(false);

    // Crop box coordinates relative to screen layout
    const [boxX, setBoxX] = useState(80);
    const [boxY, setBoxY] = useState(120);
    const [boxW, setBoxW] = useState(160);
    const [boxH, setBoxH] = useState(60);
    const [containerW, setContainerW] = useState(0);
    const [containerH, setContainerH] = useState(0);

    const startX = useRef(80);
    const startY = useRef(120);
    const startW = useRef(160);
    const startH = useRef(60);

    // Draggable Box PanResponder
    const boxPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                startX.current = boxX;
                startY.current = boxY;
            },
            onPanResponderMove: (evt, gestureState) => {
                let nextX = startX.current + gestureState.dx;
                let nextY = startY.current + gestureState.dy;

                if (nextX < 0) nextX = 0;
                if (containerW && nextX + boxW > containerW) nextX = containerW - boxW;

                if (nextY < 0) nextY = 0;
                if (containerH && nextY + boxH > containerH) nextY = containerH - boxH;

                setBoxX(nextX);
                setBoxY(nextY);
            }
        })
    ).current;

    // Resizable Corner handle PanResponder
    const resizePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                startW.current = boxW;
                startH.current = boxH;
            },
            onPanResponderMove: (evt, gestureState) => {
                let nextW = startW.current + gestureState.dx;
                let nextH = startH.current + gestureState.dy;

                if (nextW < 50) nextW = 50;
                if (containerW && boxX + nextW > containerW) nextW = containerW - boxX;

                if (nextH < 30) nextH = 30;
                if (containerH && boxY + nextH > containerH) nextH = containerH - boxY;

                setBoxW(nextW);
                setBoxH(nextH);
            }
        })
    ).current;

    const loadInvoiceDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await fetchGomlaInvoice(id);
            setInvoice(data);
        } catch (error) {
            console.error("[Invoice Details] Fetch Error:", error);
            Alert.alert("خطأ في التحميل", "تعذر جلب تفاصيل الفاتورة.");
            router.back();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoiceDetails();
    }, [id]);

    const handleScan = (barcode: string) => {
        setScannerVisible(false);
        if (!invoice) return;

        // Find item by barcode or prod_id
        const item = invoice.items.find(i => i.barcode === barcode || i.prod_id === barcode);

        if (item) {
            openEditModal(item);
        } else {
            Alert.alert("غير موجود", `لم يتم العثور على صنف بالباركود: ${barcode} في هذه الفاتورة.`);
        }
    };

    const openEditModal = (item: GomlaInvoiceItem) => {
        setSelectedItem(item);
        setBatchInput('');
        setExpiryInput('');
        setQtyInput(item.qty.toString());
        setEditModalVisible(true);
    };

    const launchHighlightFlow = (imageUri: string) => {
        Image.getSize(imageUri, (width, height) => {
            setRawImageWidth(width);
            setRawImageHeight(height);
            setCropImageUri(imageUri);
            setCropStep('batch');
            setBoxX(80);
            setBoxY(120);
            setBoxW(160);
            setBoxH(60);
            setCropModalVisible(true);
        }, (err) => {
            console.error("[OCR Highlight] Failed to get image size", err);
            Alert.alert("خطأ", "تعذر تحميل قياسات الصورة للقص.");
        });
    };

    const executeHighlightCrop = async () => {
        if (!cropImageUri || !rawImageWidth || !rawImageHeight || !containerW || !containerH) return;

        setCropLoading(true);
        try {
            const scaleX = rawImageWidth / containerW;
            const scaleY = rawImageHeight / containerH;

            const originX = Math.max(0, Math.round(boxX * scaleX));
            const originY = Math.max(0, Math.round(boxY * scaleY));
            const width = Math.min(rawImageWidth - originX, Math.round(boxW * scaleX));
            const height = Math.min(rawImageHeight - originY, Math.round(boxH * scaleY));

            const manipResult = await ImageManipulator.manipulateAsync(
                cropImageUri,
                [{ crop: { originX, originY, width, height } }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );

            const ocrResult = await performOcr(manipResult.uri, cropStep);
            
            if (cropStep === 'batch') {
                if (ocrResult.batch) {
                    setBatchInput(ocrResult.batch);
                    Alert.alert("تم القراءة", `تم العثور على التشغيلة: ${ocrResult.batch}\nالآن يرجى تحديد تاريخ الصلاحية والضغط على تأكيد.`);
                    setCropStep('expiry');
                    setBoxX(80);
                    setBoxY(120);
                    setBoxW(160);
                    setBoxH(60);
                } else {
                    Alert.alert("تنبيه", "تعذر قراءة التشغيلة من المنطقة المحددة، يرجى إعادة المحاولة وضبط المربع بدقة.");
                }
            } else {
                if (ocrResult.expiry) {
                    setExpiryInput(ocrResult.expiry);
                    Alert.alert("تم القراءة", `تم العثور على التاريخ: ${ocrResult.expiry}`);
                    setCropModalVisible(false);
                } else {
                    Alert.alert("تنبيه", "تعذر قراءة التاريخ من المنطقة المحددة، يرجى المحاولة وضبط المربع بدقة.");
                }
            }
        } catch (error: any) {
            Alert.alert("خطأ في المعالجة", "حدث خطأ أثناء معالجة الصورة: " + error.message);
        } finally {
            setCropLoading(false);
        }
    };

    const handleCameraOcr = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("صلاحية الكاميرا", "نحتاج لصلاحية الكاميرا لتصوير علبة الدواء وقراءة التشغيلة والصلاحية تلقائياً.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const imageUri = result.assets[0].uri;
            setOcrLoading(true);

            const ocrResult = await performOcr(imageUri);
            
            if (ocrResult.batch) {
                setBatchInput(ocrResult.batch);
            }
            if (ocrResult.expiry) {
                setExpiryInput(ocrResult.expiry);
            }

            if (ocrResult.batch && ocrResult.expiry) {
                Alert.alert("نجاح الجلب تلقائياً", "تم ملء البيانات من الكاميرا تلقائياً، يرجى مراجعتها وتأكيدها بالضغط على حفظ.");
            } else {
                Alert.alert(
                    "تحديد يدوي", 
                    "لم يتمكن الذكاء الاصطناعي من قراءة البيانات بالكامل تلقائياً. هل تود تحديد منطقة التشغيلة والتاريخ يدوياً على الصورة؟",
                    [
                        { text: "كتابة يدوية", style: "cancel" },
                        { text: "تحديد على الصورة", onPress: () => launchHighlightFlow(imageUri) }
                    ]
                );
            }
        } catch (error: any) {
            Alert.alert("خطأ", "حدث خطأ أثناء معالجة الصورة: " + error.message);
        } finally {
            setOcrLoading(false);
        }
    };

    const handleSaveItem = async () => {
        if (!selectedItem) return;

        const finalBatch = batchInput.trim() || selectedItem.batch || '';
        const rawExpiry = expiryInput.trim() || selectedItem.expire_date || '';
        const rawQty = qtyInput.trim();

        if (!finalBatch || !rawExpiry || !rawQty) {
            Alert.alert("تنبيه", "يجب إدخال الكمية والتشغيلة وتاريخ الصلاحية");
            return;
        }

        const parsedQty = parseFloat(rawQty);
        if (isNaN(parsedQty) || parsedQty <= 0) {
            Alert.alert("تنبيه", "يجب إدخال كمية صحيحة أكبر من الصفر");
            return;
        }

        if (parsedQty > selectedItem.qty) {
            Alert.alert("تنبيه", `الكمية المدخلة (${parsedQty}) أكبر من الكمية المتاحة حالياً للصنف وهي (${selectedItem.qty})`);
            return;
        }

        const formattedExpiry = parseShorthandDate(rawExpiry);

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(formattedExpiry)) {
            Alert.alert("صيغة غير صحيحة", "تاريخ الصلاحية يجب أن يكون بصيغة YYYY-MM-DD أو اختصار مثل 429");
            return;
        }

        setSaving(true);
        try {
            await updateGomlaInvoiceItem(selectedItem.id, finalBatch, formattedExpiry, parsedQty);
            Alert.alert("نجاح", "تم تحديث بيانات الصنف بنجاح في الفاتورة");
            setEditModalVisible(false);
            
            // Re-render recent invoices lists inside dashboard.tsx indirectly by saving timestamp
            if (invoice) {
                const recentJson = await AsyncStorage.getItem('@recent_gomla_invoices');
                if (recentJson) {
                    const parsed = JSON.parse(recentJson);
                    if (Array.isArray(parsed)) {
                        const updated = parsed.map(item => {
                            if (item.id === invoice.id) {
                                return { ...item, timestamp: Date.now() };
                            }
                            return item;
                        });
                        await AsyncStorage.setItem('@recent_gomla_invoices', JSON.stringify(updated));
                    }
                }
            }

            loadInvoiceDetails();
        } catch (error) {
            Alert.alert("خطأ", "تعذر تحديث الصنف");
        } finally {
            setSaving(false);
        }
    };

    const renderItem = ({ item }: { item: GomlaInvoiceItem }) => (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: theme.accent + '15' }]}>
                    <Text style={[styles.badgeText, { color: theme.accent }]}>كود: {item.prod_id}</Text>
                </View>
            </View>
            
            <View style={styles.cardDetailsRow}>
                <View style={styles.detailBadge}>
                    <Ionicons name="cube-outline" size={14} color={theme.muted} />
                    <Text style={[styles.detailText, { color: theme.muted }]}>الكمية: </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{item.qty}</Text>
                </View>
                <View style={styles.detailBadge}>
                    <Ionicons name="pricetag-outline" size={14} color={theme.muted} />
                    <Text style={[styles.detailText, { color: theme.muted }]}>السعر: </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{item.price} ج.م</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardValuesRow}>
                <View style={[styles.valueBox, { 
                    backgroundColor: item.batch ? (isDark ? '#2E1E12' : '#FFF3E0') : (isDark ? '#1C1C1C' : '#F5F5F5'), 
                    borderColor: item.batch ? '#FFB74D' : '#E0E0E0',
                    borderStyle: item.batch ? 'solid' : 'dashed'
                }]}>
                    <Text style={[styles.valueBoxLabel, { color: item.batch ? '#E65100' : '#757575' }]}>رقم التشغيلة (Batch)</Text>
                    <Text style={[styles.valueBoxValue, { color: item.batch ? (isDark ? '#FFCC80' : '#E65100') : '#9E9E9E', fontSize: 14 }]}>
                        {item.batch || 'معلق'}
                    </Text>
                </View>
                <View style={[styles.valueBox, { 
                    backgroundColor: item.expire_date ? (isDark ? '#1C2E24' : '#E8F5E9') : (isDark ? '#1C1C1C' : '#F5F5F5'), 
                    borderColor: item.expire_date ? '#81C784' : '#E0E0E0',
                    borderStyle: item.expire_date ? 'solid' : 'dashed'
                }]}>
                    <Text style={[styles.valueBoxLabel, { color: item.expire_date ? '#2E7D32' : '#757575' }]}>تاريخ الصلاحية (Expiry)</Text>
                    <Text style={[styles.valueBoxValue, { color: item.expire_date ? (isDark ? '#A5D6A7' : '#2E7D32') : '#9E9E9E', fontSize: 14 }]}>
                        {item.expire_date || 'معلق'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loaderText, { color: theme.muted }]}>جارٍ جلب تفاصيل الفاتورة...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!invoice) return null;

    const pendingItems = invoice.items.filter(item => !item.batch);
    const auditedItems = invoice.items.filter(item => !!item.batch);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={{ flex: 1 }}>
                {/* Premium Pharmacist-Style Custom Header for Items View */}
                <View style={[
                    styles.itemsHeader, 
                    { 
                        backgroundColor: theme.surface,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border + '20'
                    }
                ]}>
                    <View style={styles.headerRightSide}>
                        <TouchableOpacity 
                            style={styles.backBtn}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={[styles.itemsHeaderTitle, { color: theme.primary }]}>أصناف الفاتورة #{invoice.id}</Text>
                            <View style={[styles.titleLine, { backgroundColor: '#FF7E47' }]} />
                        </View>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.infoBtn}
                        onPress={() => setInfoModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="information-circle-outline" size={26} color={theme.primary} />
                    </TouchableOpacity>
                </View>

                {/* Premium Tab Switcher */}
                <View style={[styles.tabContainer, { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border + '15' }]}>
                    <TouchableOpacity 
                        style={[
                            styles.tabButton, 
                            activeTab === 'pending' && [styles.activeTabButton, { borderBottomColor: '#FF7E47' }]
                        ]}
                        onPress={() => setActiveTab('pending')}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tabText, 
                            { color: activeTab === 'pending' ? theme.primary : theme.muted },
                            activeTab === 'pending' && { fontWeight: 'bold' }
                        ]}>
                            أصناف لم تجرد ({pendingItems.length})
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[
                            styles.tabButton, 
                            activeTab === 'audited' && [styles.activeTabButton, { borderBottomColor: '#4CAF50' }]
                        ]}
                        onPress={() => setActiveTab('audited')}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tabText, 
                            { color: activeTab === 'audited' ? theme.primary : theme.muted },
                            activeTab === 'audited' && { fontWeight: 'bold' }
                        ]}>
                            أصناف تم جردها ({auditedItems.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={activeTab === 'pending' ? pendingItems : auditedItems}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyListContainer}>
                            <Ionicons 
                                name={activeTab === 'pending' ? "checkmark-circle" : "file-tray"} 
                                size={54} 
                                color={activeTab === 'pending' ? '#4CAF50' : theme.muted} 
                                style={{ marginBottom: 12 }} 
                            />
                            <Text style={[styles.emptyListTitle, { color: theme.text }]}>
                                {activeTab === 'pending' ? "تم الانتهاء!" : "لا يوجد جرد"}
                            </Text>
                            <Text style={[styles.emptyListSubtitle, { color: theme.muted }]}>
                                {activeTab === 'pending' 
                                    ? "تهانينا! تم جرد جميع أصناف هذه الفاتورة بنجاح." 
                                    : "لم يتم جرد أي أصناف في هذه الفاتورة حتى الآن."
                                }
                            </Text>
                        </View>
                    )}
                />

                {/* Floating Item Scanner */}
                <TouchableOpacity 
                    style={[styles.scanFab, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
                    onPress={() => {
                        setScannerVisible(true);
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="barcode-outline" size={26} color="#FFF" />
                    <Text style={styles.fabText}>مسح صنف سريع</Text>
                </TouchableOpacity>
            </View>

            {/* Scanner Modal */}
            <BarcodeScannerModal 
                visible={scannerVisible} 
                onClose={() => setScannerVisible(false)} 
                onScan={handleScan} 
            />

            {/* Edit Item Modal */}
            <Modal visible={editModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.bottomSheetHandle} />
                        
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text, flex: 1, textAlign: 'right', fontSize: 18 }]} numberOfLines={2}>
                                {selectedItem ? selectedItem.name : ''}
                            </Text>
                        </View>

                        <TouchableOpacity 
                            style={[styles.ocrBtn, { borderColor: theme.accent, backgroundColor: theme.accent + '08' }]}
                            onPress={handleCameraOcr}
                            disabled={saving || ocrLoading}
                            activeOpacity={0.7}
                        >
                            {ocrLoading ? (
                                <ActivityIndicator size="small" color={theme.accent} />
                            ) : (
                                <>
                                    <Ionicons name="camera-outline" size={22} color={theme.accent} style={{ marginLeft: 8 }} />
                                    <Text style={[styles.ocrBtnText, { color: theme.accent }]}>تصوير العلبة وقراءة البيانات بالذكاء الاصطناعي</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={[styles.ocrHelpText, { color: theme.muted }]}>
                            💡 نصيحة: يمكنك تصوير الجزء الذي يحتوي على رقم التشغيلة (Batch) وتاريخ الصلاحية (Expiry) على علبة الدواء وسيقوم نظامنا بقراءتها آلياً لتوفير الوقت!
                        </Text>
                        
                        <Text style={[styles.label, { color: theme.text }]}>الكمية المراد جردها بهذه التشغيلة:</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                            value={qtyInput}
                            onChangeText={setQtyInput}
                            placeholder={selectedItem ? selectedItem.qty.toString() : ""}
                            placeholderTextColor={theme.placeholder}
                            keyboardType="numeric"
                        />

                        <Text style={[styles.label, { color: theme.text }]}>اكتب تشغيلة الصنف:</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                            value={batchInput}
                            onChangeText={setBatchInput}
                            placeholder={selectedItem ? (selectedItem.batch || "مثال: ASDFGH") : "مثال: ASDFGH"}
                            placeholderTextColor={theme.placeholder}
                            autoCapitalize="characters"
                        />

                        <Text style={[styles.label, { color: theme.text }]}>اكتب تاريخ الصنف:</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                            value={expiryInput}
                            onChangeText={setExpiryInput}
                            placeholder={selectedItem ? (selectedItem.expire_date || "مثال: 529") : "مثال: 529"}
                            placeholderTextColor={theme.placeholder}
                            keyboardType="numeric"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: theme.border }]}
                                onPress={() => setEditModalVisible(false)}
                                disabled={saving || ocrLoading}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: theme.text, fontWeight: '600' }}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                                onPress={handleSaveItem}
                                disabled={saving || ocrLoading}
                                activeOpacity={0.8}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>حفظ</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Info Modal */}
            <Modal visible={infoModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>تفاصيل الفاتورة والعميل</Text>
                            <TouchableOpacity onPress={() => setInfoModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.infoModalBody}>
                            <View style={[styles.infoRow, { borderColor: theme.border }]}>
                                <Text style={[styles.infoLabel, { color: theme.muted }]}>رقم الفاتورة:</Text>
                                <Text style={[styles.infoValue, { color: theme.text }]}>{invoice.id}</Text>
                            </View>
                            
                            <View style={[styles.infoRow, { borderColor: theme.border }]}>
                                <Text style={[styles.infoLabel, { color: theme.muted }]}>كود العميل:</Text>
                                <Text style={[styles.infoValue, { color: theme.primary, fontWeight: 'bold' }]}>{invoice.pharmacy_code || 'غير مسجل'}</Text>
                            </View>

                            <View style={[styles.infoRow, { borderColor: theme.border }]}>
                                <Text style={[styles.infoLabel, { color: theme.muted }]}>اسم العميل:</Text>
                                <Text style={[styles.infoValue, { color: theme.text }]}>{invoice.pharmacy_name || 'غير معروف'}</Text>
                            </View>

                            <View style={[styles.infoRow, { borderColor: theme.border }]}>
                                <Text style={[styles.infoLabel, { color: theme.muted }]}>إجمالي الفاتورة:</Text>
                                <Text style={[styles.infoValue, { color: theme.accent, fontWeight: 'bold' }]}>{invoice.total} ج.م</Text>
                            </View>

                            {invoice.writer && (
                                <View style={[styles.infoRow, { borderColor: theme.border }]}>
                                    <Text style={[styles.infoLabel, { color: theme.muted }]}>محرر الفاتورة:</Text>
                                    <Text style={[styles.infoValue, { color: theme.text }]}>{invoice.writer}</Text>
                                </View>
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', marginTop: 20 }}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                                onPress={() => setInfoModalVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>موافق</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Highlight Crop Modal */}
            <Modal visible={cropModalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                    <View style={{ 
                        flexDirection: 'row-reverse', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: 16, 
                        borderBottomWidth: 1, 
                        borderBottomColor: '#222' 
                    }}>
                        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>
                            {cropStep === 'batch' ? 'تحديد رقم التشغيلة' : 'تحديد تاريخ الصلاحية'}
                        </Text>
                        <TouchableOpacity 
                            onPress={() => setCropModalVisible(false)}
                            style={{ padding: 4 }}
                        >
                            <Ionicons name="close" size={26} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ backgroundColor: theme.primary, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15, textAlign: 'center' }}>
                            {cropStep === 'batch' 
                                ? '👉 اسحب المربع المضيء وضعه فوق (رقم التشغيلة) فقط ثم اضغط تأكيد'
                                : '👉 اسحب المربع المضيء وضعه فوق (تاريخ الصلاحية) فقط ثم اضغط تأكيد'
                            }
                        </Text>
                    </View>

                    <View 
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}
                        onLayout={(event) => {
                            const { width, height } = event.nativeEvent.layout;
                            setContainerW(width);
                            setContainerH(height);
                        }}
                    >
                        {cropImageUri && containerW > 0 && containerH > 0 && (
                            <View style={{ width: containerW, height: containerH, position: 'relative' }}>
                                <Image 
                                    source={{ uri: cropImageUri }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="contain"
                                />

                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} pointerEvents="none" />

                                <View 
                                    style={{
                                        position: 'absolute',
                                        left: boxX,
                                        top: boxY,
                                        width: boxW,
                                        height: boxH,
                                        borderWidth: 2,
                                        borderColor: cropStep === 'batch' ? '#FF9800' : '#4CAF50',
                                        borderRadius: 8,
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        shadowColor: cropStep === 'batch' ? '#FF9800' : '#4CAF50',
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.8,
                                        shadowRadius: 10,
                                        elevation: 8,
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                    {...boxPanResponder.panHandlers}
                                >
                                    <Text style={{ 
                                        color: '#FFF', 
                                        fontSize: 11, 
                                        fontWeight: 'bold', 
                                        backgroundColor: cropStep === 'batch' ? '#E65100' : '#2E7D32',
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 4,
                                        opacity: 0.85
                                    }}>
                                        {cropStep === 'batch' ? 'التشغيلة (Batch)' : 'الصلاحية (Expiry)'}
                                    </Text>

                                    <View 
                                        style={{
                                            position: 'absolute',
                                            bottom: -12,
                                            right: -12,
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: '#FFF',
                                            borderWidth: 4,
                                            borderColor: cropStep === 'batch' ? '#FF9800' : '#4CAF50',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            zIndex: 999
                                        }}
                                        {...resizePanResponder.panHandlers}
                                    >
                                        <Ionicons name="resize" size={14} color="#000" />
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={{ padding: 20, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#222' }}>
                        <TouchableOpacity 
                            style={{ 
                                backgroundColor: cropStep === 'batch' ? '#FF9800' : '#4CAF50',
                                height: 56,
                                borderRadius: 14,
                                justifyContent: 'center',
                                alignItems: 'center',
                                shadowColor: cropStep === 'batch' ? '#FF9800' : '#4CAF50',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 5,
                                flexDirection: 'row-reverse'
                            }}
                            onPress={executeHighlightCrop}
                            disabled={cropLoading}
                            activeOpacity={0.8}
                        >
                            {cropLoading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" style={{ marginLeft: 8 }} />
                                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>
                                        {cropStep === 'batch' ? 'تأكيد وقراءة رقم التشغيلة' : 'تأكيد وقراءة تاريخ الصلاحية'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
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
    itemsHeader: {
        height: 64,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerRightSide: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        alignItems: 'flex-end',
    },
    itemsHeaderTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    titleLine: {
        width: 24,
        height: 3,
        borderRadius: 1.5,
        marginTop: 4,
    },
    infoBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row-reverse',
        width: '100%',
        height: 52,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    tabButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        height: '100%',
    },
    activeTabButton: {
        borderBottomWidth: 3,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 110,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'right',
        marginLeft: 10,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardDetailsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginRight: 16,
    },
    detailText: {
        fontSize: 13,
        marginRight: 4,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 12,
        opacity: 0.5,
    },
    cardValuesRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    valueBox: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        padding: 10,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    valueBoxLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    valueBoxValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    scanFab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 30,
        elevation: 6,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    fabText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 30,
    },
    emptyListTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyListSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 36,
        elevation: 10,
    },
    bottomSheetHandle: {
        width: 44,
        height: 5,
        backgroundColor: '#CCC',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
        opacity: 0.8,
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    modalCloseBtn: {
        padding: 4,
    },
    ocrBtn: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    ocrBtnText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    ocrHelpText: {
        fontSize: 12,
        textAlign: 'right',
        lineHeight: 18,
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'right',
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 52,
        textAlign: 'right',
        marginBottom: 16,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalBtn: {
        flex: 1,
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoModalBody: {
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '700',
    },
});
