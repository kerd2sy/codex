import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { AuthContainer } from '@/ui/core/layout/AuthContainer';
import { Button } from '@/ui/core/form/Button';
import { Input } from '@/ui/core/form/Input';
import { authApi } from '@/api/AuthApi';
import { StatusModal } from '@/ui/shared/StatusModal';

export const ForgotPassword = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ visible: false, type: 'error' as 'success' | 'error' | 'info' | 'warning', title: '', message: '' });

    const handleSend = async () => {
        if (!email) {
            setModal({ visible: true, type: 'error', title: 'تنبيه', message: 'يرجى إدخال البريد الإلكتروني' });
            return;
        }

        setLoading(true);
        const success = await authApi.requestPasswordReset(email);
        setLoading(false);

        if (success) {
            router.push({ pathname: '/(auth)/reset-password', params: { email } } as any);
        } else {
            setModal({ visible: true, type: 'error', title: 'خطأ', message: 'فشل إرسال البريد الإلكتروني. يرجى التأكد من صحة البريد.' });
        }
    };

    return (
        <AuthContainer
            title="نسيت كلمة المرور"
            subtitle="يرجى إدخال بريدك الإلكتروني لاستعادة الحساب"
            showBack={false}
        >
            <View style={styles.form}>
                <Input
                    label="البريد الإلكتروني"
                    placeholder="example@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                
                <Button
                    title="إرسال الرمز"
                    onPress={handleSend}
                    loading={loading}
                    variant="primary"
                    style={styles.actionBtn}
                />
            </View>

            <StatusModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={() => setModal({ ...modal, visible: false })}
            />
        </AuthContainer>
    );
};

const styles = StyleSheet.create({
    form: { 
        paddingTop: 10 
    },
    actionBtn: { 
        backgroundColor: '#FF7E47', 
        height: 58, 
        borderRadius: 15,
        marginTop: 20,
        elevation: 4, // Reduced from 8
        shadowColor: '#FF7E47',
        shadowOpacity: 0.3,
        shadowRadius: 8 // Reduced from 15
    }
});


