import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen } from '../../components/BaseScreen';
import { useDevices } from '../../hooks/useDevices';
import { useLoginActivity } from '../../hooks/useLoginActivity';

interface AccountActivityListProps {
    type: 'devices' | 'login_activity';
}

export const AccountActivityList = ({ type }: AccountActivityListProps) => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    // Hooks
    const devicesHook = useDevices();
    const loginHook = useLoginActivity();

    const isDevices = type === 'devices';
    const loading = isDevices ? devicesHook.isLoading : loginHook.isLoading;
    const title = isDevices ? 'الأجهزة المسجلة' : 'نشاط تسجيل الدخول';
    const infoText = isDevices 
        ? 'يمكنك تسجيل الخروج من أي جهاز غير معروف لحماية حسابك.' 
        : 'مراجعة كافة الأنشطة المتعلقة بالأمان في حسابك.';
    const infoIcon = isDevices ? 'laptop-outline' : 'time-outline';

    const renderDevices = () => (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {devicesHook.devices.map((d, i) => (
                <View key={d.id} style={[styles.item, i < devicesHook.devices.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                    <View style={styles.row}>
                        {d.is_current ? (
                            <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}><Text style={{ color: theme.primary, fontSize: 10, fontWeight: '800' }}>هذا الجهاز</Text></View>
                        ) : (
                            <TouchableOpacity style={styles.outBtn} onPress={() => devicesHook.signOut(d.id)}><Text style={styles.outBtnTxt}>خروج</Text></TouchableOpacity>
                        )}
                        <View style={styles.details}>
                            <Text style={[styles.name, { color: theme.text }]}>{d.name}</Text>
                            <View style={styles.subRow}>
                                <Text style={styles.status}>نشط الآن</Text>
                                <Text style={{ color: theme.muted }}> • </Text>
                                <Text style={{ color: theme.muted, fontSize: 12 }}>{d.location}</Text>
                            </View>
                            <Text style={[styles.ip, { color: theme.muted }]}>IP: {d.ip_address}</Text>
                        </View>
                        <View style={[styles.iconBox, { backgroundColor: theme.primary + '10' }]}><Ionicons name={d.icon as any} size={24} color={theme.primary} /></View>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderLoginActivity = () => (
        loginHook.sections.map(s => (
            <View key={s.id} style={styles.section}>
                <Text style={[styles.date, { color: theme.accent }]}>{s.date}</Text>
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {s.items.map((item, i) => {
                        const st = item.status === 'success' 
                            ? { color: '#4CAF50', icon: 'checkmark-circle-outline' }
                            : item.status === 'error' 
                                ? { color: '#FF5252', icon: 'close-circle-outline' }
                                : { color: theme.primary, icon: 'log-in-outline' };
                        
                        return (
                            <View key={item.id} style={[styles.item, i < s.items.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                                <View style={styles.row}>
                                    <Text style={[styles.time, { color: theme.muted }]}>{new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</Text>
                                    <View style={styles.details}>
                                        <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                                        <Text style={[styles.itemSub, { color: theme.muted }]}>{item.device} • {item.location}</Text>
                                    </View>
                                    <View style={[styles.iconBoxSmall, { backgroundColor: st.color + '15' }]}><Ionicons name={st.icon as any} size={22} color={st.color} /></View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        ))
    );

    return (
        <BaseScreen title={title}>
            <View style={[styles.info, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
                <Ionicons name={infoIcon as any} size={24} color={theme.primary} />
                <Text style={[styles.infoTxt, { color: theme.text }]}>{infoText}</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
            ) : isDevices ? renderDevices() : renderLoginActivity()}

            {isDevices && !loading && devicesHook.devices.length > 1 && (
                <TouchableOpacity 
                    style={[styles.allBtn, { borderColor: '#FF525230', backgroundColor: theme.surface }]} 
                    onPress={devicesHook.signOutOthers}
                    disabled={devicesHook.isSigningOutAll}
                >
                    {devicesHook.isSigningOutAll ? <ActivityIndicator color="#FF5252" /> : <Text style={styles.allTxt}>تسجيل الخروج من كافة الأجهزة الأخرى</Text>}
                </TouchableOpacity>
            )}
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    info: { flexDirection: 'row-reverse', padding: 16, borderRadius: 20, gap: 12, alignItems: 'center', borderWidth: 1, marginBottom: 24 },
    infoTxt: { flex: 1, fontSize: 14, textAlign: 'right', fontWeight: '500' },
    card: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
    item: { padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    iconBoxSmall: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    details: { flex: 1, marginHorizontal: 16 },
    name: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
    subRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4 },
    status: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
    ip: { fontSize: 11, textAlign: 'right', marginTop: 4, opacity: 0.7 },
    outBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FF525215' },
    outBtnTxt: { fontSize: 12, fontWeight: '700', color: '#FF5252' },
    badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
    allBtn: { marginTop: 24, height: 55, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    allTxt: { fontSize: 14, fontWeight: '700', color: '#FF5252' },
    section: { marginBottom: 24 },
    date: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
    itemTitle: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
    itemSub: { fontSize: 12, textAlign: 'right', marginTop: 4 },
    time: { fontSize: 12, fontWeight: '600' },
});

