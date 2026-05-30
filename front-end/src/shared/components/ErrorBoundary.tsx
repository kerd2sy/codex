import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '@/core/theme';
import * as Updates from 'expo-updates';

interface Props {
  children: ReactNode;
  theme?: 'light' | 'dark';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = async () => {
    try {
      // Reload the app to clear corrupted state
      await Updates.reloadAsync();
    } catch (e) {
      this.setState({ hasError: false, error: null });
    }
  };

  public render() {
    if (this.state.hasError) {
      const isDark = this.props.theme === 'dark';
      const theme = Colors[isDark ? 'dark' : 'light'];

      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.content}>
            <Text style={[styles.icon, { color: theme.error }]}>⚠️</Text>
            <Text style={[styles.title, { color: theme.text }]}>عذراً، حدث خطأ غير متوقع</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              واجه التطبيق مشكلة تقنية مفاجئة. جرب إعادة تشغيل التطبيق لحل المشكلة.
            </Text>
            
            <ScrollView style={[styles.errorDetails, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               <Text style={[styles.errorText, { color: theme.muted }]}>
                 {this.state.error?.toString()}
               </Text>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={this.handleReset}
            >
              <Text style={styles.buttonText}>إعادة التشغيل الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  errorDetails: {
    maxHeight: 150,
    width: '100%',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 30,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
