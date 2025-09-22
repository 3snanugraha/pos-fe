import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod } from '../services/api';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  selected?: boolean;
  onSelect?: () => void;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  selected = false,
  onSelect,
}) => {
  const getIconName = () => {
    switch (method.jenis_pembayaran.toLowerCase()) {
      case 'tunai':
        return 'cash-outline';
      case 'transfer':
        return 'card-outline';
      case 'ewallet':
        return 'wallet-outline';
      default:
        return 'card-outline';
    }
  };

  return (
    <Pressable
      onPress={onSelect}
      className={`
        p-4 mb-3 rounded-xl flex-row items-center justify-between
        ${selected ? 'bg-blue-100 border border-primary' : 'bg-white border border-gray-200'}
      `}
    >
      <View className="flex-row items-center">
        <View className={`
          w-10 h-10 rounded-full items-center justify-center mr-3
          ${selected ? 'bg-primary' : 'bg-gray-100'}
        `}>
          <Ionicons 
            name={getIconName()} 
            size={20} 
            color={selected ? 'white' : '#1E40AF'} 
          />
        </View>
        
        <View>
          <Text className="font-bold text-gray-800">{method.nama_metode}</Text>
          <View className="flex-row">
            {method.biaya_admin > 0 && (
              <Text className="text-xs text-gray-500 mr-2">
                Admin: Rp {method.biaya_admin.toLocaleString('id-ID')}
              </Text>
            )}
            {method.persentase_biaya > 0 && (
              <Text className="text-xs text-gray-500">
                Fee: {method.persentase_biaya}%
              </Text>
            )}
          </View>
        </View>
      </View>
      
      {selected && (
        <Ionicons name="checkmark-circle" size={24} color="#1E40AF" />
      )}
    </Pressable>
  );
};

export default PaymentMethodCard;