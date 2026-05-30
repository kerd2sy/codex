import React, { useState, useCallback } from 'react';
import { 
  Modal, Image, StyleSheet, 
  Text, TouchableOpacity, View, Switch
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useProfile } from '../../hooks/useProfile';
import { useSecuritySettings } from '../../hooks/useSecuritySettings';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { useFocusEffect } from 'expo-router';
import { getAvatarUrl } from '@/utils/avatar';
import { BaseScreen } from '../../components/BaseScreen';

interface MenuItem {
    id: string;
    title: string;
    icon: string;
    route?: string;
    onPress?: () => void;
    isTheme?: boolean;
    type?: 'link' | 'switch';
    value?: boolean;
    onValueChange?: (val: boolean) => void;
    secondary?: string;
}

interface MenuGroup {
    id: string;
    items: MenuItem[];
}

export const Profile = () => {
    const router = useRouter();
    const { colorScheme, themeMode, setThemeMode } = useTheme();
    const theme = Colors[colorScheme];
    const { user, logout } = useProfile();
    const { biometricEnabled, loadSettings, toggleBiometric } = useSecuritySettings();

    const [showThemeModal, setShowThemeModal] = useState(false);

    useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

    const MENU_GROUPS: MenuGroup[] = [
        { id: 'g_pharmacy', items: [{ id: 'pharmacy', title: 'الصيدلية', icon: 'business-outline', route: '/(pharmacy)/settings/pharmacy' }] },
        { id: 'g_sec', items: [
            ...(user?.provider === 'google' ? [] : [
                { id: 'pass', title: 'تغيير كلمة المرور', icon: 'key-outline', route: '/(pharmacy)/profile/change-password' },
                { id: 'bio', title: 'البصمة / التعرف على الوجه', icon: 'scan-outline', type: 'switch' as const, value: biometricEnabled, onValueChange: toggleBiometric }
            ]),
        ]},
        { id: 'g3', items: [{ id: 'theme', title: 'المظهر', icon: 'color-palette-outline', isTheme: true }] },
    ];

    return (
        <BaseScreen title="الإعدادات">
            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => router.push('/(pharmacy)/profile/edit' as any)}
                style={[styles.profileBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
                <View style={styles.profileInfo}>
                    <Text style={[styles.profileName, { color: theme.primary }]}>{user?.manager_name || 'اسم المسؤول'}</Text>
                    <Text style={[styles.profileEmail, { color: theme.muted }]}>{user?.email}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: theme.accent + '15' }]}>
                        <Text style={[styles.profileRole, { color: theme.accent }]}>
                            {user?.role === 'admin' ? 'مدير' : user?.role === 'pharmacist' ? 'الصيدلى المسؤول' : 'موظف'}
                        </Text>
                    </View>
                </View>
                <View style={styles.avatarBox}>
                    {getAvatarUrl(user?.avatar_url) ? (
                        <Image source={{ uri: getAvatarUrl(user?.avatar_url)! }} style={styles.avatarImg} />
                    ) : (
                        <LottieView source={require('@/assets/json/Profile.json')} autoPlay={true} loop={false} style={styles.avatarLottie} />
                    )}
                </View>
            </TouchableOpacity>

            {MENU_GROUPS.map((group) => {
                if (group.items.length === 0) return null;
                return (
                    <View key={group.id} style={[styles.menuBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        {group.items.map((item, idx) => (
                            <TouchableOpacity 
                                key={item.id} 
                                style={[styles.menuItem, idx !== group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                                onPress={() => item.isTheme ? setShowThemeModal(true) : item.onPress ? item.onPress() : item.type !== 'switch' && router.push(item.route as any)}
                            >
                                {item.type === 'switch' ? (
                                    <Switch value={item.value} onValueChange={item.onValueChange} trackColor={{ false: theme.border, true: theme.primary + '80' }} thumbColor={item.value ? theme.primary : '#f4f3f4'} />
                                ) : (
                                    <View style={styles.menuItemLeft}>
                                        <Ionicons name="chevron-back" size={18} color={theme.muted} />
                                        {item.secondary && (
                                            <Text style={[styles.badge, { color: item.secondary === 'مفعّل' ? '#4CAF50' : theme.muted }]}>{item.secondary}</Text>
                                        )}
                                    </View>
                                )}
                                <View style={styles.menuItemRight}>
                                    <View style={[styles.iconBox, { backgroundColor: theme.card }]}>
                                        <Ionicons name={item.icon as any} size={20} color={theme.accent} />
                                    </View>
                                    <Text style={[styles.menuText, { color: theme.text }]}>{item.title}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            })}

            <TouchableOpacity style={[styles.logoutBox, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={logout}>
                <Ionicons name="chevron-back" size={18} color={theme.muted} />
                <View style={styles.menuItemRight}>
                    <View style={[styles.iconBox, { backgroundColor: '#FF4B5515' }]}>
                        <Ionicons name="log-out-outline" size={20} color="#FF4B55" />
                    </View>
                    <Text style={styles.logoutText}>تسجيل الخروج</Text>
                </View>
            </TouchableOpacity>

            <Modal visible={showThemeModal} transparent animationType="slide">
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowThemeModal(false)}>
                    <View style={[styles.modal, { backgroundColor: theme.surface }]}>
                        <View style={styles.handle} />
                        {['light', 'dark', 'auto'].map((m) => (
                            <TouchableOpacity key={m} style={styles.themeRow} onPress={() => setThemeMode(m as any)}>
                                <Text style={[styles.themeLabel, { color: themeMode === m ? theme.primary : theme.text }]}>
                                    {m === 'light' ? 'المظهر الفاتح' : m === 'dark' ? 'المظهر الداكن' : 'تلقائي'}
                                </Text>
                                <View style={[styles.check, { borderColor: themeMode === m ? theme.accent : theme.border, backgroundColor: themeMode === m ? theme.accent : 'transparent' }]}>
                                    {themeMode === m && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    profileBox: { 
        flexDirection: 'row-reverse', 
        paddingVertical: 28, 
        paddingHorizontal: 20, 
        borderRadius: 32, 
        borderWidth: 1, 
        alignItems: 'center', 
        marginBottom: 25, 
        elevation: 10, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 20 
    },
    profileInfo: { flex: 1, alignItems: 'flex-end', marginLeft: 15 },
    profileName: { fontSize: 20, fontWeight: '900', textAlign: 'right', letterSpacing: -0.5 },
    profileEmail: { fontSize: 13, fontWeight: '600', textAlign: 'right', marginTop: 2, opacity: 0.6 },
    roleBadge: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, alignSelf: 'flex-end' },
    profileRole: { fontSize: 12, fontWeight: '900', textAlign: 'right' },
    avatarBox: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
    avatarLottie: { width: 90, height: 90 },
    avatarImg: { width: 80, height: 80, borderRadius: 25 },
    menuBox: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 15, marginBottom: 15 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    badge: { fontSize: 12, fontWeight: '700' },
    menuItemRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
    iconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    menuText: { fontSize: 16, fontWeight: '600' },
    logoutBox: { flexDirection: 'row', padding: 15, borderRadius: 20, borderWidth: 1, justifyContent: 'space-between', alignItems: 'center' },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#FF4B55' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 25 },
    handle: { width: 50, height: 5, borderRadius: 3, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 20 },
    themeRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
    themeLabel: { fontSize: 16, fontWeight: '800' },
    check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});

