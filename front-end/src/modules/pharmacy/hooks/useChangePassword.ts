import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_ENDPOINTS } from '@/shared/api/api-client';
import { storage } from '@/shared/utils/storage';

export const useChangePassword = () => {
    const [user, setUser] = useState<any>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isGoogleUser = user?.provider === 'google';

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userData = await storage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
    };

    const handleSave = async () => {
        if ((!isGoogleUser && !currentPassword) || !newPassword || !confirmPassword) {
            return { error: 'يرجى ملء جميع الحقول المطلوبة.' };
        }
        if (newPassword.length < 2) {
            return { error: 'يجب أن تكون كلمة المرور حرفين على الأقل.' };
        }
        if (newPassword !== confirmPassword) {
            return { error: 'كلمة المرور الجديدة غير متطابقة.' };
        }
        if (!user) return { error: 'لم يتم العثور على بيانات المستخدم.' };

        setIsSaving(true);
        try {
            const res = await apiFetch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
                method: 'POST',
                body: JSON.stringify({
                    current_password: isGoogleUser ? null : currentPassword,
                    new_password: newPassword,
                }),
            });
            const data = await res.json();
            setIsSaving(false);
            if (res.ok) return { success: true };
            return { error: data.detail || 'فشل تغيير كلمة المرور.' };
        } catch (e) {
            setIsSaving(false);
            return { error: 'تعذر الاتصال بالسيرفر.' };
        }
    };

    return { 
        user, currentPassword, setCurrentPassword, 
        newPassword, setNewPassword, confirmPassword, 
        setConfirmPassword, isSaving, handleSave, isGoogleUser 
    };
};
