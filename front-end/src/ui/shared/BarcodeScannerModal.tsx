import { Colors } from '@/core/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BarcodeScannerModalProps {
    isVisible: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
}

export default function BarcodeScannerModal({ isVisible, onClose, onScan }: BarcodeScannerModalProps) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark'];
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [isFlashOn, setIsFlashOn] = useState(false);

    const scanLineAnim = useRef(new Animated.Value(0)).current;

    const startScanLineAnimation = useCallback(() => {
        scanLineAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 240, // Height of the focused square
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [scanLineAnim]);

    useEffect(() => {
        if (isVisible && permission?.granted && !scanned) {
            startScanLineAnimation();
        } else {
            scanLineAnim.stopAnimation();
        }
    }, [isVisible, permission, scanned, scanLineAnim, startScanLineAnimation]);

    if (!isVisible) return null;

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        if (!scanned) {
            setScanned(true);
            onScan(data);
            setTimeout(() => setScanned(false), 2000);
        }
    };

    const renderContent = () => {
        if (!permission) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            );
        }

        if (!permission.granted) {
            return (
                <View style={[styles.centerContent, { backgroundColor: theme.background, paddingVertical: 10 }]}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
                        <Ionicons name="camera" size={50} color={theme.primary} />
                        <View style={[styles.iconBadge, { backgroundColor: theme.accent }]}>
                            <Ionicons name="scan" size={14} color="#FFF" />
                        </View>
                    </View>
                    
                    <Text style={[styles.permissionTitle, { color: theme.text }]}>إذن الكاميرا مطلوب</Text>
                    <Text style={[styles.permissionDesc, { color: theme.muted }]}>
                        نحتاج للوصول إلى الكاميرا لنتمكن من مسح الباركود الخاص بالأصناف والبحث عنها بسرعة.
                    </Text>

                    <TouchableOpacity 
                        style={styles.gradientBtnWrapper}
                        onPress={requestPermission}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#FF7043', '#FF5722']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.permissionBtnGradient}
                        >
                            <Text style={styles.permissionBtnLabel}>السماح بالوصول للكاميرا</Text>
                            <Ionicons name="arrow-back" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.secondaryBtn}
                        onPress={onClose}
                    >
                        <Text style={[styles.secondaryBtnText, { color: theme.muted }]}>ربما لاحقاً</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <CameraView
                style={StyleSheet.absoluteFill}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                enableTorch={isFlashOn}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'pdf417'],
                }}
            >
                <View style={styles.overlay}>
                    <View style={styles.unfocusedContainer} />
                    <View style={styles.focusedRow}>
                        <View style={styles.unfocusedContainer} />
                        <View style={styles.focusedContainer}>
                            {/* Corner Accents - Pure CSS/View based for cleanliness */}
                            <View style={[styles.corner, styles.topLeft, { borderColor: '#FF7043' }]} />
                            <View style={[styles.corner, styles.topRight, { borderColor: '#FF7043' }]} />
                            <View style={[styles.corner, styles.bottomLeft, { borderColor: '#FF7043' }]} />
                            <View style={[styles.corner, styles.bottomRight, { borderColor: '#FF7043' }]} />

                            {/* Scanning Line */}
                            {!scanned && (
                                <Animated.View
                                    style={[
                                        styles.scanLine,
                                        { backgroundColor: '#FF7043', transform: [{ translateY: scanLineAnim }] }
                                    ]}
                                />
                            )}

                            {scanned && (
                                <View style={styles.scannedSuccess}>
                                    <View style={[styles.successCircle, { backgroundColor: theme.success }]}>
                                        <Ionicons name="checkmark" size={40} color="#FFFFFF" />
                                    </View>
                                </View>
                            )}
                        </View>
                        <View style={styles.unfocusedContainer} />
                    </View>
                    <View style={styles.unfocusedContainer}>
                        <View style={styles.instructionContainer}>
                            <Text style={styles.scanInstruction}>ضع الباركود داخل الإطار للمسح</Text>
                        </View>
                    </View>
                </View>
            </CameraView>
        );
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Fixed Header */}
                <View style={[styles.header, { 
                    paddingTop: insets.top || 20,
                    backgroundColor: theme.background,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.muted + '20'
                }]}>
                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                        <Ionicons name="close-outline" size={32} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>ماسح الباركود</Text>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => setIsFlashOn(!isFlashOn)}
                    >
                        <Ionicons
                            name={isFlashOn ? "flashlight" : "flashlight-outline"}
                            size={24}
                            color={isFlashOn ? theme.accent : theme.text}
                        />
                    </TouchableOpacity>
                </View>

                <View style={[styles.cameraContainer, { backgroundColor: '#000' }]}>
                    {renderContent()}
                </View>

                {/* Fixed Footer */}
                <View style={[styles.footer, { 
                    paddingBottom: insets.bottom || 20,
                    backgroundColor: theme.background,
                    borderTopWidth: 1,
                    borderTopColor: theme.muted + '20'
                }]}>
                    <Text style={[styles.footerText, { color: theme.muted }]}>جاري البحث عن باركود تلقائيا...</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 110,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 10
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    iconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraContainer: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permissionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    permissionBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    permissionBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    overlay: {
        flex: 1,
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    focusedRow: {
        flexDirection: 'row',
        height: 250, // Matches animation range
    },
    focusedContainer: {
        width: 250,
        backgroundColor: 'transparent',
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 25,
        height: 25,
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderBottomWidth: 0,
        borderRightWidth: 0,
        borderTopLeftRadius: 10,
    },
    topRight: {
        top: 0,
        right: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderTopRightRadius: 10,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomLeftRadius: 10,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderBottomRightRadius: 10,
    },
    scanLine: {
        height: 2,
        width: '100%',
        opacity: 0.8,
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 10,
    },
    instructionContainer: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 20,
    },
    scanInstruction: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },
    footerText: {
        fontSize: 12,
        fontWeight: '600'
    },
    scannedSuccess: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    // New Permission Styles
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative'
    },
    iconBadge: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF'
    },
    permissionTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 12,
        textAlign: 'center'
    },
    permissionDesc: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        paddingHorizontal: 10
    },
    gradientBtnWrapper: {
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#FF7043',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    permissionBtnGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10
    },
    permissionBtnLabel: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        marginTop: 20,
        paddingVertical: 10
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '700',
        textDecorationLine: 'underline'
    }
});
