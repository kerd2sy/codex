import React from 'react';
import { 
  StyleSheet, View, Text, Modal, 
  TouchableOpacity, Pressable, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import LottieView from 'lottie-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DevelopingModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: string;
}

export const DevelopingModal: React.FC<DevelopingModalProps> = ({ 
  visible, onClose, title, message, icon = 'shield-checkmark' 
}) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.content, { backgroundColor: theme.surface, paddingBottom: 35 }]}>
          <View style={styles.handle} />
          
          <View style={styles.hero}>
            <LottieView 
                source={require('@/assets/json/Coder.json')} 
                autoPlay 
                loop 
                style={{ width: 220, height: 220, marginBottom: 0 }}
            />
            <Text style={[styles.heroTit, { color: theme.text }]}>{title}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagTxt}>قيد التطوير حالياً</Text>
            </View>
            <Text style={[styles.heroSub, { color: theme.muted }]}>
                {message || 'نحن نعمل بجهد لتوفير هذه الميزة الأمنية قريباً.'}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.mainBtn, { backgroundColor: theme.primary }]} 
            onPress={onClose}
          >
            <Text style={styles.mainBtnTxt}>حسناً</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  content: { 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    padding: 30, 
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#00000015',
    borderRadius: 3,
    marginBottom: 10
  },
  hero: { alignItems: 'center', marginBottom: 30 },
  iconBox: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8, 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 20 
  },
  heroTit: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
  tag: { backgroundColor: '#FF7E4715', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, marginBottom: 15 },
  tagTxt: { color: '#FF7E47', fontWeight: '900', fontSize: 12 },
  heroSub: { textAlign: 'center', paddingHorizontal: 20, fontSize: 14, fontWeight: '600', lineHeight: 22 },
  mainBtn: { width: '100%', height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  mainBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: '900' }
});
