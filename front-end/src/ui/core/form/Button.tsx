import React from 'react';
import { 
  StyleSheet, TouchableOpacity, Text, 
  ActivityIndicator, ViewStyle, TextStyle,
  Animated, View
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'ghost' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({ 
  title, onPress, variant = 'primary', loading, disabled, style, textStyle 
}) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];

  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return {
          button: { backgroundColor: theme.accent, shadowColor: theme.accent },
          text: { color: '#FFF' }
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
          text: { color: theme.primary }
        };
      case 'outline':
        return {
          button: { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.primary, elevation: 0, shadowOpacity: 0 },
          text: { color: theme.primary }
        };
      default:
        return {
          button: { backgroundColor: theme.primary, shadowColor: theme.primary },
          text: { color: '#FFF' }
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <TouchableOpacity 
      onPress={onPress}
      disabled={loading || disabled}
      style={[
        styles.button, 
        vStyles.button,
        disabled && { opacity: 0.5, elevation: 0 },
        style
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'accent' ? "#FFF" : theme.primary} />
      ) : (
        <Text style={[styles.text, vStyles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3
  }
});
