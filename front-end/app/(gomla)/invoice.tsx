import React, { useState, useRef, useEffect } from 'react';
import { 
	View, Text, StyleSheet, TextInput, TouchableOpacity, 
	FlatList, ActivityIndicator, Alert, Modal, ScrollView,
	Image, PanResponder, Dimensions, KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../src/core/theme';
import { useTheme } from '@/context/ThemeContext';
import { BarcodeScannerModal } from '../../src/modules/gomla/components/BarcodeScannerModal';
import { performOcr, uploadToRoboflow } from '../../src/modules/gomla/utils/ocrParser';
import * as FileSystem from 'expo-file-system';
import { 
    fetchGomlaInvoice, 
    updateGomlaInvoiceItem, 
    saveGomlaInvoiceCache,
    fetchProductBatchHistory,
    fetchProductStockBalance,
    updateInvoiceAuditStatus,
    GomlaInvoiceDetails, 
    GomlaInvoiceItem 
} from '../../src/modules/gomla/services/gomlaService';
import { addToSyncQueue, processSyncQueue, getFailedQueueItems } from '../../src/modules/gomla/services/syncManager';

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

export const isValidBatch = (b?: string) => {
    if (!b) return false;
    const clean = b.trim();
    return clean.length > 0 && 
           clean !== '0' && 
           clean !== '.' && 
           clean.toUpperCase() !== 'ASDFGH' &&
           clean.toUpperCase() !== 'NULL';
};

export const isValidExpiry = (e?: string) => {
    if (!e) return false;
    const clean = e.trim();
    return clean.length > 0 && 
           !clean.startsWith('1899') && 
           !clean.startsWith('2013-12-12') && 
           !clean.startsWith('2015-01-01') && 
           clean !== '0';
};


export default function GomlaInvoiceDetailsScreen() {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<GomlaInvoiceDetails | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'audited'>('pending');
    
    const [refreshing, setRefreshing] = useState(false);
    const [failedItems, setFailedItems] = useState<string[]>([]);

    const [scannerVisible, setScannerVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<GomlaInvoiceItem | null>(null);
    const [batchInput, setBatchInput] = useState('');
    const [expiryInput, setExpiryInput] = useState('');
    const [qtyInput, setQtyInput] = useState('');
    const [isQtyEditable, setIsQtyEditable] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [itemDetailsVisible, setItemDetailsVisible] = useState(false);
    const [detailsItem, setDetailsItem] = useState<GomlaInvoiceItem | null>(null);
    const [stockBalances, setStockBalances] = useState<any[]>([]);
    const [loadingStock, setLoadingStock] = useState(false);

    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorModalTitle, setErrorModalTitle] = useState("");
    const [errorModalMessage, setErrorModalMessage] = useState("");
    const [errorRetryAction, setErrorRetryAction] = useState<(() => void) | null>(null);

    const showError = (title: string, message: string, onRetry?: () => void) => {
        setErrorModalTitle(title);
        setErrorModalMessage(message);
        setErrorRetryAction(() => onRetry || null);
        setErrorModalVisible(true);
    };

    const openItemDetailsModal = async (item: GomlaInvoiceItem) => {
        setDetailsItem(item);
        setItemDetailsVisible(true);
        setLoadingStock(true);
        setStockBalances([]);
        try {
            const balances = await fetchProductStockBalance(item.prod_id);
            setStockBalances(balances);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingStock(false);
        }
    };

    const [isBatchNumeric, setIsBatchNumeric] = useState(true);
    const [suggestedHistory, setSuggestedHistory] = useState<{batch: string, expiry: string} | null>(null);
    const expiryInputRef = useRef<TextInput>(null);
    const batchInputRef = useRef<TextInput>(null);

    // Highlight Crop Flow State
    const [cropModalVisible, setCropModalVisible] = useState(false);
    const [cropImageUri, setCropImageUri] = useState<string | null>(null);
    const [cropStep, setCropStep] = useState<'batch' | 'expiry'>('batch');
    const [rawImageWidth, setRawImageWidth] = useState(0);
    const [rawImageHeight, setRawImageHeight] = useState(0);
    const [cropLoading, setCropLoading] = useState(false);
    
    // Manual Cropping state for Roboflow Active Learning
    const [manualBatchBox, setManualBatchBox] = useState<any>(null);
    const [manualExpiryBox, setManualExpiryBox] = useState<any>(null);

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

    const loadInvoiceDetails = async (showLoader = true) => {
        if (!id) return;
        if (showLoader) setLoading(true);
        try {
            const data = await fetchGomlaInvoice(id as string);

            // Merge with pending offline sync queue to prevent UI flickering on refresh
            try {
                const queueStr = await AsyncStorage.getItem('@gomla_offline_sync_queue');
                if (queueStr) {
                    const queue = JSON.parse(queueStr);
                    if (Array.isArray(queue) && queue.length > 0) {
                        data.items = data.items.map(item => {
                            const syncTask = queue.find(t => t.itemId === item.id);
                            if (syncTask) {
                                return {
                                    ...item,
                                    batch: syncTask.batch,
                                    expire_date: syncTask.expiry,
                                    qty: syncTask.qty || item.qty
                                };
                            }
                            return item;
                        });
                    }
                }
            } catch (e) {
                console.error("Error merging sync queue:", e);
            }

            setInvoice(data);
            
            // Fetch failed queue to highlight rejected items
            const failed = await getFailedQueueItems();
            setFailedItems(failed);
        } catch (error) {
            console.error("[Invoice Details] Fetch Error:", error);
            Alert.alert("خطأ في التحميل", "تعذر جلب تفاصيل الفاتورة.");
            router.back();
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadInvoiceDetails(false);
        setRefreshing(false);
    }, [id]);

    useEffect(() => {
        loadInvoiceDetails();
        if (id) {
            updateInvoiceAuditStatus(id as string, 'editing');
        }
        return () => {
            if (id) {
                updateInvoiceAuditStatus(id as string, 'clear');
            }
        };
    }, [id]);

    useEffect(() => {
        if (invoice && invoice.items && invoice.items.length > 0 && id) {
            const isValidBatch = (b: string) => b && b.trim() !== '' && b.trim() !== '0';
            const isValidExpiry = (e: string) => e && e.trim() !== '' && e.trim() !== '0';
            const pending = invoice.items.filter(item => !isValidBatch(item.batch) || !isValidExpiry(item.expire_date));
            if (pending.length === 0) {
                updateInvoiceAuditStatus(id as string, 'audited');
            }
        }
    }, [invoice, id]);

    const handleScan = (barcode: string) => {
        setScannerVisible(false);
        if (!invoice) return;

        const cleanScanned = barcode.replace(/\D/g, '').replace(/^0+/, '');
        const exactScanned = barcode.trim();

        // Find item by barcode or prod_id
        const item = invoice.items.find(i => {
            const itemBarcode = i.barcode ? i.barcode.replace(/\D/g, '').replace(/^0+/, '') : '';
            return (itemBarcode && itemBarcode === cleanScanned) || 
                   (i.prod_id && i.prod_id.trim() === exactScanned);
        });

        if (item) {
            openEditModal(item);
        } else {
            Alert.alert("غير موجود", `لم يتم العثور على صنف بالباركود: ${barcode} في هذه الفاتورة.`);
        }
    };

    const openEditModal = async (item: GomlaInvoiceItem) => {
        setSelectedItem(item);
        setBatchInput('');
        setExpiryInput('');
        setQtyInput(item.qty.toString());
        setIsQtyEditable(false);
        setIsBatchNumeric(true);
        setSuggestedHistory(null);
        setEditModalVisible(true);

        setTimeout(() => batchInputRef.current?.focus(), 150);

        if (!item.batch) {
            const history = await fetchProductBatchHistory(item.prod_id);
            if (history) {
                setSuggestedHistory(history);
            }
        }
    };

    const launchHighlightFlow = (imageUri: string) => {
        Image.getSize(imageUri, (width, height) => {
            setRawImageWidth(width);
            setRawImageHeight(height);
            setCropImageUri(imageUri);
            setCropStep('batch');
            setManualBatchBox(null);
            setManualExpiryBox(null);
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

            const currentBox = {
                x: originX + width / 2,
                y: originY + height / 2,
                width: width,
                height: height,
                class: cropStep === 'batch' ? 'Batch' : 'Expiry',
                confidence: 1
            };

            const manipResult = await ImageManipulator.manipulateAsync(
                cropImageUri,
                [{ crop: { originX, originY, width, height } }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );

            const ocrResult = await performOcr(manipResult.uri, cropStep);
            
            if (cropStep === 'batch') {
                if (ocrResult.batch) {
                    setBatchInput(ocrResult.batch);
                    setManualBatchBox(currentBox);
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
                    setManualExpiryBox(currentBox);
                    Alert.alert("تم القراءة", `تم العثور على التاريخ: ${ocrResult.expiry}`);
                    setCropModalVisible(false);
                    
                    // Trigger Roboflow Active Learning Upload in background!
                    try {
                        const base64Data = await FileSystem.readAsStringAsync(cropImageUri, { encoding: 'base64' as any });
                        uploadToRoboflow(base64Data, manualBatchBox, currentBox);
                        // Show a small success toast or message
                        console.log("[Roboflow] Active learning upload triggered.");
                    } catch (fsError) {
                        console.error("[Roboflow] Failed to read image for upload:", fsError);
                    }
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

            // Compress image to avoid OCR.space E202 (File too large) error
            const manipResult = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: 800 } }], 
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            const ocrResult = await performOcr(manipResult.uri, 'none', manipResult.base64);
            
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

    const handleSaveItem = async (overrideBatch?: string | any, overrideExpiry?: string) => {
        if (!selectedItem) return;

        const bInput = typeof overrideBatch === 'string' ? overrideBatch : batchInput.trim();
        const eInput = typeof overrideExpiry === 'string' ? overrideExpiry : expiryInput.trim();

        const finalBatch = bInput || selectedItem.batch || selectedItem.suggested_batch || '';
        const rawExpiry = eInput || selectedItem.expire_date || selectedItem.suggested_expiry || '';
        const rawQty = qtyInput.trim();

        if (!finalBatch || !rawExpiry || !rawQty) {
            showError("تنبيه", "يجب إدخال الكمية والتشغيلة وتاريخ الصلاحية");
            return;
        }

        const parsedQty = parseFloat(rawQty);
        if (isNaN(parsedQty) || parsedQty <= 0) {
            showError("تنبيه", "يجب إدخال كمية صحيحة أكبر من الصفر");
            return;
        }

        if (parsedQty > selectedItem.qty) {
            showError("تنبيه", `الكمية المدخلة (${parsedQty}) أكبر من الكمية المتاحة حالياً للصنف وهي (${selectedItem.qty})`);
            return;
        }

        const formattedExpiry = parseShorthandDate(rawExpiry);

        if (!isValidBatch(finalBatch)) {
            showError("تنبيه", "يجب إدخال تشغيلة صحيحة", () => {
                setBatchInput('');
                setTimeout(() => batchInputRef.current?.focus(), 100);
            });
            return;
        }

        if (!isValidExpiry(formattedExpiry)) {
            showError("تنبيه", "تاريخ الصلاحية غير صحيح", () => {
                setExpiryInput('');
                setTimeout(() => expiryInputRef.current?.focus(), 100);
            });
            return;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(formattedExpiry)) {
            showError("صيغة غير صحيحة", "تاريخ الصلاحية يجب أن يكون بصيغة YYYY-MM-DD أو إدخال اختصار مثل 529", () => {
                setExpiryInput('');
                setTimeout(() => expiryInputRef.current?.focus(), 100);
            });
            return;
        }

        setSaving(true);
        try {
            setEditModalVisible(false);
            
            // 1. Optimistic UI Update & Cache
            if (invoice) {
                const updatedItems = invoice.items.map(item => {
                    if (item.id === selectedItem.id) {
                        return {
                            ...item,
                            batch: finalBatch,
                            expire_date: formattedExpiry,
                            qty: parsedQty
                        };
                    }
                    return item;
                });
                const updatedInvoice = {...invoice, items: updatedItems};
                setInvoice(updatedInvoice);
                await saveGomlaInvoiceCache(invoice.id, updatedInvoice);
            }
            
            // Remove from failed items locally to clear the red border
            setFailedItems(prev => prev.filter(fid => fid !== selectedItem.id));

            // 2. Add to offline sync queue
            await addToSyncQueue(selectedItem.id, selectedItem.prod_id, finalBatch, formattedExpiry, parsedQty);

            // 3. Update dashboard timestamp
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

            // 4. Attempt immediate background sync
            processSyncQueue();
        } catch (error) {
            console.error("Save item error:", error);
            Alert.alert("خطأ", "حدث خطأ غير متوقع أثناء الحفظ محلياً");
        } finally {
            setSaving(false);
        }
    };

    const renderItem = ({ item }: { item: GomlaInvoiceItem }) => {
        const isFailed = failedItems.includes(item.id);
        
        return (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.surface, borderColor: isFailed ? '#FFCDD2' : theme.border, borderWidth: isFailed ? 1.5 : 1, padding: 0, overflow: 'hidden', borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }]}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
        >
            <View style={{ flexDirection: 'row-reverse' }}>
                {/* Main Content Area */}
                <View style={{ flex: 1 }}>
                    <View style={{ padding: 14 }}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center' }}>
                                {/* Quantity Badge on Name Row */}
                                <View style={{ 
                                    backgroundColor: isFailed ? '#FFEBEE' : theme.primary + '15', 
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 12,
                                    marginLeft: 10,
                                    borderWidth: 1,
                                    borderColor: isFailed ? '#FFCDD2' : theme.primary + '30'
                                }}>
                                    <Text style={{ fontSize: 16, fontWeight: '900', color: isFailed ? '#D32F2F' : theme.primary }}>{item.qty}</Text>
                                </View>
                                
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, flex: 1, textAlign: 'right', lineHeight: 22 }}>
                                    {item.name}
                                </Text>
                            </View>
                            
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginRight: 8 }}>
                                {isFailed && (
                                    <View style={{ backgroundColor: '#D32F2F', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>مرفوض</Text>
                                    </View>
                                )}
                                <TouchableOpacity 
                                    style={{ padding: 6, backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0', borderRadius: 20 }}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        openItemDetailsModal(item);
                                    }}
                                >
                                    <Ionicons name="information-circle" size={22} color={theme.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Batch & Expiry Info */}
                    {(isValidBatch(item.batch) || isValidExpiry(item.expire_date)) && (
                        <View style={{ flexDirection: 'row-reverse', backgroundColor: isDark ? theme.primary + '15' : theme.primary + '10', borderTopWidth: 1, borderTopColor: theme.border }}>
                            {isValidBatch(item.batch) && (
                                <View style={{ flex: 1, padding: 10, borderLeftWidth: isValidExpiry(item.expire_date) ? 1 : 0, borderLeftColor: theme.border, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 11, color: theme.primary, fontWeight: 'bold', marginBottom: 2 }}>رقم التشغيلة</Text>
                                    <Text style={{ fontSize: 13, color: theme.text, fontWeight: 'bold' }}>{item.batch}</Text>
                                </View>
                            )}
                            {isValidExpiry(item.expire_date) && (
                                <View style={{ flex: 1, padding: 10, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 11, color: theme.primary, fontWeight: 'bold', marginBottom: 2 }}>تاريخ الصلاحية</Text>
                                    <Text style={{ fontSize: 13, color: theme.text, fontWeight: 'bold' }}>{item.expire_date}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Footer Location (Hidden if Audited) */}
                    {(activeTab !== 'audited' && item.location) ? (
                        <View style={{ 
                            flexDirection: 'row-reverse', 
                            alignItems: 'center', 
                            backgroundColor: isDark ? '#2C2C2E' : '#F8F9FA', 
                            paddingHorizontal: 14, 
                            paddingVertical: 10, 
                            borderTopWidth: 1, 
                            borderTopColor: theme.border
                        }}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}>
                                <Ionicons name="location" size={12} color={theme.primary} />
                            </View>
                            <Text style={{ fontSize: 12, color: theme.muted, fontWeight: '500' }}>الموقع: </Text>
                            <Text style={{ fontSize: 13, color: theme.text, fontWeight: 'bold' }}>{item.location}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loaderText, { color: theme.muted }]}>جارٍ جلب تفاصيل الفاتورة...</Text>
                </View>
            </View>
        );
    }

    if (!invoice) return null;

    const isAudited = (item: GomlaInvoiceItem) => isValidBatch(item.batch) && isValidExpiry(item.expire_date);

    const pendingItems = invoice.items.filter(item => !isAudited(item));
    const auditedItems = invoice.items.filter(item => isAudited(item));

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={{ flex: 1 }}>
                {/* Premium Pharmacist-Style Custom Header for Items View */}
                <View style={[
                    styles.itemsHeader, 
                    { 
                        backgroundColor: theme.surface,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border + '20',
                        paddingTop: insets.top,
                        height: 52 + insets.top,
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
                            أصناف لم تحضر ({pendingItems.length})
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
                            أصناف تم تحضيرها ({auditedItems.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={activeTab === 'pending' ? pendingItems : auditedItems}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.emptyListContainer}>
                            <Ionicons 
                                name={activeTab === 'pending' ? "checkmark-circle" : "file-tray"} 
                                size={54} 
                                color={activeTab === 'pending' ? '#4CAF50' : theme.muted} 
                                style={{ marginBottom: 12 }} 
                            />
                            <Text style={[styles.emptyListTitle, { color: theme.text }]}>
                                {activeTab === 'pending' ? "تم الانتهاء!" : "لا يوجد تحضير"}
                            </Text>
                            <Text style={[styles.emptyListSubtitle, { color: theme.muted }]}>
                                {activeTab === 'pending' 
                                    ? "تهانينا! تم تحضير جميع أصناف هذه الفاتورة بنجاح." 
                                    : "لم يتم تحضير أي أصناف في هذه الفاتورة حتى الآن."
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
                hintText="قم بتوجيه الكاميرا إلى باركود الصنف"
            />

            {/* Edit Item Modal */}
            <Modal 
                visible={editModalVisible} 
                transparent 
                animationType="slide"
                onShow={() => setTimeout(() => batchInputRef.current?.focus(), 100)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalOverlay}
                    behavior="padding"
                >
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={() => setEditModalVisible(false)} 
                    />
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, paddingBottom: 16 }]}>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.bottomSheetHandle} />
                            
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: theme.text, flex: 1, textAlign: 'right', fontSize: 18 }]} numberOfLines={2}>
                                    {selectedItem ? selectedItem.name : ''}
                                </Text>
                            </View>

                            {suggestedHistory && !batchInput && !expiryInput && (
                                <TouchableOpacity 
                                    style={{
                                        backgroundColor: theme.primary + '10',
                                        borderRadius: 8,
                                        paddingVertical: 10,
                                        paddingHorizontal: 12,
                                        marginTop: 16,
                                        marginBottom: 4,
                                        flexDirection: 'row-reverse',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8
                                    }}
                                    onPress={() => {
                                        setBatchInput(suggestedHistory.batch);
                                        setExpiryInput(suggestedHistory.expiry);
                                        handleSaveItem(suggestedHistory.batch, suggestedHistory.expiry);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="sparkles" size={16} color={theme.primary} />
                                    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>
                                        تعبئة تلقائية:
                                    </Text>
                                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                                        <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 12 }}>تشغيلة: </Text>
                                        {suggestedHistory.batch}  •  
                                        <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 12 }}> تاريخ: </Text>
                                        {suggestedHistory.expiry}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <View style={{ 
                                marginTop: (suggestedHistory && !batchInput && !expiryInput) ? 8 : 16, 
                                backgroundColor: theme.primary + '15', 
                                padding: 16, 
                                borderRadius: 12, 
                                borderWidth: 2, 
                                borderColor: theme.primary + '50',
                                flexDirection: 'row-reverse',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                gap: 12
                            }}>
                                <View style={{ backgroundColor: theme.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name="cube-outline" size={20} color="#FFF" />
                                </View>
                                <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>الكمية المطلوبة:</Text>
                                <Text style={{ color: theme.primary, fontSize: 28, fontWeight: '900' }}>
                                    {selectedItem ? selectedItem.qty.toString() : ""}
                                </Text>
                            </View>

                            <TouchableOpacity 
                                style={{
                                    backgroundColor: theme.accent,
                                    borderRadius: 8,
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    marginTop: 16,
                                    flexDirection: 'row-reverse',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    shadowColor: theme.accent,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 4,
                                    elevation: 4,
                                    display: 'none'
                                }}
                                onPress={handleCameraOcr}
                                disabled={ocrLoading}
                                activeOpacity={0.8}
                            >
                                {ocrLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="camera" size={22} color="#FFF" />
                                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                                            قراءة بالتصوير الذكي
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                        <View style={{ flexDirection: 'row-reverse', gap: 16, marginBottom: 16, marginTop: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: theme.text }]}>التشغيلة:</Text>
                                <View style={{ position: 'relative', justifyContent: 'center' }}>
                                    <TextInput
                                        ref={batchInputRef}
                                        style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginBottom: 0, paddingLeft: 40 }]}
                                        value={batchInput}
                                        onChangeText={setBatchInput}
                                        placeholder={selectedItem ? (selectedItem.batch || selectedItem.suggested_batch || "مثال: ASDFGH") : "مثال: ASDFGH"}
                                        placeholderTextColor={theme.placeholder}
                                        autoCapitalize="characters"
                                        returnKeyType="next"
                                        blurOnSubmit={false}
                                        onSubmitEditing={() => {
                                            if (!batchInput.trim()) {
                                                handleSaveItem();
                                            } else {
                                                expiryInputRef.current?.focus();
                                            }
                                        }}
                                        keyboardType={isBatchNumeric ? 'numeric' : 'default'}
                                    />
                                    <TouchableOpacity 
                                        style={{ position: 'absolute', left: 8, padding: 4 }}
                                        onPress={() => setIsBatchNumeric(!isBatchNumeric)}
                                    >
                                        <Ionicons name={isBatchNumeric ? "text" : "keypad"} size={22} color={theme.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: theme.text }]}>الصلاحية:</Text>
                                <TextInput
                                    ref={expiryInputRef}
                                    style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginBottom: 0 }]}
                                    value={expiryInput}
                                    onChangeText={setExpiryInput}
                                    placeholder={selectedItem ? (selectedItem.expire_date || selectedItem.suggested_expiry || "مثال: 529") : "مثال: 529"}
                                    placeholderTextColor={theme.placeholder}
                                    keyboardType="numeric"
                                    returnKeyType="done"
                                    onSubmitEditing={() => {
                                        handleSaveItem();
                                    }}
                                />
                            </View>
                        </View>
                        
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Item Details Modal */}
            <Modal visible={itemDetailsVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>تفاصيل الصنف</Text>
                            <TouchableOpacity onPress={() => setItemDetailsVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                        {detailsItem && (
                            <View style={styles.infoModalBody}>
                                <View style={[styles.infoRow, { borderColor: theme.border }]}>
                                    <Text style={[styles.infoLabel, { color: theme.muted }]}>اسم الصنف:</Text>
                                    <Text style={[styles.infoValue, { color: theme.text, flex: 1, textAlign: 'left', marginLeft: 16 }]} numberOfLines={2}>{detailsItem.name}</Text>
                                </View>
                                
                                <View style={[styles.infoRow, { borderColor: theme.border }]}>
                                    <Text style={[styles.infoLabel, { color: theme.muted }]}>كود الصنف:</Text>
                                    <Text style={[styles.infoValue, { color: theme.primary, fontWeight: 'bold' }]}>{detailsItem.prod_id}</Text>
                                </View>

                                <View style={[styles.infoRow, { borderColor: theme.border }]}>
                                    <Text style={[styles.infoLabel, { color: theme.muted }]}>السعر:</Text>
                                    <Text style={[styles.infoValue, { color: theme.accent, fontWeight: 'bold' }]}>{detailsItem.price} ج.م</Text>
                                </View>

                                <View style={[styles.infoRow, { borderColor: theme.border, flexDirection: 'column', alignItems: 'stretch', paddingVertical: 12 }]}>
                                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={[styles.infoLabel, { color: theme.muted, fontWeight: 'bold', fontSize: 16 }]}>الرصيد الحالي:</Text>
                                        <Text style={[styles.infoValue, { color: '#4CAF50', fontWeight: 'bold', fontSize: 18 }]}>
                                            {loadingStock ? "جاري التحميل..." : (stockBalances.length > 0 ? stockBalances.reduce((a, b) => a + b.qty, 0) + " علبة" : "رصيد غير متوفر")}
                                        </Text>
                                    </View>
                                    
                                    {!loadingStock && stockBalances.length > 0 && (
                                        <View style={{ backgroundColor: theme.primary + '10', borderRadius: 8, padding: 12, marginTop: 8 }}>
                                            <Text style={{ textAlign: 'right', color: theme.text, fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>توزيع الرصيد على المخازن:</Text>
                                            {stockBalances.map((store, index) => (
                                                <View key={index} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <Text style={{ color: theme.muted, fontSize: 13 }}>{store.store_name}:</Text>
                                                    <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 14 }}>{store.qty} علبة</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {detailsItem.audited_by_name && (
                                    <View style={[styles.infoRow, { borderColor: theme.border, backgroundColor: isDark ? '#1C2E24' : '#E8F5E9', borderRadius: 8, marginTop: 8, paddingHorizontal: 12, borderBottomWidth: 0, paddingVertical: 12 }]}>
                                        <Text style={[styles.infoLabel, { color: isDark ? '#A5D6A7' : '#2E7D32' }]}>تم التحضير بواسطة:</Text>
                                        <Text style={[styles.infoValue, { color: isDark ? '#81C784' : '#1B5E20', fontWeight: 'bold' }]}>{detailsItem.audited_by_name}</Text>
                                    </View>
                                )}
                                {(detailsItem.modified_by_name && detailsItem.modified_by_name !== detailsItem.audited_by_name) && (
                                    <View style={[styles.infoRow, { borderColor: theme.border, backgroundColor: isDark ? '#3E2723' : '#FFF3E0', borderRadius: 8, marginTop: 8, paddingHorizontal: 12, borderBottomWidth: 0, paddingVertical: 12 }]}>
                                        <Text style={[styles.infoLabel, { color: isDark ? '#FFCC80' : '#E65100' }]}>تم التعديل بواسطة:</Text>
                                        <Text style={[styles.infoValue, { color: isDark ? '#FFB74D' : '#E65100', fontWeight: 'bold' }]}>{detailsItem.modified_by_name}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', marginTop: 12 }}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                                onPress={() => setItemDetailsVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>إغلاق</Text>
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

            {/* Error Validation Modal */}
            <Modal visible={errorModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, alignItems: 'center', paddingBottom: 36, paddingTop: 20 }]}>
                        <View style={styles.bottomSheetHandle} />
                        
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 12 }}>
                            <Ionicons name="alert-circle" size={44} color="#D32F2F" />
                        </View>
                        
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#D32F2F', textAlign: 'center', marginBottom: 12 }}>
                            {errorModalTitle}
                        </Text>
                        
                        <Text style={{ fontSize: 16, color: theme.text, textAlign: 'center', lineHeight: 26, marginBottom: 32, paddingHorizontal: 16, fontWeight: '500' }}>
                            {errorModalMessage}
                        </Text>

                        <TouchableOpacity 
                            style={{ backgroundColor: theme.primary, width: '100%', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                            onPress={() => {
                                setErrorModalVisible(false);
                                if (errorRetryAction) {
                                    setTimeout(() => errorRetryAction(), 300);
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>تعديل وإعادة المحاولة</Text>
                        </TouchableOpacity>
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
        </View>
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
        padding: 4,
        marginLeft: -4,
    },
    headerTitleContainer: {
        alignItems: 'flex-end',
    },
    itemsHeaderTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    titleLine: {
        width: 25,
        height: 4,
        borderRadius: 2,
        marginTop: -2,
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
