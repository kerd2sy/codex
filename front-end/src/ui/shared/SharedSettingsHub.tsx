import React from 'react';
import { 
  ScrollView, StyleSheet, Text, 
  TouchableOpacity, View, Switch, Image, ActivityIndicator
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { getAvatarUrl } from '@/utils/avatar';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/constants/HeaderConstants';
import { emitForceLogout } from '@/shared/guards/auth-events';
import { StatusModal } from './StatusModal';

export interface SettingsMenuItem {
    id: string;
    title: string;
    icon: string;
    color?: string;
    type?: 'switch';
    value?: boolean;
    onValueChange?: (val: boolean) => void;
    route?: string;
    onPress?: () => void;
    secondary?: string;
}

export interface SettingsMenuGroup {
    id: string;
    title: string;
    items: (SettingsMenuItem | null | undefined)[];
}

export interface SharedSettingsHubProps {
    headerTitle: string;
    headerAccentColor?: string;
    user?: any;
    loading?: boolean;
    menuGroups: SettingsMenuGroup[];
    versionText: string;
    renderTopWidgets?: () => React.ReactNode;
    showProfileCard?: boolean;
    roleBadgeText?: string;
    onLogout?: () => void;
    statusModal?: {
        visible: boolean;
        type: 'success' | 'error' | 'warning';
        title: string;
        message: string;
        onClose: () => void;
    };
}

export const SharedSettingsHub: React.FC<SharedSettingsHubProps> = ({
    headerTitle,
    headerAccentColor = '#FF7E47',
    user,
    loading = false,
    menuGroups,
    versionText,
    renderTopWidgets,
    showProfileCard = false,
    roleBadgeText,
    onLogout,
    statusModal
}) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    const handleLogout = () => {
        if (onLogout) onLogout();
        else emitForceLogout();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {loading ? (
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <>
                    <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
                        <View style={styles.headerRight}>
                            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
                                <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                            </TouchableOpacity>
                            <View style={styles.headerTitleContainer}>
                                <Text style={[styles.title, { color: theme.primary }]}>{headerTitle}</Text>
                                <View style={[styles.titleLine, { backgroundColor: headerAccentColor }]} />
                            </View>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
                        {renderTopWidgets && renderTopWidgets()}

                        {showProfileCard && user && (
                            <View style={[styles.profileBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <View style={styles.avatarContainer}>
                                    {getAvatarUrl(user?.avatar_url) ? (
                                        <Image source={{ uri: getAvatarUrl(user?.avatar_url)! }} style={styles.avatarImg} />
                                    ) : (
                                        <LottieView source={require('@/assets/json/Profile.json')} autoPlay loop={false} style={styles.avatarLottie} />
                                    )}
                                </View>
                                <View style={styles.profileInfo}>
                                    <Text style={[styles.profileName, { color: theme.text }]}>{user?.manager_name || 'المستخدم'}</Text>
                                    <Text style={[styles.profileEmail, { color: theme.muted }]}>{user?.email}</Text>
                                    {roleBadgeText && (
                                        <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
                                            <Text style={[styles.roleText, { color: theme.primary }]}>{roleBadgeText}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {menuGroups.map((group) => {
                            const validItems = group.items.filter(Boolean) as SettingsMenuItem[];
                            if (validItems.length === 0) return null;

                            return (
                                <View key={group.id} style={styles.groupContainer}>
                                    <Text style={[styles.groupTitle, { color: theme.muted }]}>{group.title}</Text>
                                    <View style={[styles.menuBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                        {validItems.map((item, idx) => {
                                            const itemColor = item.color || theme.primary;
                                            return (
                                                <TouchableOpacity 
                                                    key={item.id} 
                                                    style={[styles.menuItem, idx !== validItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                                                    onPress={item.type !== 'switch' ? (item.onPress ? item.onPress : () => item.route && router.push(item.route as any)) : undefined}
                                                    disabled={item.type === 'switch'}
                                                    activeOpacity={0.7}
                                                >
                                                    {item.type === 'switch' ? (
                                                        <Switch 
                                                            value={item.value} 
                                                            onValueChange={item.onValueChange} 
                                                            trackColor={{ false: theme.border, true: itemColor + '80' }} 
                                                            thumbColor={item.value ? itemColor : '#f4f3f4'} 
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
                                                        <View style={[styles.iconBox, { backgroundColor: itemColor + '15' }]}>
                                                            <Ionicons name={item.icon as any} size={20} color={itemColor} />
                                                        </View>
                                                        <Text style={[styles.menuText, { color: theme.text }]}>{item.title}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}

                        <TouchableOpacity 
                            style={[styles.logoutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                            onPress={handleLogout}
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
                            <Text style={[styles.versionText, { color: theme.muted }]}>{versionText}</Text>
                        </View>
                    </ScrollView>
                </>
            )}

            {statusModal && (
                <StatusModal
                    visible={statusModal.visible}
                    type={statusModal.type}
                    title={statusModal.title}
                    message={statusModal.message}
                    onConfirm={statusModal.onClose}
                />
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
    backBtn: { padding: 4, marginLeft: -4 },
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
    logoutText: { fontSize: 16, fontWeight: '800' },
    footer: { marginTop: 30, alignItems: 'center' },
    versionText: { fontSize: 12, fontWeight: '700', opacity: 0.4 }
});
