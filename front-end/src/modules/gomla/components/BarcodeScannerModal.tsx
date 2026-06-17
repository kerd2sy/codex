import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Animated, Vibration, Dimensions } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Colors } from '../../../core/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface BarcodeScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
    hintText?: string;
}

const { width, height } = Dimensions.get('window');
const SCAN_FRAME_SIZE = 280;

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ visible, onClose, onScan, hintText }) => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    // Buffers for barcode validation to prevent misreads
    const verificationBuffer = useRef<string | null>(null);
    const verificationCount = useRef(0);

    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        if (visible) {
            setScanned(false);
            verificationBuffer.current = null;
            verificationCount.current = 0;
            getBarCodeScannerPermissions();
            
            // Laser animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, {
                        toValue: SCAN_FRAME_SIZE - 4,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanLineAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    })
                ])
            ).start();

            // Pulse animation for corners
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            scanLineAnim.setValue(0);
            pulseAnim.setValue(1);
        }
    }, [visible]);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;

        const cleanData = data?.trim();
        if (!cleanData || cleanData.length < 2) return;

        // Double Verification Logic: Prevents motion blur misreads
        if (verificationBuffer.current === cleanData) {
            verificationCount.current += 1;
        } else {
            verificationBuffer.current = cleanData;
            verificationCount.current = 1;
        }

        // Require 2 consecutive identical reads
        if (verificationCount.current >= 2) {
            setScanned(true);
            verificationBuffer.current = null;
            verificationCount.current = 0;
            Vibration.vibrate([0, 100, 50, 100]); // Premium double vibration
            onScan(cleanData);
        }
    };

    if (hasPermission === null && visible) {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            </Modal>
        );
    }

    if (hasPermission === false && visible) {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="camera-outline" size={64} color={theme.muted} style={{ marginBottom: 20 }} />
                    <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>عفواً، لا يوجد صلاحية للوصول للكاميرا</Text>
                    <TouchableOpacity onPress={onClose} style={[styles.permissionBtn, { backgroundColor: theme.primary }]}>
                        <Text style={styles.permissionBtnText}>إغلاق</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                {visible && (
                    <CameraView
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr", "ean13", "ean8", "upc_e", "upc_a", "code128", "code39"],
                        }}
                        style={StyleSheet.absoluteFill}
                    >
                        {/* Overlay with transparent hole */}
                        <View style={styles.overlayContainer}>
                            <View style={styles.overlayTop} />
                            <View style={styles.overlayMiddleRow}>
                                <View style={styles.overlaySide} />
                                <View style={styles.transparentHole}>
                                    
                                    {/* Animated Corners */}
                                    <Animated.View style={[styles.corner, styles.cornerTL, { borderColor: theme.primary, transform: [{ scale: pulseAnim }] }]} />
                                    <Animated.View style={[styles.corner, styles.cornerTR, { borderColor: theme.primary, transform: [{ scale: pulseAnim }] }]} />
                                    <Animated.View style={[styles.corner, styles.cornerBL, { borderColor: theme.primary, transform: [{ scale: pulseAnim }] }]} />
                                    <Animated.View style={[styles.corner, styles.cornerBR, { borderColor: theme.primary, transform: [{ scale: pulseAnim }] }]} />

                                    {/* Laser Line */}
                                    <Animated.View 
                                        style={[
                                            styles.scanLine, 
                                            { backgroundColor: theme.primary, shadowColor: theme.primary, transform: [{ translateY: scanLineAnim }] }
                                        ]} 
                                    />
                                </View>
                                <View style={styles.overlaySide} />
                            </View>
                            <View style={styles.overlayBottom} />
                        </View>

                        {/* Floating Header */}
                        <View style={styles.headerContainer}>
                            <BlurView intensity={isDark(colorScheme) ? 40 : 80} tint={isDark(colorScheme) ? "dark" : "light"} style={styles.headerBlur}>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <Ionicons name="close" size={28} color={theme.text} />
                                </TouchableOpacity>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={[styles.headerTitle, { color: theme.text }]}>مسح الباركود</Text>
                                    <Text style={[styles.headerSubtitle, { color: theme.muted }]}>قسم الجملة</Text>
                                </View>
                                <View style={{ width: 44 }} /> {/* Spacer to balance close button */}
                            </BlurView>
                        </View>

                        {/* Floating Hint/Footer */}
                        <View style={styles.footerContainer}>
                            {scanned ? (
                                <BlurView intensity={isDark(colorScheme) ? 40 : 80} tint={isDark(colorScheme) ? "dark" : "light"} style={[styles.hintBlur, { backgroundColor: theme.primary + '20' }]}>
                                    <Ionicons name="checkmark-circle" size={32} color={theme.primary} style={{ marginBottom: 8 }} />
                                    <Text style={[styles.hintText, { color: theme.text, fontSize: 18 }]}>تم الالتقاط بنجاح!</Text>
                                    <TouchableOpacity 
                                        style={[styles.rescanBtn, { backgroundColor: theme.primary }]} 
                                        onPress={() => setScanned(false)}
                                    >
                                        <Text style={styles.rescanBtnText}>إعادة المسح</Text>
                                    </TouchableOpacity>
                                </BlurView>
                            ) : (
                                <BlurView intensity={isDark(colorScheme) ? 40 : 80} tint={isDark(colorScheme) ? "dark" : "light"} style={styles.hintBlur}>
                                    <Ionicons name="barcode-outline" size={28} color={theme.text} style={{ marginBottom: 8 }} />
                                    <Text style={[styles.hintText, { color: theme.text }]}>
                                        {hintText || 'قم بتوجيه الكاميرا نحو الباركود وسيتم مسحه تلقائياً'}
                                    </Text>
                                </BlurView>
                            )}
                        </View>
                    </CameraView>
                )}
            </View>
        </Modal>
    );
};

// Helper for dark mode check
const isDark = (colorScheme: string | null | undefined) => colorScheme === 'dark';

const overlayColor = 'rgba(0, 0, 0, 0.65)'; // Darker overlay for premium feel

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlayContainer: {
        ...StyleSheet.absoluteFill,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: overlayColor,
    },
    overlayMiddleRow: {
        flexDirection: 'row',
        height: SCAN_FRAME_SIZE,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: overlayColor,
    },
    transparentHole: {
        width: SCAN_FRAME_SIZE,
        height: SCAN_FRAME_SIZE,
        backgroundColor: 'transparent',
        position: 'relative',
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: overlayColor,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderWidth: 0,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 16,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 16,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 16,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 16,
    },
    scanLine: {
        width: '100%',
        height: 3,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
        borderRadius: 2,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 50, // Safe area roughly
        paddingHorizontal: 20,
    },
    headerBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        overflow: 'hidden',
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(128,128,128,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
    },
    hintBlur: {
        padding: 24,
        borderRadius: 24,
        overflow: 'hidden',
        alignItems: 'center',
    },
    hintText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
    },
    rescanBtn: {
        marginTop: 20,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 16,
    },
    rescanBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    permissionBtn: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
    },
    permissionBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
