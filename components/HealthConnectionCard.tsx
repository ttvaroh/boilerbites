/**
 * Health Connection Card Component
 * Reusable card for displaying health app connection status
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppleHealthService } from '../lib/health-integrations/apple-health/AppleHealthService';
import { FitbitService } from '../lib/health-integrations/fitbit/FitbitService';
import { HealthAppConnection } from '../lib/health-integrations/base/types';

interface HealthConnectionCardProps {
  appType: 'apple_health' | 'fitbit';
  appName: string;
  appIcon: keyof typeof Ionicons.glyphMap;
  appColor: string;
}

export default function HealthConnectionCard({
  appType,
  appName,
  appIcon,
  appColor,
}: HealthConnectionCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [connection, setConnection] = useState<HealthAppConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (user) {
      checkConnection();
    }
  }, [user]);

  const checkConnection = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('app_type', appType)
        .maybeSingle();

      if (error) {}

      setConnection(data);
    } catch (_) {
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let service: AppleHealthService | FitbitService;
      
      if (appType === 'apple_health') {
        service = new AppleHealthService();
      } else {
        service = new FitbitService();
      }

      const result = await service.connect(user.id);

      if (result.success) {
        Alert.alert('Success', `${appName} connected successfully!`);
        await checkConnection();
      } else {
        Alert.alert('Connection Failed', result.error || 'Failed to connect');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      `Are you sure you want to disconnect ${appName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setLoading(true);
            try {
              let service: AppleHealthService | FitbitService;
              
              if (appType === 'apple_health') {
                service = new AppleHealthService();
              } else {
                service = new FitbitService();
              }

              const result = await service.disconnect(user.id);

              if (result.success) {
                Alert.alert('Success', `${appName} disconnected successfully`);
                await checkConnection();
              } else {
                Alert.alert('Error', result.error || 'Failed to disconnect');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to disconnect');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (lastSyncAt?: string) => {
    if (!lastSyncAt) return 'Never';
    
    const syncDate = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return syncDate.toLocaleDateString();
  };

  if (checking) {
    return (
      <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-5 border border-gray-700/50">
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color={appColor} />
          <Text className="text-gray-400 text-sm font-sora ml-3">Checking connection...</Text>
        </View>
      </View>
    );
  }

  const isConnected = connection?.enabled && connection?.last_sync_status !== 'error';

  return (
    <View className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-5 border border-gray-700/50 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View
            className="rounded-full w-12 h-12 items-center justify-center mr-3"
            style={{ backgroundColor: `${appColor}20` }}
          >
            <Ionicons name={appIcon} size={24} color={appColor} />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-sora-semibold">{appName}</Text>
            {isConnected ? (
              <Text className="text-gray-400 text-xs font-sora">
                Last sync: {formatLastSync(connection.last_sync_at)}
              </Text>
            ) : (
              <Text className="text-gray-500 text-xs font-sora">Not connected</Text>
            )}
          </View>
        </View>
        {isConnected && (
          <View className="w-2 h-2 rounded-full bg-green-500" />
        )}
      </View>

      {connection?.last_sync_error && (
        <View className="bg-red-500/20 rounded-lg p-2 mb-3">
          <Text className="text-red-400 text-xs font-sora">
            Last sync failed: {connection.last_sync_error}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={isConnected ? handleDisconnect : handleConnect}
        disabled={loading}
        className={`py-3 px-4 rounded-xl flex-row items-center justify-center ${
          isConnected
            ? 'bg-red-600/90 border border-red-500/30'
            : `bg-[${appColor}]/90 border border-[${appColor}]/30`
        }`}
        style={{
          backgroundColor: isConnected ? 'rgba(220, 38, 38, 0.9)' : `${appColor}90`,
          borderColor: isConnected ? 'rgba(239, 68, 68, 0.3)' : `${appColor}30`,
        }}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={isConnected ? 'close-circle-outline' : 'link-outline'}
              size={18}
              color="#FFFFFF"
            />
            <Text className="text-white text-sm font-sora-semibold ml-2">
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
