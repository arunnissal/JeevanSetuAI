import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTimelineEvents } from '../../api/timeline';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface TimelineEvent {
  id: string;
  title: string;
  event_type: 'UPLOAD' | 'AI' | 'SOS' | 'PROFILE';
  record_id?: string;
  created_at: string;
}

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'UPLOAD', label: 'Reports' },
  { id: 'AI', label: 'AI' },
  { id: 'PROFILE', label: 'Profile' },
  { id: 'SOS', label: 'Emergency' }
];

export default function TimelineScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Interactive expanded item tracking
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = async (showProgress = true) => {
    if (showProgress) setLoading(true);
    setError(null);
    try {
      const response = await getTimelineEvents();
      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setError(response.message || 'Failed to retrieve health journey logs.');
      }
    } catch (err: any) {
      setError('Unable to load timeline. Please check your network connection.');
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

  const getEventConfig = (type: TimelineEvent['event_type']) => {
    switch (type) {
      case 'UPLOAD':
        return {
          icon: 'document-text-outline',
          iconColor: '#0f766e',
          title: 'Medical Report Added',
          description: 'Your report has been securely added to your Medical Vault.',
          actionText: 'Open Details',
          route: (recordId?: string) => `/${recordId}`
        };
      case 'AI':
        return {
          icon: 'sparkles-outline',
          iconColor: '#8b5cf6',
          title: 'Easy Explanation Ready',
          description: 'Your report has been analyzed and translated into easy-to-understand language.',
          actionText: 'Open Details',
          route: (recordId?: string) => `/${recordId}`
        };
      case 'PROFILE':
        return {
          icon: 'person-outline',
          iconColor: '#3b82f6',
          title: 'Profile Updated',
          description: 'Your Digital Health Profile was updated.',
          actionText: 'Open Profile',
          route: () => '/(tabs)/profile'
        };
      case 'SOS':
        return {
          icon: 'alert-circle-outline',
          iconColor: '#ef4444',
          title: 'Emergency Profile Updated',
          description: 'Emergency contact information has been updated successfully.',
          actionText: 'Open Profile',
          route: () => '/(tabs)/profile'
        };
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Perform Local Search and Filter
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filter by type chip
    if (selectedFilter !== 'all') {
      result = result.filter((e) => e.event_type === selectedFilter);
    }

    // Search query matching title, description, or type
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => {
        const config = getEventConfig(e.event_type);
        const title = (config?.title || '').toLowerCase();
        const desc = (config?.description || '').toLowerCase();
        const type = e.event_type.toLowerCase();
        return title.includes(query) || desc.includes(query) || type.includes(query);
      });
    }

    return result;
  }, [events, selectedFilter, searchQuery]);

  // Group events by: Today, Yesterday, Earlier This Week, Earlier This Month, Older
  const groupedEvents = useMemo(() => {
    const today: TimelineEvent[] = [];
    const yesterday: TimelineEvent[] = [];
    const thisWeek: TimelineEvent[] = [];
    const thisMonth: TimelineEvent[] = [];
    const older: TimelineEvent[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    filteredEvents.forEach((event) => {
      const eventTime = new Date(event.created_at).getTime();
      if (eventTime >= startOfToday) {
        today.push(event);
      } else if (eventTime >= startOfYesterday) {
        yesterday.push(event);
      } else if (eventTime >= startOfWeek) {
        thisWeek.push(event);
      } else if (eventTime >= startOfMonth) {
        thisMonth.push(event);
      } else {
        older.push(event);
      }
    });

    return [
      { title: 'Today', data: today },
      { title: 'Yesterday', data: yesterday },
      { title: 'Earlier This Week', data: thisWeek },
      { title: 'Earlier This Month', data: thisMonth },
      { title: 'Older', data: older }
    ].filter((group) => group.data.length > 0);
  }, [filteredEvents]);

  // Flatten grouped list with section headers to render inside FlatList
  const flatListData = useMemo(() => {
    const list: any[] = [];
    groupedEvents.forEach((group) => {
      list.push({ isHeader: true, title: group.title });
      group.data.forEach((item, index) => {
        list.push({
          isHeader: false,
          item,
          isLastInGroup: index === group.data.length - 1,
          nextItem: group.data[index + 1] || null
        });
      });
    });
    return list;
  }, [groupedEvents]);

  const renderItem = ({ item: listItem, index }: { item: any; index: number }) => {
    if (listItem.isHeader) {
      return (
        <View className="py-4 mt-2">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            {listItem.title}
          </Text>
        </View>
      );
    }

    const { item, isLastInGroup } = listItem;
    const config = getEventConfig(item.event_type);
    if (!config) return null;

    const isExpanded = expandedId === item.id;
    const relativeTime = getRelativeTime(item.created_at);

    // Premium Touch: If current is AI event and next in array is UPLOAD event for same record, color the line green
    let isRelatedConsecutive = false;
    let scanIdx = index + 1;
    while (scanIdx < flatListData.length) {
      const nextFlat = flatListData[scanIdx];
      if (!nextFlat.isHeader) {
        const nextEv = nextFlat.item;
        if (item.event_type === 'AI' && nextEv.event_type === 'UPLOAD' && item.record_id === nextEv.record_id) {
          isRelatedConsecutive = true;
        }
        break;
      }
      scanIdx++;
    }

    return (
      <View className="flex-row">
        {/* Left Vertical Connector Line */}
        <View className="items-center mr-4">
          <View className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center z-10">
            <Ionicons name={config.icon as any} size={18} color={config.iconColor} />
          </View>
          {!isLastInGroup && (
            <View
              className={
                isRelatedConsecutive
                  ? 'w-[3px] flex-1 my-1 bg-teal-500'
                  : 'w-[2px] flex-1 my-1 bg-slate-200'
              }
            />
          )}
        </View>

        {/* Right Event card details */}
        <View className="flex-1 pb-5">
          <TouchableOpacity
            onPress={() => setExpandedId(isExpanded ? null : item.id)}
            activeOpacity={0.9}
            className="bg-white border border-slate-200 p-5 rounded-2xl"
          >
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-slate-800 font-extrabold text-sm flex-1 mr-2">
                {config.title}
              </Text>
              <Text className="text-slate-400 text-[10px] font-bold uppercase">
                {relativeTime}
              </Text>
            </View>
            <Text className="text-slate-500 text-xs leading-relaxed mb-3">
              {config.description}
            </Text>

            {/* Action buttons */}
            <View className="flex-row justify-between items-center mt-1">
              <TouchableOpacity
                onPress={() => {
                  const dest = config.route(item.record_id);
                  router.push(dest as any);
                }}
                className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl active:bg-slate-100"
              >
                <Text className="text-teal-700 font-bold text-xs">
                  {config.actionText}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Micro-interaction: display exact timestamp below if expanded */}
            {isExpanded && (
              <View className="mt-4 pt-3 border-t border-slate-100">
                <Text className="text-slate-400 text-[10px] font-semibold">
                  Timestamp: {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
      {/* Title */}
      <View className="mb-4">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">Health Journey</Text>
        <Text className="text-slate-400 text-xs font-semibold mt-1">
          Chronological story of your digital health activities.
        </Text>
      </View>

      {/* Main timeline logic */}
      {loading ? (
        // Timeline skeleton placeholders
        <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
          <View className="h-12 bg-slate-200 rounded-xl mb-4" />
          <View className="h-10 bg-slate-200 rounded-xl mb-6" />
          <View className="flex-row items-stretch">
            <View className="items-center mr-4">
              <View className="w-10 h-10 rounded-full bg-slate-200" />
              <View className="w-[2px] bg-slate-200 flex-1 my-1" />
            </View>
            <View className="flex-1 bg-white border border-slate-200 p-5 rounded-2xl mb-4 h-24" />
          </View>
          <View className="flex-row items-stretch">
            <View className="items-center mr-4">
              <View className="w-10 h-10 rounded-full bg-slate-200" />
              <View className="w-[2px] bg-slate-200 flex-1 my-1" />
            </View>
            <View className="flex-1 bg-white border border-slate-200 p-5 rounded-2xl mb-4 h-24" />
          </View>
        </ScrollView>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="warning-outline" size={40} color={colors.textMuted} />
          <Text className="text-slate-800 font-bold text-lg mt-4">We couldn't load your health journey.</Text>
          <Text className="text-slate-500 text-center mt-2 mb-6 text-xs">{error}</Text>
          <TouchableOpacity
            onPress={() => fetchEvents(true)}
            className="bg-teal-700 px-8 py-3.5 rounded-xl active:bg-teal-800"
          >
            <Text className="text-white font-bold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : events.length === 0 ? (
        // Empty State: Premium Onboarding Card
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white border border-slate-200 p-6 rounded-2xl items-center w-full">
            <Ionicons name="rocket-outline" size={40} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-lg text-center mt-4 mb-2">
              Your Health Journey Starts Here
            </Text>
            <Text className="text-slate-500 text-center text-sm leading-relaxed mb-6 px-4">
              Every report you upload will become part of your personal health timeline.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/upload')}
              className="bg-teal-700 w-full py-4 rounded-xl active:bg-teal-800 items-center"
            >
              <Text className="text-white font-bold text-sm">Upload Your First Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-1">
          {/* Instant Local Search */}
          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row items-center mb-4">
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search timeline..."
              placeholderTextColor="#94A3B8"
              className="flex-1 text-slate-800 font-medium text-sm p-0 ml-2"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {FILTER_CHIPS.map((chip) => {
                const isSelected = selectedFilter === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => setSelectedFilter(chip.id)}
                    className={
                      isSelected
                        ? 'px-4 py-2 rounded-xl mr-2 border bg-teal-700 border-teal-700'
                        : 'px-4 py-2 rounded-xl mr-2 border bg-white border-slate-200 active:bg-slate-50'
                    }
                  >
                    <Text
                      className={
                        isSelected
                          ? 'text-xs font-bold text-white'
                          : 'text-xs font-bold text-slate-600'
                      }
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Grouped list */}
          <FlatList
            data={flatListData}
            keyExtractor={(item, index) => (item.isHeader ? 'header-' + index : item.item.id)}
            renderItem={renderItem}
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
              <View className="py-12 items-center">
                <Text className="text-slate-400 text-sm">No matching events found.</Text>
              </View>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}
