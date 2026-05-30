import React from 'react';
import { 
    View, StyleSheet, Text, TouchableOpacity, 
    ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusModal } from '../../../ui/shared/StatusModal';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/constants/HeaderConstants';

interface BaseScreenProps {
    title: string;
    children: React.ReactNode;
    headerAction?: React.ReactNode;
    scrollable?: boolean;
    status?: {
        visible: boolean;
        type: 'success' | 'error' | 'warning' | 'info' | 'location';
        title?: string;
        message: string;
        onConfirm?: () => void;
        onCancel?: () => void;
    };
    onBack?: () => void;
    style?: any;
    contentContainerStyle?: any;
}

export const BaseScreen = ({
    title,
    children,
    headerAction,
    scrollable = true,
    status,
    onBack,
    style,
    contentContainerStyle
}: BaseScreenProps) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    const ContentWrapper = scrollable ? ScrollView : View;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }, style]}>
            {/* Header */}
            <View style={[
                styles.header, 
                { 
                    paddingTop: insets.top + HEADER_TOP_GAP, 
                    height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border + '20'
                }
            ]}>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.iconBtn}>
                        <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.title, { color: theme.primary }]}>{title}</Text>
                        <View style={[styles.titleLine, { backgroundColor: theme.accent || '#FF7E47' }]} />
                    </View>
                </View>
                {headerAction && <View style={styles.headerLeft}>{headerAction}</View>}
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ContentWrapper 
                    style={{ flex: 1 }}
                    contentContainerStyle={[
                        scrollable && styles.scrollContent,
                        scrollable && { paddingBottom: insets.bottom + 40 },
                        contentContainerStyle
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {children}
                </ContentWrapper>
            </KeyboardAvoidingView>

            {status && (
                <StatusModal
                    visible={status.visible}
                    type={status.type}
                    title={status.title || (status.type === 'success' ? 'تم بنجاح' : 'تنبيه')}
                    message={status.message}
                    onConfirm={status.onConfirm || (() => {})}
                    onCancel={status.onCancel}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        paddingHorizontal: 24, 
        justifyContent: 'space-between',
        zIndex: 10
    },
    headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
    headerLeft: { flexDirection: 'row-reverse', alignItems: 'center' },
    headerTitleContainer: { alignItems: 'flex-end', flex: 1 },
    title: { fontSize: 18, fontWeight: '900' },
    titleLine: { width: 25, height: 4, borderRadius: 2, marginTop: -2, alignSelf: 'flex-end' },
    iconBtn: { padding: 4, marginLeft: -4 },
    scrollContent: { padding: 24 }
});

