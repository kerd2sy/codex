import React from 'react';
import { 
  StyleSheet, View, Text, Modal, 
  TouchableOpacity, Pressable 
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DownloadModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onShare: () => void;
  title?: string;
  subtitle?: string;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ 
  visible, onClose, onSave, onShare, title = 'الملف جاهز', subtitle
}) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.content, { backgroundColor: theme.surface, paddingBottom: 35 }]}>
          <LottieView 
            source={require('@/assets/json/PDF.json')} 
            autoPlay 
            loop={false} 
            speed={1.5} 
            style={styles.lottie} 
          />
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
          )}
          
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.primary }]} 
            onPress={onSave}
          >
            <Text style={styles.btnText}>التحميل فى الهاتف</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]} 
            onPress={onShare}
          >
            <Text style={[styles.btnText, { color: theme.text }]}>مشاركة الملف عبر التطبيقات</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.surface, borderWidth: 1, borderColor: '#FF7043' }]} 
            onPress={onClose}
          >
            <Text style={[styles.btnText, { color: '#FF7043' }]}>الغاء التحميل</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, gap: 12 },
  lottie: { width: 100, height: 100, marginBottom: -10, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 20, opacity: 0.8 },
  btn: { height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '900' }
});
