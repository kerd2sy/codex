import React, { useCallback } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { useRoleGuard } from '@/shared/guards/useRoleGuard';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/modules/pharmacy/hooks/useProfile';
import { useSecuritySettings } from '../../../pharmacy/hooks/useSecuritySettings';
import { useFocusEffect } from 'expo-router';
import { SharedSettingsHub, SettingsMenuGroup } from '@/ui/shared/SharedSettingsHub';

export const AdminSettings = () => {
    const router = useRouter();
    const { themeMode, setThemeMode } = useTheme();
    const { loading, authorized } = useRoleGuard('admin');
    const { user, logout } = useProfile();

    const { 
        biometricEnabled, loadSettings, toggleBiometric 
    } = useSecuritySettings();

    useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

    const MENU_GROUPS: SettingsMenuGroup[] = [
        {
            id: 'account',
            title: 'الحساب والأمان',
            items: [
                { 
                    id: 'pass', 
                    title: 'تغيير كلمة المرور', 
                    icon: 'key-outline', 
                    onPress: () => router.push('/(pharmacy)/profile/change-password' as any) 
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

    if (!authorized) return null;

    return (
        <SharedSettingsHub 
            headerTitle="إعدادات النظام"
            headerAccentColor="#FF7E47"
            user={user}
            loading={loading}
            menuGroups={MENU_GROUPS}
            versionText="تبارك فارما - الإصدار 2.4.0 (الإدارة)"
            showProfileCard={true}
            roleBadgeText="مدير النظام (Admin)"
            onLogout={logout}
        />
    );
};
