import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch, API_ENDPOINTS } from '@/shared/api/api-client';
import { storage } from '@/shared/utils/storage';
import { Alert } from 'react-native';

export const useEditProfile = () => {
    const [user, setUser] = useState<any>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [initialEmail, setInitialEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [enteredOTP, setEnteredOTP] = useState('');
    const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [isEditorVisible, setEditorVisible] = useState(false);
    const [tempImageUri, setTempImageUri] = useState<string | null>(null);
    const [imageTransform, setImageTransform] = useState({ rotation: 0, flipX: false });

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        const userData = await storage.getItem('user');
        if (userData) {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            setName(parsed.manager_name || '');
            setEmail(parsed.email || '');
            setInitialEmail(parsed.email || '');
            setPhone(parsed.manager_phone || '');
            setAvatar(parsed.avatar_url || null);
        }
    };

    const pickImage = async (useCamera = false) => {
        const permission = useCamera 
            ? await ImagePicker.requestCameraPermissionsAsync() 
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permission.status !== 'granted') return;

        const config: ImagePicker.ImagePickerOptions = {
            allowsEditing: true, // Still allow editing but maybe without strict aspect
            quality: 0.7,
            aspect: undefined, // Remove strict [1,1]
        };

        const result = useCamera 
            ? await ImagePicker.launchCameraAsync(config)
            : await ImagePicker.launchImageLibraryAsync(config);

        if (!result.canceled) {
            setTempImageUri(result.assets[0].uri);
            setEditorVisible(true);
        }
    };

    const handleSave = async () => {
        if (!name || !email) return { error: 'يرجى ملء جميع الحقول المطلوبة' };
        
        setIsSaving(true);
        try {
            let currentAvatarUrl = avatar;
            if (avatar?.startsWith('file://')) {
                // Use expo-file-system to completely bypass React Native's buggy FormData implementation
                const token = await storage.getItem('access_token');
                const uploadUrl = `${API_ENDPOINTS.AUTH.AVATAR.startsWith('http') ? '' : process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.25:8080'}${API_ENDPOINTS.AUTH.AVATAR}`;
                
                try {
                    const uploadRes = await FileSystem.uploadAsync(uploadUrl, avatar, {
                        httpMethod: 'POST',
                        uploadType: FileSystem.FileSystemUploadType.MULTIPART as any,
                        fieldName: 'file',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (uploadRes.status === 200) {
                        currentAvatarUrl = JSON.parse(uploadRes.body).avatar_url;
                    }
                } catch (err) {
                    console.error('File upload error:', err);
                    return { error: 'فشل في رفع الصورة، يرجى المحاولة مرة أخرى' };
                }
            }

            const res = await apiFetch(API_ENDPOINTS.AUTH.PROFILE, {
                method: 'PUT',
                body: JSON.stringify({ 
                    manager_name: name, 
                    email: email, 
                    manager_phone: phone, 
                    avatar_url: currentAvatarUrl 
                })
            });

            if (res.ok) {
                const updated = await res.json();
                await storage.setItem('user', JSON.stringify(updated));
                return { success: true, emailChanged: email.toLowerCase() !== initialEmail.toLowerCase() };
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
        return { error: 'فشل تحديث البيانات' };
    };

    return { 
        user, name, setName, email, setEmail, phone, setPhone, avatar, setAvatar,
        pickImage, handleSave, isSaving, initialEmail,
        isPickerVisible, setPickerVisible,
        isEditorVisible, setEditorVisible,
        tempImageUri, imageTransform, setImageTransform
    };
};
