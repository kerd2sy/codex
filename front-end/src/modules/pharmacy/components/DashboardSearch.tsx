import React, { memo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import BarcodeLottie from '../../../ui/shared/BarcodeLottie';

interface DashboardSearchProps {
  theme: any;
  value: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  isFocused: boolean;
  onScanPress: () => void;
  onSubmit?: () => void;
}

export const DashboardSearch = memo(({ 
  theme, value, onChangeText, onFocus, onBlur, isFocused, onScanPress, onSubmit 
}: DashboardSearchProps) => {
  return (
    <View style={styles.searchWrapper}>
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: isFocused ? theme.primary : theme.border }]}>
          <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="ابحث بالاسم أو الباركود..."
              placeholderTextColor={theme.placeholder}
              value={value}
              onChangeText={onChangeText}
              onFocus={onFocus}
              onBlur={onBlur}
              returnKeyType="search"
              onSubmitEditing={onSubmit}
          />
          {value.length > 0 && (
            <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={20} color={theme.muted || theme.placeholder} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onScanPress}>
              <BarcodeLottie style={{ width: 40, height: 40 }} />
          </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  searchWrapper: { marginHorizontal: '5%', marginVertical: 20 },
  searchContainer: { flexDirection: 'row-reverse', alignItems: 'center', height: 60, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16 },
  searchInput: { flex: 1, textAlign: 'right', fontSize: 16 },
  clearBtn: { padding: 5, marginHorizontal: 5 },
});
