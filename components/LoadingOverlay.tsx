import React from 'react';
import { View, Text, ActivityIndicator, Modal } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  visible, 
  message = 'Memuat...', 
  transparent = true 
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-xl p-6 items-center min-w-[200px]">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-gray-700 font-medium mt-3 text-center">
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default LoadingOverlay;
