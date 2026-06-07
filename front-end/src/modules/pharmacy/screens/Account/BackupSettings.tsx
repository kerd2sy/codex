import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { GoogleDriveService } from '../../utils/GoogleDriveService';
import { StatusModal } from '../../../../ui/shared/StatusModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/constants/HeaderConstants';

export const BackupSettings = () => {
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<any>({ visible: false, type: 'success', title: '', message: '' });
    const [isSignedIn, setIsSignedIn] = useState(false);

    const handleSignIn = async () => {
        setLoading(true);
        try {
            await GoogleDriveService.signIn();
            setIsSignedIn(true);
            setStatus({ visible: true, type: 'success', title: 'تم الربط بنجاح', message: 'تم ربط حساب Google بنجاح.' });
        } catch (e: any) {
            setStatus({ visible: true, type: 'error', title: 'خطأ', message: e.message || 'فشل تسجيل الدخول' });
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = async () => {
        setLoading(true);
        try {
            await GoogleDriveService.backupDatabase();
            setStatus({ visible: true, type: 'success', title: 'تم النسخ بنجاح', message: 'تم رفع قاعدة البيانات إلى Google Drive' });
        } catch (e: any) {
            if (e.message.includes('token')) {
                // Try sign in
                await handleSignIn();
            } else {
                setStatus({ visible: true, type: 'error', title: 'فشل النسخ', message: e.message || 'حدث خطأ أثناء الرفع' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            await GoogleDriveService.restoreDatabase();
            setStatus({ visible: true, type: 'success', title: 'تم الاستعادة بنجاح', message: 'تم استعادة قاعدة البيانات من Google Drive' });
        } catch (e: any) {
            if (e.message.includes('token')) {
                await handleSignIn();
            } else {
                setStatus({ visible: true, type: 'error', title: 'فشل الاستعادة', message: e.message || 'حدث خطأ أثناء الاستعادة' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.title, { color: theme.primary }]}>النسخ الاحتياطي سحابياً</Text>
                        <View style={[styles.titleLine, { backgroundColor: '#4CAF50' }]} />
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={[styles.description, { color: theme.text }]}>
                    يمكنك الاحتفاظ بنسخة احتياطية لجميع فواتيرك محلياً ورفعها إلى Google Drive لضمان عدم ضياعها واستعادتها في أي وقت حتى بدون إنترنت.
                </Text>

                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: '#4285F4' }]} 
                    onPress={handleSignIn}
                    disabled={loading}
                >
                    <Ionicons name="logo-google" size={20} color="#FFF" />
                    <Text style={styles.buttonText}>{isSignedIn ? 'حساب Google مربوط' : 'ربط حساب Google'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: '#4CAF50', opacity: loading ? 0.7 : 1 }]} 
                    onPress={handleBackup}
                    disabled={loading}
                >
                    <Ionicons name="cloud-upload" size={20} color="#FFF" />
                    <Text style={styles.buttonText}>إنشاء نسخة احتياطية الآن</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: '#FF9800', opacity: loading ? 0.7 : 1 }]} 
                    onPress={handleRestore}
                    disabled={loading}
                >
                    <Ionicons name="cloud-download" size={20} color="#FFF" />
                    <Text style={styles.buttonText}>استعادة النسخة الاحتياطية</Text>
                </TouchableOpacity>

                {loading && <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />}
            </View>

            <StatusModal
                visible={status.visible}
                type={status.type}
                title={status.title}
                message={status.message}
                onConfirm={() => setStatus({ ...status, visible: false })}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 24 },
    headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
    headerTitleContainer: { alignItems: 'flex-end', flex: 1 },
    title: { fontSize: 18, fontWeight: '900' },
    titleLine: { width: 25, height: 4, borderRadius: 2, marginTop: -2 },
    backBtn: { padding: 4, marginLeft: -4 },
    content: { padding: 24, gap: 16 },
    description: { fontSize: 15, textAlign: 'right', marginBottom: 20, lineHeight: 24 },
    button: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 12 },
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
