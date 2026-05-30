import React, { useState, useCallback } from 'react';
import { 
  ScrollView, StyleSheet, Text, 
  TouchableOpacity, View, Switch, Image, ActivityIndicator, Platform
} from 'react-native';

import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useSecuritySettings } from '../../hooks/useSecuritySettings';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/constants/HeaderConstants';
import { useFocusEffect } from 'expo-router';
import { emitForceLogout } from '@/shared/guards/auth-events';
import { StatusModal } from '../../../../ui/shared/StatusModal';

export const AccountSettingsHub = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const { 
        user, biometricEnabled, loadSettings, toggleBiometric 
    } = useSecuritySettings();

    const [status, setStatus] = useState<any>({ visible: false, type: 'success', title: '', message: '' });

    useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

    const onToggleBio = async (val: boolean) => {
        const res = await toggleBiometric(val);
        if (res.success) setStatus({ visible: true, type: 'success', title: 'تم التحديث', message: res.success });
        else if (res.error) setStatus({ visible: true, type: 'error', title: 'تنبيه', message: res.error });
    };

    const MENU_GROUPS = [
        {
            id: 'account',
            title: 'الحساب والملف الشخصي',
            items: [
                { id: 'profile', title: 'بيانات الحساب', icon: 'person-outline', color: '#2196F3', route: '/(pharmacy)/profile/edit' },
                { id: 'pharmacy', title: 'إعدادات الصيدلية', icon: 'business-outline', color: '#FF7E47', route: '/(pharmacy)/pharmacy-settings' },
            ]
        },
        {
            id: 'security',
            title: 'الأمان والوصول السريع',
            items: [
                { 
                    id: 'bio', 
                    title: 'البصمة / التعرف على الوجه', 
                    icon: 'scan-outline', 
                    color: '#4CAF50', 
                    type: 'switch', 
                    value: biometricEnabled, 
                    onValueChange: onToggleBio 
                },
                { id: 'password', title: 'تغيير كلمة المرور', icon: 'key-outline', color: '#607D8B', route: '/(pharmacy)/profile/change-password' },
            ]
        }
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header Exactly like Admin */}
            <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Ionicons name="chevron-forward" size={24} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.title, { color: theme.primary }]}>إعدادات الحساب</Text>
                        <View style={[styles.titleLine, { backgroundColor: '#FF7E47' }]} />
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
                {MENU_GROUPS.map((group) => (
                    <View key={group.id} style={styles.groupContainer}>
                        <Text style={[styles.groupTitle, { color: theme.muted }]}>{group.title}</Text>
                        <View style={[styles.menuBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            {group.items.map((item: any, idx) => (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={[styles.menuItem, idx !== group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                                    onPress={item.type !== 'switch' ? () => router.push(item.route as any) : undefined}
                                    disabled={item.type === 'switch'}
                                    activeOpacity={0.7}
                                >
                                    {item.type === 'switch' ? (
                                        <Switch 
                                            value={item.value} 
                                            onValueChange={item.onValueChange} 
                                            trackColor={{ false: theme.border, true: item.color + '80' }} 
                                            thumbColor={item.value ? item.color : '#f4f3f4'} 
                                        />
                                    ) : (
                                        <View style={styles.menuItemLeft}>
                                            <Ionicons name="chevron-back" size={18} color={theme.muted} />
                                        </View>
                                    )}
                                    <View style={styles.menuItemRight}>
                                        <View style={[styles.iconBox, { backgroundColor: item.color + '10' }]}>
                                            <Ionicons name={item.icon as any} size={20} color={item.color} />
                                        </View>
                                        <Text style={[styles.menuText, { color: theme.text }]}>{item.title}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <TouchableOpacity 
                    style={[styles.logoutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                    onPress={() => emitForceLogout()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={18} color="#FF4B55" />
                    <View style={styles.menuItemRight}>
                        <View style={[styles.iconBox, { backgroundColor: '#FF4B5515' }]}>
                            <Ionicons name="log-out-outline" size={20} color="#FF4B55" />
                        </View>
                        <Text style={[styles.logoutText, { color: '#FF4B55' }]}>تسجيل الخروج</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.versionText, { color: theme.muted }]}>تبارك فارما - الإصدار 2.4.0</Text>
                </View>
            </ScrollView>

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
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    content: { padding: 20 },
    profileBox: { 
        padding: 24, 
        borderRadius: 24, 
        borderWidth: 1, 
        alignItems: 'center', 
        marginBottom: 30,
        flexDirection: 'row-reverse'
    },
    avatarContainer: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    avatarImg: { width: '100%', height: '100%' },
    avatarLottie: { width: 80, height: 80 },
    profileInfo: { flex: 1, alignItems: 'flex-end', marginRight: 20 },
    profileName: { fontSize: 20, fontWeight: '900' },
    profileEmail: { fontSize: 13, marginTop: 4, opacity: 0.7 },
    groupContainer: { marginBottom: 25 },
    groupTitle: { fontSize: 13, fontWeight: '800', marginRight: 15, marginBottom: 10, textAlign: 'right' },
    menuBox: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 16 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    menuItemRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    menuText: { fontSize: 16, fontWeight: '700' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 24, borderWidth: 1, marginTop: 10 },
    logoutText: { fontSize: 16, fontWeight: '800' },
    footer: { marginTop: 30, alignItems: 'center' },
    versionText: { fontSize: 12, fontWeight: '700', opacity: 0.4 }
});
