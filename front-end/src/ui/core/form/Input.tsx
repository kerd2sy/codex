import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, TextInput, 
  TextInputProps, ViewStyle, Animated, TouchableOpacity 
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  error?: string;
  uppercaseLabel?: boolean;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(({ 
  label, icon, containerStyle, error, uppercaseLabel = true, showPasswordToggle, onFocus, onBlur, ...props 
}, ref) => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusAnim] = useState(new Animated.Value(0));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.text }]}>
          {uppercaseLabel ? label.toUpperCase() : label}
        </Text>
      )}
      <View style={[
        styles.inputWrap, 
        { 
          backgroundColor: theme.card, 
          borderColor: isFocused ? theme.accent : theme.border,
          borderWidth: isFocused ? 1.5 : 1,
        }
      ]}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={18} 
            color="#999" 
            style={styles.icon} 
          />
        )}
        <TextInput
          ref={ref}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.placeholder}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={props.secureTextEntry && !isPasswordVisible}
        />
        {showPasswordToggle && (
          <TouchableOpacity 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeBtn}
          >
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#999" 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: 22 },
  label: { 
    fontSize: 12, 
    fontWeight: '900', 
    marginBottom: 8, 
    textAlign: 'right',
    marginRight: 4,
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
    opacity: 0.8
  },
  inputWrap: {
    height: 58,
    borderRadius: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    textAlign: 'right',
    fontWeight: '700',
  },
  icon: {
    marginLeft: 12,
    opacity: 0.6
  },
  eyeBtn: {
      padding: 8
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
    marginRight: 8,
    fontWeight: '800'
  }
});
