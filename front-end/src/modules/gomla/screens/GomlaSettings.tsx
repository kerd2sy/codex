import React from 'react';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { storage } from '@/shared/utils/storage';
import { SharedSettingsHub, SettingsMenuGroup } from '@/ui/shared/SharedSettingsHub';
import { useProfile } from '@/modules/pharmacy/hooks/useProfile';

export const GomlaSettings = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { logout } = useProfile();
    const [currentUser, setCurrentUser] = React.useState<any>(null);

    React.useEffect(() => {
        storage.getItem('user').then(userJson => {
            if (userJson) {
                setCurrentUser(JSON.parse(userJson));
            }
        });
    }, []);

    const MENU_GROUPS: SettingsMenuGroup[] = [
        {
            id: 'general',
            title: 'إعدادات عامة',
            items: [
                currentUser?.role !== 'gomla' ? { 
                    id: 'return_pharmacy', 
                    title: 'العودة للصيدلية', 
                    icon: 'home-outline', 
                    color: theme.primary, 
                    onPress: async () => {
                        await storage.setItem('@last_guard', 'pharmacist');
                        router.replace('/(pharmacy)');
                    }
                } : null,
            ]
        }
    ];

    return (
        <SharedSettingsHub 
            headerTitle="إعدادات الجملة"
            headerAccentColor="#FF7E47"
            user={currentUser}
            menuGroups={MENU_GROUPS}
            versionText="تبارك فارما (الجملة) - الإصدار 1.0.0"
            showProfileCard={false}
            onLogout={logout}
        />
    );
};
