import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import { fetchCustomerNotifications, Notification } from '../../services/api';
import { verifyToken } from '../../services/auth';
import { handleAuthError, getErrorMessage } from '../../utils/auth';

const NotificationsScreen = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Hari ini';
    } else if (diffDays === 2) {
      return 'Kemarin';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} hari yang lalu`;
    } else {
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'order': 'receipt-outline',
      'promo': 'pricetag-outline',
      'payment': 'card-outline',
      'shipping': 'car-outline',
      'system': 'settings-outline',
      'general': 'notifications-outline',
    };
    return icons[type] as any || 'notifications-outline';
  };

  const getNotificationColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'order': 'bg-blue-100 text-blue-600',
      'promo': 'bg-green-100 text-green-600',
      'payment': 'bg-purple-100 text-purple-600',
      'shipping': 'bg-orange-100 text-orange-600',
      'system': 'bg-gray-100 text-gray-600',
      'general': 'bg-primary/10 text-primary',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const isValidToken = await verifyToken();
      
      if (!isValidToken) {
        setError('Sesi Anda telah berakhir, akan diarahkan ke halaman login');
        await handleAuthError({ message: 'Token expired or invalid' });
        return;
      }

      const result = await fetchCustomerNotifications({ per_page: 50 });
      setNotifications(result.data);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      const isAuthError = await handleAuthError(error);
      if (!isAuthError) {
        setError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    // TODO: Implement mark as read functionality
    console.log('Notification pressed:', notification.id);
    
    // Navigate based on notification type
    switch (notification.tipe) {
      case 'order':
        router.push('/orders');
        break;
      case 'promo':
        router.push('/(tabs)/products');
        break;
      case 'payment':
        router.push('/orders');
        break;
      case 'shipping':
        router.push('/orders');
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Tandai Semua Sudah Dibaca',
      'Apakah Anda yakin ingin menandai semua notifikasi sebagai sudah dibaca?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya',
          onPress: () => {
            // TODO: Implement mark all as read API
            setNotifications(prev => 
              prev.map(notification => ({ ...notification, is_read: true }))
            );
            Alert.alert('Berhasil!', 'Semua notifikasi telah ditandai sebagai sudah dibaca');
          },
        },
      ]
    );
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') {
      return !notification.is_read;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    loadNotifications();
  }, []);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Notifikasi" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Notifikasi" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Memuat notifikasi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (filteredNotifications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Notifikasi" showBackButton={true} />
        
        {/* Filter Tabs */}
        <View className="bg-white px-4 py-3">
          <View className="flex-row">
            <Pressable
              onPress={() => setFilter('all')}
              className={`flex-1 py-2 rounded-xl items-center mr-2 ${
                filter === 'all' ? 'bg-primary' : 'bg-gray-100'
              }`}
            >
              <Text className={`font-medium ${
                filter === 'all' ? 'text-white' : 'text-gray-700'
              }`}>
                Semua ({notifications.length})
              </Text>
            </Pressable>
            
            <Pressable
              onPress={() => setFilter('unread')}
              className={`flex-1 py-2 rounded-xl items-center ml-2 ${
                filter === 'unread' ? 'bg-primary' : 'bg-gray-100'
              }`}
            >
              <Text className={`font-medium ${
                filter === 'unread' ? 'text-white' : 'text-gray-700'
              }`}>
                Belum Dibaca ({unreadCount})
              </Text>
            </Pressable>
          </View>
        </View>
        
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="notifications-outline" size={80} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-600 mt-4 mb-2">
            {filter === 'unread' ? 'Tidak Ada Notifikasi Baru' : 'Belum Ada Notifikasi'}
          </Text>
          <Text className="text-gray-500 text-center">
            {filter === 'unread' 
              ? 'Semua notifikasi sudah dibaca' 
              : 'Notifikasi akan muncul di sini'
            }
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar 
        title="Notifikasi" 
        showBackButton={true}
        rightAction={
          unreadCount > 0 ? (
            <Pressable onPress={handleMarkAllAsRead}>
              <Text className="text-white font-medium">Baca Semua</Text>
            </Pressable>
          ) : null
        }
      />

      {/* Filter Tabs */}
      <View className="bg-white px-4 py-3">
        <View className="flex-row">
          <Pressable
            onPress={() => setFilter('all')}
            className={`flex-1 py-2 rounded-xl items-center mr-2 ${
              filter === 'all' ? 'bg-primary' : 'bg-gray-100'
            }`}
          >
            <Text className={`font-medium ${
              filter === 'all' ? 'text-white' : 'text-gray-700'
            }`}>
              Semua ({notifications.length})
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => setFilter('unread')}
            className={`flex-1 py-2 rounded-xl items-center ml-2 ${
              filter === 'unread' ? 'bg-primary' : 'bg-gray-100'
            }`}
          >
            <Text className={`font-medium ${
              filter === 'unread' ? 'text-white' : 'text-gray-700'
            }`}>
              Belum Dibaca ({unreadCount})
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {filteredNotifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              className={`bg-white rounded-xl p-4 mb-3 ${
                !notification.is_read ? 'border-l-4 border-primary' : ''
              }`}
            >
              <View className="flex-row">
                {/* Notification Icon */}
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                  getNotificationColor(notification.tipe)
                }`}>
                  <Ionicons 
                    name={getNotificationIcon(notification.tipe)} 
                    size={24} 
                    color="currentColor" 
                  />
                </View>

                {/* Notification Content */}
                <View className="flex-1">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className={`font-semibold text-gray-900 flex-1 ${
                      !notification.is_read ? 'font-bold' : ''
                    }`} numberOfLines={2}>
                      {notification.judul}
                    </Text>
                    
                    {!notification.is_read && (
                      <View className="w-3 h-3 bg-primary rounded-full ml-2 mt-1" />
                    )}
                  </View>
                  
                  <Text className={`text-gray-600 mb-2 ${
                    !notification.is_read ? 'font-medium' : ''
                  }`} numberOfLines={3}>
                    {notification.pesan}
                  </Text>
                  
                  <Text className="text-gray-500 text-sm">
                    {formatDate(notification.tanggal_kirim)}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
