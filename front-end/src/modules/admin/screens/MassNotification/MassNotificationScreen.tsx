import React, { useState } from 'react';
import { 
    StyleSheet, Text, View, TextInput, TouchableOpacity, 
    ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch, API_ENDPOINTS, API_URL, parseApiError } from '@/shared/api/api-client';
import { useRouter } from 'expo-router';

const ICONS = [
    { name: 'megaphone-outline', label: 'إعلان' },
    { name: 'alert-circle-outline', label: 'تنبيه' },
    { name: 'information-circle-outline', label: 'معلومة' },
    { name: 'star-outline', label: 'مميز' },
    { name: 'gift-outline', label: 'هدية/عرض' },
    { name: 'pricetag-outline', label: 'خصم' }
];

const COLORS = [
    { value: '#FF7043', label: 'برتقالي' },
    { value: '#EF4444', label: 'أحمر' },
    { value: '#3B82F6', label: 'أزرق' },
    { value: '#10B981', label: 'أخضر' },
    { value: '#8B5CF6', label: 'بنفسجي' },
];

export const MassNotificationScreen = () => {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const theme = Colors[colorScheme];
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(ICONS[0].name);
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
    const [targetGroup, setTargetGroup] = useState('all');
    const [imageUrl, setImageUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                await uploadImage(asset.uri);
            }
        } catch (error) {
            Alert.alert('خطأ', 'تعذر فتح معرض الصور');
        }
    };

    const uploadImage = async (uri: string) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                type: 'image/jpeg',
                name: 'upload.jpg',
            } as any);

            const res = await apiFetch('/api/v1/admin/upload-image', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    const fullUrl = data.url.startsWith('http') ? data.url : `${API_URL}${data.url}`;
                    setImageUrl(fullUrl);
                }
            } else {
                const errorText = await res.text();
                Alert.alert('خطأ', `فشل في رفع الصورة: ${errorText}`);
            }
        } catch (error: any) {
            Alert.alert('خطأ', `فشل الاتصال: ${error?.message || error?.toString()}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSend = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert('تنبيه', 'يرجى إدخال عنوان ووصف الإشعار');
            return;
        }

        Alert.alert(
            'تأكيد الإرسال',
            'هل أنت متأكد من إرسال هذا الإشعار لجميع الصيدليات؟ لا يمكن التراجع عن هذه الخطوة.',
            [
                { text: 'إلغاء', style: 'cancel' },
                { 
                    text: 'إرسال', 
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            const res = await apiFetch(API_ENDPOINTS.NOTIFICATIONS.MASS_NOTIFICATION, {
                                method: 'POST',
                                body: JSON.stringify({
                                    title: title.trim(),
                                    description: description.trim(),
                                    icon: selectedIcon,
                                    color: selectedColor,
                                    image_url: imageUrl.trim(),
                                    target_group: targetGroup
                                })
                            });

                            if (res.ok) {
                                Alert.alert('نجاح', 'تم إرسال الإشعار الجماعي بنجاح.', [
                                    { text: 'حسناً', onPress: () => router.back() }
                                ]);
                            } else {
                                const data = await res.json().catch(() => null);
                                Alert.alert('خطأ', parseApiError(data));
                            }
                        } catch (error) {
                            Alert.alert('خطأ', 'تعذر إرسال الإشعار. يرجى التأكد من اتصالك بالإنترنت.');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.card }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>إرسال إشعار جماعي</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={[styles.label, { color: theme.text }]}>عنوان الإشعار</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        placeholder="أدخل عنوان الإشعار"
                        placeholderTextColor={theme.textSecondary}
                        value={title}
                        onChangeText={setTitle}
                        textAlign="right"
                    />

                    <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>وصف الإشعار</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                        placeholder="أدخل التفاصيل..."
                        placeholderTextColor={theme.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                        textAlign="right"
                        multiline
                        numberOfLines={4}
                    />

                    <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>رابط صورة (اختياري)</Text>
                    <View style={styles.imageInputContainer}>
                        <TextInput
                            style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                            placeholder="https://example.com/image.png"
                            placeholderTextColor={theme.textSecondary}
                            value={imageUrl}
                            onChangeText={setImageUrl}
                            textAlign="left"
                        />
                        <TouchableOpacity 
                            style={[styles.uploadButton, { backgroundColor: theme.primary }]}
                            onPress={handlePickImage}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="cloud-upload" size={24} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                    
                    {imageUrl ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                            <TouchableOpacity 
                                style={styles.removeImageBtn}
                                onPress={() => setImageUrl('')}
                            >
                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>

                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={[styles.label, { color: theme.text }]}>الفئة المستهدفة</Text>
                    <View style={styles.targetRow}>
                        <TouchableOpacity 
                            style={[
                                styles.targetBtn, 
                                { borderColor: theme.border },
                                targetGroup === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary }
                            ]}
                            onPress={() => setTargetGroup('all')}
                        >
                            <Text style={[styles.targetBtnText, { color: targetGroup === 'all' ? '#FFF' : theme.textSecondary }]}>
                                جميع الصيدليات
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.targetBtn, 
                                { borderColor: theme.border },
                                targetGroup === 'gomla_preparers' && { backgroundColor: theme.primary, borderColor: theme.primary }
                            ]}
                            onPress={() => setTargetGroup('gomla_preparers')}
                        >
                            <Text style={[styles.targetBtnText, { color: targetGroup === 'gomla_preparers' ? '#FFF' : theme.textSecondary }]}>
                                محضرين الجملة
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={[styles.label, { color: theme.text }]}>اختر أيقونة</Text>
                    <View style={styles.iconGrid}>
                        {ICONS.map((icon) => (
                            <TouchableOpacity 
                                key={icon.name}
                                style={[
                                    styles.iconItem, 
                                    { borderColor: theme.border },
                                    selectedIcon === icon.name && { borderColor: theme.primary, backgroundColor: theme.primary + '15' }
                                ]}
                                onPress={() => setSelectedIcon(icon.name)}
                            >
                                <Ionicons name={icon.name as any} size={28} color={selectedIcon === icon.name ? theme.primary : theme.textSecondary} />
                                <Text style={[styles.iconLabel, { color: selectedIcon === icon.name ? theme.primary : theme.textSecondary }]}>
                                    {icon.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={[styles.label, { color: theme.text }]}>لون الإشعار</Text>
                    <View style={styles.colorRow}>
                        {COLORS.map((color) => (
                            <TouchableOpacity 
                                key={color.value}
                                style={[
                                    styles.colorCircle, 
                                    { backgroundColor: color.value },
                                    selectedColor === color.value && styles.colorCircleSelected
                                ]}
                                onPress={() => setSelectedColor(color.value)}
                            >
                                {selectedColor === color.value && (
                                    <Ionicons name="checkmark" size={20} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.sendButton, { backgroundColor: theme.primary }]}
                    onPress={handleSend}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.sendButtonText}>إرسال للجميع</Text>
                            <Ionicons name="send" size={20} color="#FFF" />
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    placeholder: { width: 34 },
    scrollContent: { padding: 20, paddingBottom: 50 },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 10, textAlign: 'right' },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 15,
        fontSize: 15,
        fontFamily: 'System',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    imageInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    uploadButton: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewContainer: {
        marginTop: 15,
        alignItems: 'center',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 2,
    },
    targetRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        gap: 10,
    },
    targetBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    targetBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    iconGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    iconItem: {
        width: '31%',
        aspectRatio: 1,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    iconLabel: {
        fontSize: 12,
        marginTop: 8,
        fontWeight: '500',
    },
    colorRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    colorCircle: {
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorCircleSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
        marginTop: 10,
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
