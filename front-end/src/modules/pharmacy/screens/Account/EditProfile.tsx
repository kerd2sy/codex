import React, { useState } from 'react';
import { 
  StyleSheet, Text, TextInput, 
  TouchableOpacity, View, ActivityIndicator, 
  Image
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useEditProfile } from '../../hooks/useEditProfile';
import { BaseScreen } from '../../components/BaseScreen';
import { getAvatarUrl } from '@/utils/avatar';
import { ImagePickerModal } from '../../../../ui/shared/ImagePickerModal';
import { ImageEditorModal } from '../../../../ui/shared/ImageEditorModal';

export const EditProfile = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const { 
        user, name, setName, email, setEmail, phone, setPhone, avatar, setAvatar,
        pickImage, handleSave, isSaving, initialEmail,
        isPickerVisible, setPickerVisible,
        isEditorVisible, setEditorVisible,
        tempImageUri, imageTransform, setImageTransform
    } = useEditProfile();

    const [status, setStatus] = useState<{ visible: boolean, type: 'success' | 'error' | 'warning' | 'info', title: string, message: string }>({ 
        visible: false, 
        type: 'info', 
        title: '', 
        message: '' 
    });

    const onSave = async () => {
        const res = await handleSave() as any;
        if (res?.success) {
            if (res.emailChanged) {
                setStatus({ 
                    visible: true, 
                    type: 'success', 
                    title: 'تأكيد البريد', 
                    message: 'تم حفظ البيانات. يرجى تفعيل بريدك الإلكتروني الجديد لتكتمل العملية.' 
                });
                setTimeout(() => router.push({ pathname: '/verify-email', params: { email: email } }), 2000);
            } else {
                setStatus({ visible: true, type: 'success', title: 'تم التحديث', message: 'تم تحديث بيانات حسابك الشخصي بنجاح.' });
                setTimeout(() => router.back(), 2000);
            }
        } else if (res?.error) {
            setStatus({ visible: true, type: 'error', title: 'فشل التحديث', message: res.error });
        }
    };

    return (
        <BaseScreen 
            title="تعديل الحساب"
            status={status.visible ? {
                visible: true,
                type: status.type,
                title: status.title,
                message: status.message,
                onConfirm: () => setStatus(prev => ({ ...prev, visible: false }))
            } : undefined}
        >
            <View style={styles.avatarBox}>
                <View style={[styles.avatarWrapper, { borderColor: theme.border }]}>
                    {getAvatarUrl(avatar) ? (
                        <Image 
                            source={{ uri: getAvatarUrl(avatar)! }} 
                            style={[
                                styles.avatarImg, 
                                { 
                                    transform: [
                                        { rotate: `${imageTransform.rotation}deg` },
                                        { scaleX: imageTransform.flipX ? -1 : 1 }
                                    ] 
                                }
                            ]} 
                        />
                    ) : (
                        <LottieView source={require('@/assets/json/Profile.json')} autoPlay loop={false} style={styles.avatarLot} />
                    )}
                    <TouchableOpacity 
                        style={styles.camBtn} 
                        onPress={() => setPickerVisible(true)}
                    >
                        <Ionicons name="camera" size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.form, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.primary }]}>الاسم الكامل</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} value={name} onChangeText={setName} textAlign="right" />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.primary }]}>البريد الإلكتروني</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} value={email} onChangeText={setEmail} textAlign="right" keyboardType="email-address" />
                    {email.toLowerCase() !== initialEmail.toLowerCase() && (
                        <>
                            <Text style={styles.hint}>* سيتم طلب كود تفعيل عند تغيير الإيميل</Text>
                            <TouchableOpacity style={[styles.sendCodeBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]} onPress={onSave}>
                                <Ionicons name="mail-unread-outline" size={18} color={theme.primary} />
                                <Text style={[styles.sendCodeText, { color: theme.primary }]}>إرسال كود التفعيل للبريد الجديد</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.primary }]}>رقم الهاتف</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} 
                        value={phone} 
                        onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))} 
                        textAlign="right" 
                        keyboardType="phone-pad" 
                        maxLength={11}
                    />
                </View>
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={onSave} disabled={isSaving}>
                {isSaving ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.saveBtnText}>
                        {email.toLowerCase() !== initialEmail.toLowerCase() ? 'حفظ وإرسال كود التفعيل' : 'حفظ التغييرات'}
                    </Text>
                )}
            </TouchableOpacity>

            <ImagePickerModal
                visible={isPickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelectCamera={() => pickImage(true)}
                onSelectLibrary={() => pickImage(false)}
            />

            <ImageEditorModal
                visible={isEditorVisible}
                imageUri={tempImageUri}
                onClose={() => setEditorVisible(false)}
                onSave={(res) => {
                    setAvatar(res.uri);
                    setImageTransform({ rotation: res.rotation, flipX: res.flipX });
                    setEditorVisible(false);
                }}
            />
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    avatarBox: { alignItems: 'center', marginBottom: 30 },
    avatarWrapper: { width: 120, height: 120, borderRadius: 40, borderWidth: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    avatarImg: { width: '100%', height: '100%', borderRadius: 40 },
    avatarLot: { width: 80, height: 80 },
    camBtn: { position: 'absolute', bottom: -5, right: -5, width: 36, height: 36, borderRadius: 12, backgroundColor: '#FF7E47', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
    form: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '800', textAlign: 'right' },
    input: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, fontSize: 15 },
    hint: { fontSize: 11, color: '#FF7E47', textAlign: 'right' },
    saveBtn: { height: 55, borderRadius: 18, marginTop: 30, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    sendCodeBtn: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8, 
        paddingVertical: 12, 
        borderRadius: 12, 
        borderWidth: 1, 
        borderStyle: 'dashed',
        marginTop: 5
    },
    sendCodeText: { fontSize: 13, fontWeight: '800' },
});

