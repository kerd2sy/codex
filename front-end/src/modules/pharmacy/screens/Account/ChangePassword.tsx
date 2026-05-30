import React, { useState } from 'react';
import { 
  ScrollView, StyleSheet, Text, 
  TextInput, TouchableOpacity, View, 
  ActivityIndicator, Modal, Animated 
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useChangePassword } from '../../hooks/useChangePassword';
import { HEADER_TOP_GAP, HEADER_CONTENT_HEIGHT } from '@/shared/constants/HeaderConstants';

export const ChangePassword = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { 
        currentPassword, setCurrentPassword, 
        newPassword, setNewPassword, confirmPassword, 
        setConfirmPassword, isSaving, handleSave, isGoogleUser 
    } = useChangePassword();

    const [status, setStatus] = useState<any>({ visible: false, type: 'success', message: '' });
    const [secure, setSecure] = useState({ old: true, new: true, conf: true });

    const onSave = async () => {
        const res = await handleSave();
        if (res.success) {
            setStatus({ visible: true, type: 'success', message: 'تم تغيير كلمة المرور بنجاح' });
            setTimeout(() => router.back(), 2000);
        } else if (res.error) {
            setStatus({ visible: true, type: 'error', message: res.error });
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP_GAP, height: HEADER_CONTENT_HEIGHT + insets.top + HEADER_TOP_GAP }]}>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={28} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.title, { color: theme.primary }]} numberOfLines={1}>{isGoogleUser ? 'إنشاء كلمة مرور' : 'تغيير كلمة المرور'}</Text>
                        <View style={[styles.titleLine, { backgroundColor: '#FF7E47' }]} />
                    </View>
                </View>
            </View>





            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.info, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
                    <Text style={[styles.infoTxt, { color: theme.text }]}>اختر كلمة مرور قوية لضمان حماية حسابك.</Text>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {!isGoogleUser && (
                        <View style={styles.inputGrp}>
                            <Text style={[styles.label, { color: theme.text }]}>كلمة المرور الحالية</Text>
                            <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={theme.primary} />
                                <TextInput style={[styles.input, { color: theme.text }]} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={secure.old} textAlign="right" placeholder="كلمة المرور القديمة" placeholderTextColor={theme.muted} />
                                <TouchableOpacity onPress={() => setSecure({...secure, old: !secure.old})}><Ionicons name={secure.old ? "eye-off" : "eye"} size={20} color={theme.muted} /></TouchableOpacity>
                            </View>
                        </View>

                    )}
                    <View style={styles.inputGrp}>
                        <Text style={[styles.label, { color: theme.text }]}>كلمة المرور الجديدة</Text>
                        <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="key-outline" size={20} color={theme.primary} />
                            <TextInput style={[styles.input, { color: theme.text }]} value={newPassword} onChangeText={setNewPassword} secureTextEntry={secure.new} textAlign="right" placeholder="كلمة المرور الجديدة" placeholderTextColor={theme.muted} />
                            <TouchableOpacity onPress={() => setSecure({...secure, new: !secure.new})}><Ionicons name={secure.new ? "eye-off" : "eye"} size={20} color={theme.muted} /></TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGrp}>
                        <Text style={[styles.label, { color: theme.text }]}>تأكيد كلمة المرور</Text>
                        <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={theme.primary} />
                            <TextInput style={[styles.input, { color: theme.text }]} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={secure.conf} textAlign="right" placeholder="تأكيد كلمة المرور" placeholderTextColor={theme.muted} />
                            <TouchableOpacity onPress={() => setSecure({...secure, conf: !secure.conf})}><Ionicons name={secure.conf ? "eye-off" : "eye"} size={20} color={theme.muted} /></TouchableOpacity>
                        </View>
                    </View>

                </View>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={onSave} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnTxt}>حفظ التغييرات</Text>}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={status.visible} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={[styles.modal, { backgroundColor: theme.surface }]}>
                        <LottieView source={status.type === 'success' ? require('@/assets/json/Success.json') : require('@/assets/json/Error.json')} autoPlay loop={false} style={{ width: 120, height: 120 }} />
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{status.type === 'success' ? 'تم بنجاح' : 'خطأ'}</Text>
                        <Text style={{ textAlign: 'center', color: theme.muted }}>{status.message}</Text>
                        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.primary }]} onPress={() => setStatus({ ...status, visible: false })}><Text style={{ color: '#FFF', fontWeight: '800' }}>موافق</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* Solid Floor for Navigation Bar area */}
            <View style={{ position: 'absolute', bottom: -100, left: 0, right: 0, height: 100 + insets.bottom, backgroundColor: theme.background, zIndex: -1 }} />
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

    content: { padding: 24 },
    info: { flexDirection: 'row-reverse', padding: 16, borderRadius: 20, gap: 12, alignItems: 'center', borderWidth: 1, marginBottom: 24 },
    infoTxt: { flex: 1, fontSize: 14, textAlign: 'right', fontWeight: '500' },
    card: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 20 },
    inputGrp: { gap: 8 },
    label: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
    inputWrap: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 16, height: 55, paddingHorizontal: 16, borderWidth: 1, gap: 10 },
    input: { flex: 1, height: '100%', textAlign: 'right', fontSize: 16, fontWeight: '600', paddingRight: 5 },

    saveBtn: { height: 55, borderRadius: 18, marginTop: 32, justifyContent: 'center', alignItems: 'center' },
    saveBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 30 },
    modal: { borderRadius: 30, padding: 30, alignItems: 'center', gap: 15 },
    modalTitle: { fontSize: 18, fontWeight: '900' },


    closeBtn: { width: '100%', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }
});

