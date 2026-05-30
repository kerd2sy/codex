import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useAppUpdates } from '@/hooks/useAppUpdates';

interface UpdateBannerProps {
    updateAvailable: boolean;
    colorScheme: 'light' | 'dark';
}

export const UpdateBanner = React.memo(({ updateAvailable, colorScheme }: UpdateBannerProps) => {
    const router = useRouter();

    if (!updateAvailable) return null;

    return (
        <Pressable 
            style={[
                styles.updateBanner, 
                { 
                    backgroundColor: colorScheme === 'dark' ? '#FF7E4720' : '#FF7E4710', 
                    borderColor: colorScheme === 'dark' ? '#FF7E4740' : '#FF7E4730' 
                }
            ]}
            onPress={() => router.push('/(pharmacy)/app-updates' as any)}
        >
            <Ionicons name="cloud-download" size={20} color="#FF7E47" />
            <Text style={styles.updateBannerText}>هناك تحديث جديد متاح. اضغط للتحديث الآن</Text>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    updateBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginHorizontal: '5%',
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    updateBannerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#FF7E47',
        textAlign: 'right',
    },
});

