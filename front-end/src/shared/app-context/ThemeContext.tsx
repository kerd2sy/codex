import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme, Appearance, ColorSchemeName, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const deviceColorScheme = useDeviceColorScheme();
    const [themeMode, setInternalThemeMode] = useState<ThemeMode>('auto');

    // Robust listener for system theme changes
    useEffect(() => {
        const loadTheme = async () => {
            const saved = await AsyncStorage.getItem('@theme_mode');
            if (saved === 'light' || saved === 'dark' || saved === 'auto') {
                setInternalThemeMode(saved as ThemeMode);
            }
        };
        loadTheme();

        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            // Re-trigger re-render when system theme changes
            // Only relevant if themeMode is 'auto'
            if (themeMode === 'auto') {
                // We don't necessarily need to set state here because useDeviceColorScheme() 
                // hook (deviceColorScheme) should re-render the component.
                // However, some versions of RN benefit from a forced re-render or being explicit.
            }
        });

        return () => subscription.remove();
    }, [themeMode]);

    const setThemeMode = async (mode: ThemeMode) => {
        setInternalThemeMode(mode);
        await AsyncStorage.setItem('@theme_mode', mode);
    };

    // Robust color scheme resolution
    // Use synchronous Appearance.getColorScheme() as the primary fallback to avoid initial flash
    const systemScheme = useDeviceColorScheme() || Appearance.getColorScheme() || 'light';
    
    const colorScheme = themeMode === 'auto'
        ? systemScheme
        : themeMode;

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode, colorScheme: colorScheme as 'light' | 'dark' }}>
            <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#121212' : '#FFFFFF' }}>
                {children}
            </View>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
