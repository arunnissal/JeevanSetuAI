import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTimelineEvents } from '../../api/timeline';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

interface TimelineEvent {
  id: string;
  title: string;
  event_type: 'UPLOAD' | 'AI' | 'SOS' | 'PROFILE';
  record_id?: string;
  created_at: string;
}

export default function TimelineScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async (showProgress = true) => {
    if (showProgress) setLoading(true);
    setError(null);
    try {
      const response = await getTimelineEvents();
      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setError(response.message || 'Failed to fetch timeline.');
      }
    } catch (err: any) {
      setError('Unable to retrieve timeline events. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents(false);
  };

  const getEventIcon = (type: TimelineEvent['event_type']) => {
    switch (type) {
      case 'UPLOAD': return '📂';
      case 'AI': return '🧠';
      case 'SOS': return '🚨';
      case 'PROFILE': return '👤';
      default: return '📄';
    }
  };

  const handleEventPress = (event: TimelineEvent) => {
    if (event.record_id) {
      router.push(`/(vault)/${event.record_id}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-slate-500 mt-4 font-medium">Loading timeline...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Text className="text-3xl mb-2">⚠️</Text>
        <Text className="text-slate-800 font-bold text-lg">Failed to load timeline</Text>
        <Text className="text-slate-500 text-center mt-2 mb-6">{error}</Text>
        <TouchableOpacity
          onPress={() => fetchEvents(true)}
          className="bg-teal-700 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
      <Text className="text-3xl font-extrabold text-slate-900 mb-6">Timeline</Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-4xl mb-3">📭</Text>
            <Text className="text-slate-800 font-bold text-lg">No events recorded</Text>
            <Text className="text-slate-400 text-sm text-center mt-2 px-6">
              When you upload medical reports or update your profiles, your activity history will show up here.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => handleEventPress(item)}
            disabled={!item.record_id}
            activeOpacity={item.record_id ? 0.7 : 1}
            className={`flex-row items-center bg-white border border-slate-200 p-4 rounded-2xl mb-3 shadow-sm ${
              item.record_id ? 'active:bg-slate-50' : ''
            }`}
          >
            <View className="bg-slate-50 h-12 w-12 rounded-xl justify-center items-center mr-4 border border-slate-100">
              <Text className="text-2xl">{getEventIcon(item.event_type)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-sm">{item.title}</Text>
              <Text className="text-slate-400 text-xs mt-1">
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            {item.record_id && (
              <Text className="text-teal-700 text-xs font-bold">View ➔</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
