import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSecuritySettings } from '../../hooks/useSecuritySettings';
import { useFocusEffect, useSegments } from 'expo-router';
import { storage } from '@/shared/utils/storage';
import { SharedSettingsHub, SettingsMenuGroup } from '@/ui/shared/SharedSettingsHub';
import { useProfile } from '../../hooks/useProfile';

export const AccountSettingsHub = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const { 
        user, biometricEnabled, loadSettings, toggleBiometric 
    } = useSecuritySettings();
    const { logout } = useProfile();

    const [status, setStatus] = useState<any>({ visible: false, type: 'success', title: '', message: '' });

    useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

    const onToggleBio = async (val: boolean) => {
        const res = await toggleBiometric(val);
        if (res.success) setStatus({ visible: true, type: 'success', title: 'تم التحديث', message: res.success });
        else if (res.error) setStatus({ visible: true, type: 'error', title: 'تنبيه', message: res.error });
    };

    const segments = useSegments();
    const currentModule = segments[0] as string || '(pharmacy)';

    const hasRole = (role: string) => {
        if (!user) return false;
        if (user.roles) {
            return user.roles.some((r: any) => 
                typeof r === 'string' ? r === role : r.name === role
            );
        }
        return user.role === role;
    };

    const MENU_GROUPS: SettingsMenuGroup[] = [
        {
            id: 'account',
            title: 'الحساب والملف الشخصي',
            items: [
                { id: 'profile', title: 'بيانات الحساب', icon: 'person-outline', color: '#2196F3', route: `/${currentModule}/profile/edit` },
                ...((hasRole('admin') || hasRole('pharmacist') || currentModule === '(pharmacy)') ? [
                    { id: 'pharmacy', title: 'إعدادات الصيدلية', icon: 'business-outline', color: '#FF7E47', route: `/${currentModule}/pharmacy-settings` }
                ] : []),
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
                { id: 'password', title: 'تغيير كلمة المرور', icon: 'key-outline', color: '#607D8B', route: `/${currentModule}/profile/change-password` },
                // { id: 'backup', title: 'النسخ الاحتياطي السحابي', icon: 'cloud-upload-outline', color: '#9C27B0', route: `/${currentModule}/backup` },
            ]
        },
    ];

    // Check employee job title
    const empRole = user?.employee_role || '';
    const isGomlaWorker = empRole === 'gomla' || empRole === 'gomla_prep';
    const isEmployee = hasRole('employee') || !!empRole;

    const renderTopWidgets = () => (
        <View>
            {currentModule !== '(pharmacy)' && (hasRole('admin') || hasRole('pharmacist')) && (
                <TouchableOpacity 
                    style={{
                        marginBottom: 15,
                        backgroundColor: '#2196F315',
                        padding: 16,
                        borderRadius: 16,
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: '#2196F330'
                    }}
                    onPress={async () => {
                        await storage.setItem('@last_guard', 'pharmacist');
                        router.replace('/(pharmacy)' as any);
                    }}
                >
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                        <View style={{ backgroundColor: '#2196F3', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="medical-outline" size={20} color="#FFF" />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>قسم الصيدلية</Text>
                            <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>إدارة المبيعات والعملاء</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-back" size={20} color="#2196F3" />
                </TouchableOpacity>
            )}

            {/* كارت لوحة الجملة — يظهر لموظفي الجملة (gomla/gomla_prep) أو الأدمن */}
            {currentModule !== '(gomla)' && (hasRole('admin') || isGomlaWorker) && (
                <TouchableOpacity 
                    style={{
                        marginBottom: 15,
                        backgroundColor: theme.primary + '15',
                        padding: 16,
                        borderRadius: 16,
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: theme.primary + '30'
                    }}
                    onPress={async () => {
                        await storage.setItem('@last_guard', 'gomla');
                        router.replace('/(gomla)/dashboard' as any);
                    }}
                >
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                        <View style={{ backgroundColor: theme.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="cube-outline" size={20} color="#FFF" />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>لوحة تحضير الجملة</Text>
                            <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>إدارة الفواتير والتشغيلات</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-back" size={20} color={theme.primary} />
                </TouchableOpacity>
            )}

            {currentModule !== '(admin)' && hasRole('admin') && (
                <TouchableOpacity 
                    style={{
                        marginBottom: 25,
                        backgroundColor: '#4CAF5015',
                        padding: 16,
                        borderRadius: 16,
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: '#4CAF5030'
                    }}
                    onPress={async () => {
                        await storage.setItem('@last_guard', 'admin');
                        router.replace('/(admin)/dashboard' as any);
                    }}
                >
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                        <View style={{ backgroundColor: '#4CAF50', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#FFF" />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>لوحة تحكم الإدارة</Text>
                            <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>إدارة النظام والتقارير</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-back" size={20} color="#4CAF50" />
                </TouchableOpacity>
            )}

            {/* كارت لوحة الموظفين — يظهر للأدمن والموظفين بكل أنواعهم */}
            {currentModule !== '(employee)' && (hasRole('admin') || isEmployee) && (
                <TouchableOpacity 
                    style={{
                        marginBottom: 25,
                        backgroundColor: '#FF572215',
                        padding: 16,
                        borderRadius: 16,
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: '#FF572230'
                    }}
                    onPress={async () => {
                        await storage.setItem('@last_guard', 'employee');
                        router.replace('/(employee)/dashboard' as any);
                    }}
                >
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                        <View style={{ backgroundColor: '#FF5722', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="people-outline" size={20} color="#FFF" />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>لوحة الموظفين</Text>
                            <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>إدارة المهام والحضور</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-back" size={20} color="#FF5722" />
                </TouchableOpacity>
            )}


        </View>
    );

    return (
        <SharedSettingsHub 
            headerTitle="إعدادات الحساب"
            headerAccentColor="#FF7E47"
            user={user}
            menuGroups={MENU_GROUPS}
            versionText="تبارك فارما - الإصدار 1.0.0"
            renderTopWidgets={renderTopWidgets}
            showProfileCard={false}
            statusModal={{
                ...status,
                onClose: () => setStatus({ ...status, visible: false })
            }}
            onLogout={logout}
        />
    );
};
