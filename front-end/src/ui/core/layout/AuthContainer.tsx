import React from 'react';
import { 
  StyleSheet, View, Text, KeyboardAvoidingView, 
  Platform, ScrollView, Dimensions, 
  TouchableOpacity, StatusBar, Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

interface AuthContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  extraKeyboardPadding?: number;
}

export const AuthContainer: React.FC<AuthContainerProps> = ({ 
  children, title, subtitle, showBack, onBack, extraKeyboardPadding = 0 
}) => {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const content = (
    <ScrollView 
      contentContainerStyle={[
        styles.scrollContent, 
        { paddingTop: height * 0.28, paddingBottom: isKeyboardVisible ? (150 + extraKeyboardPadding) : 0 }
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.card}>
        {children}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.outer}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor="#16193E" />
      
      {/* Deep Navy Header - STRAIGHT BOTTOM */}
      <View style={[styles.topSection, { height: height * 0.35 }]}>
         {/* Top-Left Fan Pattern (Radial) */}
         <View style={styles.patternFan} />
         <View style={styles.patternDashed} />

         <View style={[styles.headerContent, { paddingTop: insets.top + 20 }]}>
            {showBack && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                <Ionicons name="chevron-forward" size={24} color="#121433" />
              </TouchableOpacity>
            )}

            <View style={styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
         </View>
      </View>

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView 
          behavior="padding"
          style={styles.flex}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>
          {content}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#FFF' },
  flex: { flex: 1 },
  topSection: {
    backgroundColor: '#16193E', // Specific navy from image
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  patternFan: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  patternDashed: {
    position: 'absolute',
    top: 20,
    right: -20,
    width: 150,
    height: 150,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderStyle: 'dashed',
    transform: [{ rotate: '45deg' }]
  },
  headerContent: {
      paddingHorizontal: 24,
      alignItems: 'center',
  },
  backBtn: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 0 : 10,
      right: 24, // RTL position for Arabic
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
      zIndex: 100
  },
  textContainer: {
      marginTop: 20,
      alignItems: 'center',
  },
  title: {
      color: '#FFF',
      fontSize: 30,
      fontWeight: '900',
      marginBottom: 8,
      textAlign: 'center'
  },
  subtitle: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 30,
      lineHeight: 22,
  },
  
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 0, // Card handles padding
  },

  card: { 
    backgroundColor: '#FFF',
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 40, // Match image curve
    borderTopRightRadius: 40,
    padding: 24,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 20,
    minHeight: height * 0.72
  }
});
