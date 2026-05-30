import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSecuritySettings } from '../../hooks/useSecuritySettings';
import { BaseScreen } from '../../components/BaseScreen';

export const Security = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { 
        user, biometricEnabled, 
        loadSettings, toggleBiometric 
    } = useSecuritySettings();

    const [status, setStatus] = useState<any>({ visible: false, type: 'success', message: '' });

    useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

    const onToggleBio = async (val: boolean) => {
        const res = await toggleBiometric(val);
        if (res.success) setStatus({ visible: true, type: 'success', message: res.success });
        else if (res.error) setStatus({ visible: true, type: 'error', message: res.error });
    };

    const OPTIONS = [
        { id: 'pass', title: 'تغيير كلمة المرور', icon: 'key-outline', type: 'link', route: '/(pharmacy)/profile/change-password' },
        { id: 'bio', title: 'البصمة / التعرف على الوجه', icon: 'scan-outline', type: 'switch', value: biometricEnabled, onValueChange: onToggleBio },
    ].filter(opt => {
        const isGoogle = user?.provider?.toLowerCase().includes('google');
        if (isGoogle && (opt.id === 'bio' || opt.id === 'pass')) return false;
        return true;
    });

    return (
        <BaseScreen 
            title="الأمان" 
            status={status.visible ? { 
                visible: true, 
                type: status.type, 
                message: status.message,
                onConfirm: () => setStatus({ ...status, visible: false })
            } : undefined}
        >
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {OPTIONS.map((opt, i) => (
                    <View key={opt.id} style={[styles.item, i < OPTIONS.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                        {opt.type === 'link' ? (
                            <TouchableOpacity style={styles.pressable} onPress={() => router.push(opt.route as any)}>
                                <View style={styles.left}>
                                    <Ionicons name="chevron-back" size={18} color={theme.muted} />
                                </View>
                                <View style={styles.right}>
                                    <View style={[styles.iconBox, { backgroundColor: theme.card }]}><Ionicons name={opt.icon as any} size={20} color={theme.primary} /></View>
                                    <Text style={[styles.itemText, { color: theme.text }]}>{opt.title}</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.pressable}>
                                <Switch value={opt.value} onValueChange={opt.onValueChange} trackColor={{ false: theme.border, true: theme.primary + '80' }} thumbColor={opt.value ? theme.primary : '#f4f3f4'} />
                                <View style={styles.right}>
                                    <View style={[styles.iconBox, { backgroundColor: theme.card }]}><Ionicons name={opt.icon as any} size={20} color={theme.primary} /></View>
                                    <Text style={[styles.itemText, { color: theme.text }]}>{opt.title}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            <View style={[styles.info, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '30' }]}>
                <Ionicons name="information-circle-outline" size={24} color={theme.accent} />
                <Text style={[styles.infoTxt, { color: theme.text }]}>سيتم إرسال تنبيه في حال تم تسجيل الدخول من جهاز جديد.</Text>
            </View>
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    card: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
    item: { paddingHorizontal: 20 },
    pressable: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
    left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    right: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    itemText: { fontSize: 16, fontWeight: '600' },
    info: { flexDirection: 'row-reverse', padding: 18, borderRadius: 20, marginTop: 30, alignItems: 'center', gap: 12, borderWidth: 1 },
    infoTxt: { flex: 1, fontSize: 14, textAlign: 'right', fontWeight: '600' },
});

