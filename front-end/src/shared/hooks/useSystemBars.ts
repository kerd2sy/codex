import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/core/theme';

/**
 * Hook to enforce solid, theme-matching navigation bar on Android.
 * Prevents transparency issues when switching screens or opening modals.
 */
export const useSystemBars = () => {
  const { colorScheme } = useTheme();
  const theme = Colors[colorScheme];

  const updateBars = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      const isDark = colorScheme === 'dark';
      const bgColor = isDark ? '#000000' : '#FFFFFF';
      const btnStyle = isDark ? 'light' : 'dark';

      // EDGE-TO-EDGE: Only manage button styles and visibility
      await NavigationBar.setButtonStyleAsync(btnStyle).catch(() => {});
      await NavigationBar.setVisibilityAsync('visible').catch(() => {});

      // 3. Re-enforce after a tiny delay to override system transitions or component mounts
      setTimeout(async () => {
         await NavigationBar.setButtonStyleAsync(btnStyle).catch(() => {});
      }, 100);
      
    } catch (e) {
      console.warn('SystemBars update failed:', e);
    }
  }, [colorScheme]);

  useFocusEffect(
    useCallback(() => {
      updateBars();
      
      const timer = setTimeout(updateBars, 500);
      return () => clearTimeout(timer);
    }, [updateBars])
  );
};
