import React, { useState, useRef } from 'react';
import { StyleSheet, ScrollView, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { AuthContainer } from '@/ui/core/layout/AuthContainer';
import { Button } from '@/ui/core/form/Button';
import { Input } from '@/ui/core/form/Input';
import { StatusModal } from '@/ui/shared/StatusModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@/utils/storage';
import { apiFetch, API_ENDPOINTS, parseApiError } from '@/api/api-client';

export const Register = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const nameRef = useRef<any>(null);
    const emailRef = useRef<any>(null);
    const phoneRef = useRef<any>(null);
    const passRef = useRef<any>(null);
    const confirmRef = useRef<any>(null);
    
    const [modal, setModal] = useState({ 
        visible: false, 
        type: 'success' as 'success' | 'error' | 'warning' | 'info', 
        title: '', 
        message: '' 
    });

    const showMsg = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string = '') => {
        setModal({ visible: true, type, title, message });
    };

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            showMsg('warning', 'بيانات ناقصة', 'يرجى إكمال جميع الحقول المطلوبة لإنشاء الحساب');
            return;
        }

        if (password.length < 2) {
            showMsg('error', 'كلمة المرور قصيرة', 'يجب أن تكون كلمة المرور حرفين على الأقل');
            return;
        }

        if (password !== confirmPassword) {
            showMsg('error', 'تطابق كلمة المرور', 'كلمات المرور غير متطابقة، يرجى التأكد وإعادة المحاولة');
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch(API_ENDPOINTS.AUTH.REGISTER, {
                method: 'POST',
                body: JSON.stringify({ email, manager_name: name, manager_phone: phone, password })
            });

            const data = await res.json();
            if (res.ok) {
                await storage.setItem('access_token', data.access_token);
                if (data.refresh_token) await storage.setItem('refresh_token', data.refresh_token);
                const userWithProvider = { ...data.user, provider: 'email' };
                await storage.setItem('user', JSON.stringify(userWithProvider));
                showMsg('success', 'تم إنشاء الحساب!', 'أهلاً بك في تبارك فارما. تم إنشاء حسابك بنجاح. يمكنك الآن إضافة صيدليتك والبدء في العمل.');
            } else {
                if (res.status === 400) {
                    showMsg('error', 'بريد مسجل مسبقاً', 'هذا البريد الإلكتروني مسجل بالفعل لدينا، يمكنك تسجيل الدخول بدلاً من ذلك');
                } else {
                    showMsg('error', 'فشل التسجيل', parseApiError(data));
                }
            }
        } catch (e) {
            showMsg('error', 'خطأ في الاتصال', 'تعذر الاتصال بالسيرفر. يرجى التحقق من الإنترنت.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContainer
            title="إنشاء حساب"
            subtitle="أنشئ حساباً جديداً للبدء فوراً"
            showBack={false}
            onBack={() => router.back()}
            extraKeyboardPadding={120}
        >
            <View style={styles.form}>
                <Input 
                    ref={nameRef}
                    label="الاسم الكامل" 
                    placeholder="أدخل اسمك بالكامل" 
                    value={name} 
                    onChangeText={setName} 
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                />
                <Input 
                    ref={emailRef}
                    label="البريد الإلكتروني" 
                    placeholder="example@gmail.com" 
                    value={email} 
                    onChangeText={setEmail} 
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                />
                
                <Input 
                    ref={phoneRef}
                    label="رقم الهاتف" 
                    placeholder="010XXXXXXXX" 
                    value={phone} 
                    onChangeText={setPhone} 
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => passRef.current?.focus()}
                />

                <Input 
                    ref={passRef}
                    label="كلمة المرور" 
                    placeholder="••••••••••••" 
                    secureTextEntry 
                    value={password} 
                    onChangeText={setPassword} 
                    showPasswordToggle={true}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <Input 
                    ref={confirmRef}
                    label="تأكيد كلمة المرور" 
                    placeholder="••••••••••••" 
                    secureTextEntry 
                    value={confirmPassword} 
                    onChangeText={setConfirmPassword} 
                    showPasswordToggle={true}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                />

                <Button 
                    title="إنشاء الحساب" 
                    onPress={handleRegister} 
                    loading={loading} 
                    variant="primary"
                    style={styles.regBtn} 
                />
                
                <View style={styles.footer}>
                    <Text style={styles.footerText}>لديك حساب بالفعل؟</Text>
                    <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                        <Text style={styles.loginLink}> تسجيل دخول </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <StatusModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={() => {
                    setModal(prev => ({ ...prev, visible: false }));
                    if (modal.type === 'success') router.replace('/(pharmacy)');
                }}
            />
        </AuthContainer>
    );
};

const styles = StyleSheet.create({
    form: { 
        paddingTop: 10 
    },
    regBtn: { 
        backgroundColor: '#FF7E47', 
        height: 58, 
        borderRadius: 15,
        marginTop: 20,
        elevation: 8,
        shadowColor: '#FF7E47',
        shadowOpacity: 0.4,
        shadowRadius: 15
    },
    footer: { 
        marginTop: 35, 
        flexDirection: 'row-reverse', 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingBottom: 20
    },
    footerText: { fontSize: 13, color: '#666', fontWeight: '800' },
    loginLink: { fontSize: 13, fontWeight: '900', color: '#FF7E47', marginLeft: 6 }
});


