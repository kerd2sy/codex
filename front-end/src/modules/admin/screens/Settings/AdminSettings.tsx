import React, { useState, useCallback } from 'react';
import { 
  ScrollView, StyleSheet, Text, 
  TouchableOpacity, View, Switch, Image, ActivityIndicator
} from 'react-native';

import { useRouter } from '@/hooks/useRouter';
import { useRoleGuard } from '@/shared/guards/useRoleGuard';

import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useProfile } from '../../../pharmacy/hooks/useProfile';
import { useSecuritySettings } from '../../../pharmacy/hooks/useSecuritySettings';
import { getAvatarUrl } from '@/utils/avatar';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/constants/HeaderConstants';
import { storage } from '@/utils/storage';
import { useFocusEffect } from 'expo-router';

export const AdminSettings = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme, setThemeMode, themeMode } = useTheme();
    const theme = Colors[colorScheme];
    const { loading, authorized } = useRoleGuard('admin');
    const { user, logout } = useProfile();

    const { 
        biometricEnabled, loadSettings, toggleBiometric 
    } = useSecuritySettings();

    useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

    const MENU_GROUPS = [
        {
            id: 'account',
            title: 'الحساب والأمان',
            items: [
                { 
                    id: 'pass', 
                    title: 'تغيير كلمة المرور', 
                    icon: 'key-outline', 
                    onPress: () => router.push('/(pharmacy)/change-password' as any) 
                },
                { 
                    id: 'bio', 
                    title: 'البصمة / التعرف على الوجه', 
                    icon: 'scan-outline', 
                    type: 'switch', 
                    value: biometricEnabled, 
                    onValueChange: toggleBiometric 
                },
            ]
        },
        {
            id: 'appearance',
            title: 'المظهر والنظام',
            items: [
                { 
                    id: 'theme', 
                    title: 'تبديل المظهر', 
                    icon: 'color-palette-outline', 
                    secondary: themeMode === 'dark' ? 'داكن' : themeMode === 'light' ? 'فاتح' : 'تلقائي',
                    onPress: () => setThemeMode(themeMode === 'light' ? 'dark' : 'light') 
                },
            ]
        }
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {loading ? (
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : !authorized ? null : (
                <>
                    <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>

                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Ionicons name="chevron-forward" size={24} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.title, { color: theme.primary }]}>إعدادات النظام</Text>
                        <View style={[styles.titleLine, { backgroundColor: '#FF7E47' }]} />
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
                <View style={[styles.profileBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.avatarContainer}>
                        {getAvatarUrl(user?.avatar_url) ? (
                            <Image source={{ uri: getAvatarUrl(user?.avatar_url)! }} style={styles.avatarImg} />
                        ) : (
                            <LottieView source={require('@/assets/json/Profile.json')} autoPlay loop={false} style={styles.avatarLottie} />
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: theme.text }]}>{user?.manager_name || 'المدير العام'}</Text>
                        <Text style={[styles.profileEmail, { color: theme.muted }]}>{user?.email}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
                            <Text style={[styles.roleText, { color: theme.primary }]}>مسؤول النظام</Text>
                        </View>
                    </View>
                </View>

                {MENU_GROUPS.map((group) => (
                    <View key={group.id} style={styles.groupContainer}>
                        <Text style={[styles.groupTitle, { color: theme.muted }]}>{group.title}</Text>
                        <View style={[styles.menuBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            {group.items.map((item: any, idx) => (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={[styles.menuItem, idx !== group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                                    onPress={item.type !== 'switch' ? item.onPress : undefined}
                                    disabled={item.type === 'switch'}
                                >
                                    {item.type === 'switch' ? (
                                        <Switch 
                                            value={item.value} 
                                            onValueChange={item.onValueChange} 
                                            trackColor={{ false: theme.border, true: theme.primary + '80' }} 
                                            thumbColor={item.value ? theme.primary : '#f4f3f4'} 
                                        />
                                    ) : (
                                        <View style={styles.menuItemLeft}>
                                            <Ionicons name="chevron-back" size={18} color={theme.muted} />
                                            {item.secondary && (
                                                <Text style={[styles.secondaryText, { color: theme.primary }]}>{item.secondary}</Text>
                                            )}
                                        </View>
                                    )}
                                    <View style={styles.menuItemRight}>
                                        <View style={[styles.iconBox, { backgroundColor: theme.accent + '10' }]}>
                                            <Ionicons name={item.icon as any} size={20} color={theme.accent} />
                                        </View>
                                        <Text style={[styles.menuText, { color: theme.text }]}>{item.title}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={logout}>
                    <Ionicons name="chevron-back" size={18} color="#FF4B55" />
                    <View style={styles.menuItemRight}>
                        <View style={[styles.iconBox, { backgroundColor: '#FF4B5515' }]}>
                            <Ionicons name="log-out-outline" size={20} color="#FF4B55" />
                        </View>
                        <Text style={[styles.logoutText, { color: '#FF4B55' }]}>تسجيل الخروج</Text>
                    </View>
                </TouchableOpacity>
                </ScrollView>
            </>
            )}
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
    avatarContainer: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', backgroundColor: '#F3F4F6' },
    avatarImg: { width: '100%', height: '100%' },
    avatarLottie: { width: 80, height: 80 },
    profileInfo: { flex: 1, alignItems: 'flex-end', marginRight: 20 },
    profileName: { fontSize: 20, fontWeight: '900' },
    profileEmail: { fontSize: 13, marginTop: 4, opacity: 0.7 },
    roleBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    roleText: { fontSize: 12, fontWeight: '800' },
    groupContainer: { marginBottom: 25 },
    groupTitle: { fontSize: 13, fontWeight: '800', marginRight: 15, marginBottom: 10, textAlign: 'right' },
    menuBox: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 16 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    secondaryText: { fontSize: 13, fontWeight: '700' },
    menuItemRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    menuText: { fontSize: 16, fontWeight: '700' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 24, borderWidth: 1, marginTop: 10 },
    logoutText: { fontSize: 16, fontWeight: '800' }
});

