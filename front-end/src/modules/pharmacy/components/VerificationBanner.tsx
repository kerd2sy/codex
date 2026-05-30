import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/shared/api/types';
import { useRouter } from '@/hooks/useRouter';

interface VerificationBannerProps {
    currentUser: User | null;
    colorScheme: 'light' | 'dark';
}

export const VerificationBanner = React.memo(({ currentUser, colorScheme }: VerificationBannerProps) => {
    const router = useRouter();
    
    if (!currentUser || currentUser.is_email_verified !== false) return null;

    return (
        <Pressable 
            style={[
                styles.verificationBanner, 
                { 
                    backgroundColor: colorScheme === 'dark' ? '#FF980020' : '#FFF3E0', 
                    borderColor: colorScheme === 'dark' ? '#FF980040' : '#FFE0B2' 
                }
            ]}
            onPress={() => router.push(`/(auth)/verify-email?email=${currentUser.email}&autoResend=true`)}
        >
            <Ionicons name="warning" size={20} color="#E65100" />
            <Text style={styles.verificationText}>الحساب غير مفعل. برجاء تفعيل البريد الإلكتروني</Text>
            <Ionicons name="chevron-back" size={16} color="#E65100" />
        </Pressable>
    );
});

const styles = StyleSheet.create({
    verificationBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginHorizontal: '5%',
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    verificationText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#E65100',
        textAlign: 'right',
    },
});

