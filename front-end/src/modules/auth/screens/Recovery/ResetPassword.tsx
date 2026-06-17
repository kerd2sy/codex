import { StyleSheet, View, TextInput, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useLocalSearchParams } from 'expo-router';
import { AuthContainer } from '@/ui/core/layout/AuthContainer';
import { Button } from '@/ui/core/form/Button';
import { Input } from '@/ui/core/form/Input';
import { StatusModal } from '@/ui/shared/StatusModal';
import { authApi } from '@/api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@/utils/storage';

export const ResetPassword = () => {
    const { email } = useLocalSearchParams<{ email: string }>();
    const router = useRouter();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState(1);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const [resending, setResending] = useState(false);
    const [isFocused, setIsFocused] = useState(-1);
    const [modal, setModal] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });

    const inputRefs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        let interval: any;
        if (timer > 0 && step === 1) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer, step]);

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
    const handleResend = async () => {
        if (timer > 0 || resending) return;
        setResending(true);
        try {
            const success = await authApi.requestPasswordReset(email);
            if (success) {
                setTimer(60);
            } else {
                setModal({ visible: true, type: 'error', title: 'خطأ', message: 'فشل إرسال الكود. يرجى المحاولة لاحقاً.' });
            }
        } catch (e) {
            setModal({ visible: true, type: 'error', title: 'خطأ', message: 'فشل الاتصال بالخادم' });
        } finally {
            setResending(false);
        }
    };

    const handleReset = async () => {
        const fullCode = code.join('');
        
        if (step === 1) {
            if (fullCode.length < 6) {
                setModal({ visible: true, type: 'error', title: 'كود ناقص', message: 'يرجى إدخال كود التحقق كاملاً (6 أرقام)' });
                return;
            }
            setLoading(true);
            const verified = await authApi.verifyPasswordResetOTP(email, fullCode);
            setLoading(false);
            if (verified) {
                setStep(2);
            } else {
                setModal({ visible: true, type: 'error', title: 'كود التحقق خطأ', message: 'كود التحقق الذي أدخلته غير صحيح أو منتهي الصلاحية' });
            }
            return;
        }

        // Step 2 logic
        if (newPassword.length < 2) {
            setModal({ visible: true, type: 'error', title: 'كلمة المرور قصيرة', message: 'يجب أن تكون كلمة المرور حرفين على الأقل' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setModal({ visible: true, type: 'error', title: 'عدم تطابق', message: 'كلمة المرور وتأكيدها غير متطابقين' });
            return;
        }

        setLoading(true);
        const data = await authApi.confirmPasswordReset({
            email,
            otp: fullCode,
            new_password: newPassword
        });
        setLoading(false);

        if (data) {
            // Automatic login logic
            await storage.setItem('access_token', data.access_token);
            if (data.refresh_token) await storage.setItem('refresh_token', data.refresh_token);
            
            const userWithProvider = { ...data.user, provider: 'email' };
            await storage.setItem('user', JSON.stringify(userWithProvider));
            await storage.setItem('last_login_timestamp', Date.now().toString());

            setModal({ 
                visible: true, 
                type: 'success', 
                title: 'تم بنجاح', 
                message: 'تم تعيين كلمة المرور الجديدة. جارٍ توجيهك للوحة التحكم...' 
            });
            setTimeout(() => {
                setModal(prev => ({ ...prev, visible: false }));
                router.replace('/(pharmacy)');
            }, 2000);
        } else {
            setModal({ visible: true, type: 'error', title: 'فشل العملية', message: 'حدث خطأ أثناء تغيير كلمة المرور. يرجى المحاولة لاحقاً.' });
        }
    };

    return (
        <AuthContainer
            title={step === 1 ? "كود التحقق" : "تعيين كلمة المرور"}
            subtitle={step === 1 ? `أدخل كود التحقق المرسل إلى:\n${email}` : "أدخل كلمة المرور الجديدة لتأمين حسابك"}
            showBack={false}
        >
            <View style={styles.form}>
                {step === 1 ? (
                    <>
                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={handleResend} disabled={timer > 0 || resending} style={styles.resendBtn}>
                                {resending ? (
                                    <ActivityIndicator size="small" color="#FF7E47" />
                                ) : (
                                    <Text style={[styles.resendText, { color: timer > 0 ? '#999' : '#FF7E47' }]}>
                                        إعادة إرسال {timer > 0 ? `خلال ${timer} ثانية` : ''}
                                    </Text>
                                )}
                            </TouchableOpacity>
                            <Text style={styles.label}>كود التحقق</Text>
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
                    </>
                ) : (
                    <>
                        <Input
                            label="كلمة المرور الجديدة"
                            placeholder="******"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />

                        <Input
                            label="تأكيد كلمة المرور"
                            placeholder="******"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                    </>
                )}

                <Button
                    title={step === 1 ? "تحقق ومتابعة" : "تغيير كلمة المرور"}
                    onPress={handleReset}
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
                onConfirm={() => {
                    setModal({ ...modal, visible: false });
                    if (modal.type === 'success') {
                        router.replace('/(pharmacy)');
                    }
                }}
            />
        </AuthContainer>
    );
};

const styles = StyleSheet.create({
    form: { paddingTop: 10 },
    headerRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 4
    },
    label: {
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
        marginBottom: 25,
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
    actionBtn: {
        backgroundColor: '#FF7E47',
        height: 58,
        borderRadius: 15,
        marginTop: 30,
        elevation: 4, // Reduced from 8
        shadowColor: '#FF7E47',
        shadowOpacity: 0.3,
        shadowRadius: 8 // Reduced from 15
    }
});


