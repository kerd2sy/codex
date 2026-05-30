import React, { useRef, useEffect } from 'react';
import { 
  StyleSheet, View, Text, Modal, 
  TouchableOpacity, Pressable, Dimensions, ActivityIndicator,
  Animated, Easing
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StatusModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'info' | 'warning' | 'location';
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  secondaryLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onSecondaryAction?: () => void;
  loading?: boolean;
  secondaryIcon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
}

export const StatusModal: React.FC<StatusModalProps> = ({ 
  visible, type, title, message, 
  confirmLabel = 'حسناً', 
  cancelLabel, 
  secondaryLabel,
  onConfirm, 
  onCancel,
  onSecondaryAction,
  loading = false,
  secondaryIcon,
  accentColor
}) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const tagColor = accentColor || theme.accent;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  const getIconForLabel = (label: string): any => {
    const l = label.toLowerCase();
    if (l.includes('صيدلية') || l.includes('pharmacy')) return 'business';
    if (l.includes('رقم') || l.includes('invoice') || l.includes('id')) return 'receipt';
    if (l.includes('البيان') || l.includes('statement') || l.includes('detail')) return 'cube';
    if (l.includes('تاريخ') || l.includes('date')) return 'calendar';
    if (l.includes('إجمالي') || l.includes('total')) return 'wallet-outline';
    if (l.includes('أصناف') || l.includes('items')) return 'layers-outline';
    return 'information-circle';
  };

  const renderMessage = () => {
    if (!message) return null;
    
    const lines = message.split('\n');
    let pharmacy = '';
    let statement = '';
    const otherFields: { label: string, value: string }[] = [];

    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const label = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        const l = label.toLowerCase();
        if (l.includes('صيدلية') || l.includes('pharmacy')) {
          pharmacy = value;
        } else if (l.includes('البيان') || l.includes('statement')) {
          statement = value;
        } else {
          otherFields.push({ label, value });
        }
      }
    });

    if (pharmacy === '' && statement === '' && otherFields.length === 0) {
      return (
        <Text style={[styles.heroSub, { color: theme.muted }]}>
            {message}
        </Text>
      );
    }

    return (
      <View style={styles.dataContainer}>
        {/* Primary Pharmacy Card */}
        {pharmacy !== '' && (
          <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border + '30' }]}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconCircle, { backgroundColor: tagColor + '15' }]}>
                <Ionicons name="business-outline" size={20} color={tagColor} />
              </View>
              <Text style={[styles.topCardValue, { color: theme.text }]}>{pharmacy}</Text>
            </View>
          </View>
        )}

        {/* Secondary Info Grid */}
        <View style={styles.metaGrid}>
          {otherFields.map((field, idx) => (
            <View key={idx} style={[styles.gridCard, { backgroundColor: theme.card, borderColor: theme.border + '30' }]}>
               <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                 <Ionicons name={getIconForLabel(field.label)} size={18} color={tagColor} />
                 <Text style={[styles.gridValue, { color: theme.text, fontSize: 14 }]}>{field.value}</Text>
               </View>
            </View>
          ))}
        </View>

        {/* Full-width Statement Banner */}
        {statement !== '' && (
          <View style={[styles.statementBanner, { backgroundColor: theme.card, borderColor: theme.border + '30' }]}>
            <View style={[styles.statementContent, { justifyContent: 'space-around' }]}>
              {statement.split(' - ').map((part, idx) => {
                const cleanPart = part.replace(/^البيان:?\s*/, '').replace(/[()]/g, '').trim();
                const isBag = cleanPart.includes('شنطة');
                const isPack = cleanPart.includes('باكت') || cleanPart.includes('بامت');
                const isFreeze = cleanPart.includes('ثلاجة');
                
                let icon: keyof typeof Ionicons.glyphMap = 'cube-outline';
                if (isBag) icon = 'briefcase-outline';
                else if (isPack) icon = 'file-tray-full-outline';
                else if (isFreeze) icon = 'snow-outline';

                const valMatch = cleanPart.match(/\((.*?)\)/);
                const value = valMatch ? valMatch[1] : cleanPart;

                return (
                  <View key={idx} style={[styles.statementItem, { backgroundColor: tagColor + '08' }]}>
                    <Ionicons name={icon} size={18} color={tagColor} style={{ marginLeft: 6 }} />
                    <Text style={[styles.statementItemText, { color: theme.text, fontSize: 16 }]}>{value}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} 
          onPress={() => !loading && onConfirm()} 
        />
        <View style={[
          styles.content, 
          { 
            backgroundColor: theme.surface,
            paddingBottom: insets.bottom + 24
          }
        ]}>
          <View style={[styles.handle, { backgroundColor: theme.muted + '30' }]} />
          
          <View style={styles.hero}>
            {renderMessage()}
          </View>

          <View style={styles.btns}>
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: theme.primary }]} 
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.mainBtnTxt}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>

            {secondaryLabel && onSecondaryAction && (
              <TouchableOpacity 
                style={[styles.mainBtn, { backgroundColor: theme.surface, borderColor: tagColor, borderWidth: 1.5, marginTop: 5 }]} 
                onPress={onSecondaryAction}
                disabled={loading}
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  {secondaryIcon && <Ionicons name={secondaryIcon} size={20} color={tagColor} />}
                  <Text style={[styles.mainBtnTxt, { color: tagColor }]}>{secondaryLabel}</Text>
                </View>
              </TouchableOpacity>
            )}

            {cancelLabel && onCancel && (
              <TouchableOpacity 
                style={[styles.secBtn]} 
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={[styles.secBtnTxt, { color: theme.muted }]}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'center'
  },
  content: { 
    width: '100%',
    paddingHorizontal: 20, 
    paddingTop: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  hero: { width: '100%', alignItems: 'flex-end', marginBottom: 12 },
  heroTit: { fontSize: 17, fontWeight: '900', marginBottom: 12, textAlign: 'right' },
  heroSub: { textAlign: 'center', paddingHorizontal: 10, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  
  dataContainer: { width: '100%', gap: 12, marginBottom: 10 },
  
  topCard: { 
    width: '100%', 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  topCardValue: { fontSize: 16, fontWeight: '900', textAlign: 'right', flex: 1 },

  metaGrid: { 
    flexDirection: 'row-reverse', 
    gap: 10, 
    width: '100%',
    flexWrap: 'wrap'
  },
  gridCard: { 
    width: (SCREEN_WIDTH - 50) / 2, 
    padding: 12, 
    borderRadius: 18, 
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  gridValue: { fontSize: 13, fontWeight: '900' },

  statementBanner: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statementHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8
  },
  statementLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  statementContent: {
    padding: 12,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  statementItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statementItemText: {
    fontSize: 12,
    fontWeight: '700'
  },

  btns: { width: '100%', gap: 10, marginTop: 12 },
  mainBtn: { width: '100%', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  mainBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  secBtn: { width: '100%', height: 40, justifyContent: 'center', alignItems: 'center' },
  secBtnTxt: { fontSize: 14, fontWeight: '700' }
});
