import React, { useState, useRef } from 'react';
import { 
  StyleSheet, Text, TextInput, TouchableOpacity, 
  View, ActivityIndicator 
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '../../../../core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAddPharmacy } from '../../hooks/useAddPharmacy';
import { BaseScreen } from '../../components/BaseScreen';

export const AddPharmacy = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const [code, setCode] = useState('');
    const [phone, setPhone] = useState('');
    const phoneRef = useRef<TextInput>(null);
    const { addPharmacy, loading } = useAddPharmacy();
    
    const [modal, setModal] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });

    const handleAdd = async () => {
        if (!code || !phone) {
            setModal({ visible: true, type: 'error', title: 'تنبيه', message: 'يرجى إكمال البيانات' });
            return;
        }
        const res = await addPharmacy(code, phone);
        if (res.success) {
            setModal({ visible: true, type: 'success', title: 'تم الربط بنجاح', message: 'تم ربط الصيدلية بحسابك بنجاح. يمكنك الآن التبديل إليها من القائمة.' });
            setTimeout(() => router.back(), 2000);
        } else {
            setModal({ visible: true, type: 'error', title: 'خطأ', message: res.error! });
        }
    };

    return (
        <BaseScreen 
            title="إضافة صيدلية"
            status={modal.visible ? {
                visible: true,
                type: modal.type,
                title: modal.title,
                message: modal.message,
                onConfirm: () => setModal({ ...modal, visible: false })
            } : undefined}
        >
            <View style={styles.iconBox}>
                <View style={[styles.circle, { backgroundColor: theme.primary + '10' }]}>
                    <Ionicons name="business" size={40} color={theme.accent} />
                </View>
                <Text style={[styles.subtitle, { color: theme.muted }]}>اربط صيدلية جديدة بحسابك للتبديل بينها بسهولة</Text>
            </View>

            <View style={styles.form}>
                <Text style={[styles.label, { color: theme.primary }]}>كود الصيدلية</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="numeric"
                    placeholder="0000"
                    placeholderTextColor={theme.muted}
                    onSubmitEditing={() => phoneRef.current?.focus()}
                />

                <Text style={[styles.label, { color: theme.primary, marginTop: 20 }]}>رقم الهاتف المسجل</Text>
                <TextInput
                    ref={phoneRef}
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="010..."
                    placeholderTextColor={theme.muted}
                />

                <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]} 
                    onPress={handleAdd}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>تسجيل الصيدلية</Text>}
                </TouchableOpacity>
            </View>
        </BaseScreen>
    );
};

const styles = StyleSheet.create({
    iconBox: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
    circle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
    form: { width: '100%' },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'right' },
    input: { height: 60, borderRadius: 16, paddingHorizontal: 20, fontSize: 16, textAlign: 'right', borderWidth: 1 },
    btn: { height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
    btnText: { color: '#FFF', fontSize: 18, fontWeight: '800' }
});

