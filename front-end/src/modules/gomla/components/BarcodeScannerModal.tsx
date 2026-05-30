import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Colors } from '../../../core/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface BarcodeScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ visible, onClose, onScan }) => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        if (visible) {
            setScanned(false);
            getBarCodeScannerPermissions();
        }
    }, [visible]);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        onScan(data);
    };

    if (hasPermission === null && visible) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            </Modal>
        );
    }

    if (hasPermission === false && visible) {
        return (
            <Modal visible={visible} transparent animationType="slide">
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    <Text style={{ color: theme.text }}>No access to camera</Text>
                    <TouchableOpacity onPress={onClose} style={[styles.button, { backgroundColor: theme.primary }]}>
                        <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.header, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>مسح الباركود</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {visible && (
                    <CameraView
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr", "ean13", "ean8", "upc_e", "upc_a", "code128", "code39"],
                        }}
                        style={styles.camera}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.scanFrame} />
                        </View>
                    </CameraView>
                )}

                {scanned && (
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: theme.primary }]} 
                            onPress={() => setScanned(false)}
                        >
                            <Text style={styles.buttonText}>إعادة المسح</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeBtn: {
        position: 'absolute',
        right: 20,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#00FF00',
        backgroundColor: 'transparent',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
