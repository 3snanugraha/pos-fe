import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.retry} />;
      }

      return (
        <SafeAreaView className="flex-1 bg-background justify-center items-center px-4">
          <View className="items-center">
            <Ionicons name="bug-outline" size={80} color="#EF4444" />
            <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2 text-center">
              Oops! Terjadi Kesalahan
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Aplikasi mengalami masalah teknis. Silakan coba lagi atau hubungi dukungan jika masalah berlanjut.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 w-full">
                <Text className="text-red-700 text-sm font-mono">
                  {this.state.error.message}
                </Text>
              </View>
            )}

            <View className="flex-row space-x-3">
              <Pressable
                onPress={this.retry}
                className="bg-primary px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Coba Lagi</Text>
              </Pressable>
              
              <Pressable
                onPress={() => router.replace('/(tabs)/')}
                className="bg-gray-100 px-6 py-3 rounded-xl"
              >
                <Text className="text-gray-700 font-semibold">Kembali ke Home</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
