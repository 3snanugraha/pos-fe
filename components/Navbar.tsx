import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface NavbarProps {
  title: string;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
  showLogo?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  title,
  showBackButton = false,
  rightAction,
  showLogo = false,
}) => {
  const router = useRouter();

  return (
    <View className="bg-primary pt-4 pb-4 px-4 rounded-b-3xl shadow-md">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {showBackButton && (
            <Pressable
              onPress={() => router.back()}
              className="mr-3 p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
          )}
          {showLogo && (
            <View className="w-8 h-8 bg-white rounded-lg items-center justify-center mr-3">
              <Image
                source={require('../assets/images/logo.png')}
                style={{ width: 24, height: 24 }}
                contentFit="contain"
                onLoad={() => console.log('✅ Navbar logo loaded successfully')}
                onError={(error) => console.log('❌ Navbar logo failed to load:', error)}
              />
            </View>
          )}
          <Text className="text-white text-xl font-bold">{title}</Text>
        </View>
        
        {rightAction && (
          <View>
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
};

export default Navbar;