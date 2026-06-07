import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useAppUpdates } from '@/shared/hooks/useAppUpdates';
import { useTheme } from '@/shared/app-context/ThemeContext';

export const AppUpdatesScreen = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const { isUpdating, isFetchComplete, runUpdate, applyUpdate } = useAppUpdates();
    const isDark = colorScheme === 'dark';

    const colors = {
        background: isDark ? '#121212' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#A0A0A0' : '#666666',
        primary: '#FF7E47',
        primaryLight: isDark ? '#FF7E4720' : '#FF7E4710',
        border: isDark ? '#333333' : '#EEEEEE',
        card: isDark ? '#1E1E1E' : '#F8F9FA'
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.text }]}>تحديث التطبيق</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="cloud-download-outline" size={64} color={colors.primary} />
                </View>

                {isFetchComplete ? (
                    <View style={styles.statusContainer}>
                        <Text style={[styles.statusTitle, { color: colors.text }]}>تم تنزيل التحديث بنجاح</Text>
                        <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
                            يرجى إعادة تشغيل التطبيق لتطبيق التحديثات الجديدة والاستفادة من أحدث الميزات والإصلاحات.
                        </Text>
                        
                        <Pressable 
                            style={[styles.actionButton, { backgroundColor: colors.primary }]}
                            onPress={applyUpdate}
                        >
                            <Text style={styles.actionButtonText}>إعادة تشغيل التطبيق</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.statusContainer}>
                        <Text style={[styles.statusTitle, { color: colors.text }]}>
                            {isUpdating ? 'جاري تنزيل التحديث...' : 'تحديث جديد متاح!'}
                        </Text>
                        <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
                            {isUpdating 
                                ? 'يرجى الانتظار بينما نقوم بتنزيل التحديثات. قد يستغرق هذا بضع ثوانٍ.'
                                : 'هناك إصدار جديد من التطبيق متاح الآن. يرجى التحديث للحصول على أفضل تجربة.'}
                        </Text>

                        <Pressable 
                            style={[
                                styles.actionButton, 
                                { backgroundColor: isUpdating ? colors.border : colors.primary }
                            ]}
                            onPress={runUpdate}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color={colors.primary} size="small" />
                            ) : (
                                <>
                                    <Ionicons name="download-outline" size={20} color="#FFF" />
                                    <Text style={styles.actionButtonText}>تنزيل التحديث</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 5,
        transform: [{ scaleX: -1 }] // Flip icon for RTL if needed, or use chevron-forward
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 34,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    statusContainer: {
        alignItems: 'center',
        width: '100%',
    },
    statusTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    statusDesc: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    actionButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '100%',
        gap: 10,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
