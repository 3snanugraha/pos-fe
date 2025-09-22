import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary';
      case 'secondary':
        return 'bg-secondary';
      case 'outline':
        return 'bg-transparent border border-primary';
      default:
        return 'bg-primary';
    }
  };

  const getTextClasses = () => {
    switch (variant) {
      case 'outline':
        return 'text-primary';
      default:
        return 'text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'py-1 px-3';
      case 'md':
        return 'py-2 px-4';
      case 'lg':
        return 'py-3 px-6';
      default:
        return 'py-2 px-4';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'md':
        return 'text-base';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  return (
    <Pressable
      onPress={loading || disabled ? undefined : onPress}
      className={`
        ${getVariantClasses()} 
        ${getSizeClasses()} 
        rounded-lg 
        items-center 
        justify-center 
        flex-row
        ${disabled ? 'opacity-50' : 'opacity-100'}
        ${fullWidth ? 'w-full' : 'w-auto'}
      `}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? '#1E40AF' : '#FFFFFF'} 
        />
      ) : (
        <View className="flex-row items-center justify-center space-x-2">
          {icon && <View>{icon}</View>}
          <Text className={`font-medium ${getTextClasses()} ${getTextSizeClasses()}`}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

export default Button;