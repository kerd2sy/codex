import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, View, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import LottieView from 'lottie-react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthContainer } from '@/ui/core/layout/AuthContainer';
import { Button } from '@/ui/core/form/Button';
import { StatusModal } from '@/ui/shared/StatusModal';
import { apiFetch, API_ENDPOINTS } from '@/api/api-client';
import { storage } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const VerifyEmail = () => {
    const { email, autoResend } = useLocalSearchParams<{ email: string, autoResend?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(60);
    const [isFocused, setIsFocused] = useState(-1);
    const [modal, setModal] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });
    
    const inputRefs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    useEffect(() => {
        if (autoResend === 'true') {
            handleResend(true);
        }
    }, [autoResend]);

    useEffect(() => {
        const checkStatus = setInterval(async () => {
            try {
                const res = await apiFetch(API_ENDPOINTS.AUTH.PROFILE);
                if (res.ok) {
                    const data = await res.json();
                    if (data.is_email_verified) {
                        clearInterval(checkStatus);
                        const userJson = await storage.getItem('user');
                        if (userJson) {
                            const user = JSON.parse(userJson);
                            await storage.setItem('user', JSON.stringify({ ...user, is_email_verified: true }));
                        }
                        router.replace('/(pharmacy)');
                    }
                }
            } catch (e) {}
        }, 3000);
        return () => clearInterval(checkStatus);
    }, []);

    const handleCodeChange = (text: string, index: number) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);
        if (text.length === 1 && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length < 6) return;
        setLoading(true);
        try {
            const res = await apiFetch(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
                method: 'POST',
                body: JSON.stringify({ email, code: fullCode })
            });
            if (res.ok) {
                setModal({ visible: true, type: 'success', title: 'تم بنجاح', message: 'تم تفعيل حسابك بنجاح.' });
            } else {
                const err = await res.json();
                setModal({ visible: true, type: 'error', title: 'كود التفعيل خطأ', message: 'تأكد من كتابة الكود بشكل صحيح أو اطلب كوداً جديداً' });
            }
        } catch (e) {
            setModal({ visible: true, type: 'error', title: 'خطأ', message: 'فشل الاتصال بالخادم' });
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async (force = false) => {
        if (!force && (timer > 0 || resending)) return;
        setResending(true);
        try {
            // If it's a forced (auto) resend on mount, we reuse the existing code to avoid invalidating the registration email
            const res = await apiFetch(`${API_ENDPOINTS.AUTH.RESEND_VERIFICATION}?reuse_code=${force}`, {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                setTimer(60);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setResending(false);
        }
    };

    return (
        <AuthContainer
            title="تفعيل الحساب"
            subtitle={`لقد أرسلنا رمز التفعيل إلى بريدك الإلكتروني\n${email}`}
            showBack={false}
        >
            <View style={styles.formContainer}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => handleResend()} disabled={timer > 0 || resending} style={styles.resendBtn}>
                        {resending ? (
                            <ActivityIndicator size="small" color="#FF7E47" />
                        ) : (
                            <Text style={[styles.resendText, { color: timer > 0 ? '#999' : '#FF7E47' }]}>
                                إعادة إرسال {timer > 0 ? `خلال ${timer} ثانية` : ''}
                            </Text>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.inputLabel}>كود التحقق</Text>
                </View>

                <View style={styles.codeRow}>
                    <Text style={[styles.prefix, { color: theme.primary }]}>Rx-</Text>
                    <View style={styles.codeContainer}>
                        {code.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={ref => { inputRefs.current[index] = ref; }}
                                style={[
                                    styles.codeInput, 
                                    { 
                                        backgroundColor: '#F5F8FA', 
                                        color: '#16193E', 
                                        borderColor: isFocused === index ? '#FF7E47' : 'transparent',
                                    }
                                ]}
                                value={digit}
                                onChangeText={(text) => handleCodeChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                onFocus={() => setIsFocused(index)}
                                onBlur={() => setIsFocused(-1)}
                                keyboardType="number-pad"
                                maxLength={1}
                                textAlign="center"
                            />
                        ))}
                    </View>
                </View>

                <Button 
                    title="تحقق وتفعيل" 
                    onPress={handleVerify} 
                    loading={loading} 
                    variant="primary"
                    style={styles.verifyBtn}
                />

                <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(pharmacy)')}>
                    <Text style={styles.skipText}>تخطى الآن وانتقل للرئيسية</Text>
                </TouchableOpacity>
            </View>

            <StatusModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={() => {
                    setModal(prev => ({ ...prev, visible: false }));
                    if (modal.type === 'success') {
                        router.replace('/(pharmacy)');
                    }
                }}
            />
        </AuthContainer>
    );
};

const styles = StyleSheet.create({
    formContainer: {
        paddingTop: 10
    },
    headerRow: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 25 ,
        paddingHorizontal: 4
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#333',
        textTransform: 'uppercase'
    },
    resendBtn: {
        borderBottomWidth: 1.5,
        borderBottomColor: '#FF7E47',
        paddingBottom: 2
    },
    resendText: {
        fontSize: 12,
        fontWeight: '800'
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
        marginBottom: 50,
    },
    prefix: {
        fontSize: 24,
        fontWeight: '900',
    },
    codeContainer: { 
        flexDirection: 'row', 
        gap: 8,
    },
    codeInput: { 
        width: 44, 
        height: 58, 
        borderRadius: 14, 
        fontSize: 22, 
        fontWeight: '900',
        borderWidth: 1.5
    },
    verifyBtn: {
        backgroundColor: '#FF7E47',
        height: 58,
        borderRadius: 15,
        elevation: 8,
        shadowColor: '#FF7E47',
        shadowOpacity: 0.4,
        shadowRadius: 15
    },
    skipBtn: { 
        marginTop: 35, 
        alignItems: 'center' 
    },
    skipText: {
        color: '#999',
        fontSize: 13,
        fontWeight: '800',
        textDecorationLine: 'underline'
    }
});


