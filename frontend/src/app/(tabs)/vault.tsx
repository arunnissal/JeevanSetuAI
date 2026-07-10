import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVaultRecords } from '../../api/vault';
import { colors } from '../../theme/colors';

interface RecordItem {
  id: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  record_type: 'blood_test' | 'lab_report' | 'prescription' | 'discharge_summary' | 'doctor_consultation' | 'vaccination' | 'medical_certificate' | 'radiology' | 'other';
  created_at: string;
  metadata: {
    original_filename?: string;
  };
  analysis?: {
    ai_summary?: string;
  };
}

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'blood_test', label: '🩸 Blood Test' },
  { id: 'lab_report', label: '🧪 Lab Report' },
  { id: 'prescription', label: '💊 Prescription' },
  { id: 'radiology', label: '🩻 Radiology' },
  { id: 'doctor_consultation', label: '👨‍⚕️ Consultation' },
  { id: 'discharge_summary', label: '🏥 Discharge' },
  { id: 'vaccination', label: '💉 Vaccination' },
  { id: 'medical_certificate', label: '📄 Medical Certificate' },
  { id: 'other', label: '📁 Other' },
];

type SortType = 'newest' | 'oldest' | 'alphabetical';

export default function VaultScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter, Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');

  const fetchRecords = async (showProgress = true) => {
    if (showProgress) setLoading(true);
    setError(null);
    try {
      const response = await getVaultRecords();
      if (response.success && response.data) {
        setRecords(response.data);
      } else {
        setError(response.message || 'Failed to retrieve records.');
      }
    } catch (err: any) {
      setError('Unable to fetch medical records. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecords(false);
  };

  const getRecordTypeBadge = (type: RecordItem['record_type']) => {
    switch (type) {
      case 'blood_test': return '🩸 Blood Test';
      case 'lab_report': return '🧪 Lab Report';
      case 'prescription': return '💊 Prescription';
      case 'radiology': return '🩻 Radiology';
      case 'doctor_consultation': return '👨‍⚕️ Consultation';
      case 'discharge_summary': return '🏥 Discharge';
      case 'vaccination': return '💉 Vaccination';
      case 'medical_certificate': return '📄 Medical Certificate';
      default: return '📁 Other';
    }
  };

  const getStatusConfig = (status: RecordItem['processing_status']) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Ready',
          badgeStyle: 'text-emerald-700 bg-emerald-50 border-emerald-100',
        };
      case 'processing':
        return {
          label: 'AI is understanding your report...',
          badgeStyle: 'text-sky-700 bg-sky-50 border-sky-100',
        };
      case 'pending':
        return {
          label: 'Preparing your report...',
          badgeStyle: 'text-amber-700 bg-amber-50 border-amber-100',
        };
      case 'failed':
        return {
          label: "Couldn't process this report",
          badgeStyle: 'text-red-700 bg-red-50 border-red-100',
        };
    }
  };

  // Perform Local Search, Filtering and Sorting
  const processedRecords = useMemo(() => {
    let result = [...records];

    // 1. Filter by category chip
    if (selectedChip !== 'all') {
      result = result.filter((r) => r.record_type === selectedChip);
    }

    // 2. Search query matching (title, type, date)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const title = (r.metadata.original_filename || '').toLowerCase();
        const type = getRecordTypeBadge(r.record_type).toLowerCase();
        const date = new Date(r.created_at).toLocaleDateString().toLowerCase();
        return title.includes(query) || type.includes(query) || date.includes(query);
      });
    }

    // 3. Sorting logic
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'alphabetical') {
        const nameA = (a.metadata.original_filename || '').toLowerCase();
        const nameB = (b.metadata.original_filename || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return result;
  }, [records, selectedChip, searchQuery, sortBy]);

  const renderCard = ({ item }: { item: RecordItem }) => {
    const statusCfg = getStatusConfig(item.processing_status);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/${item.id}`)}
        className="bg-white border border-slate-200 p-5 rounded-2xl mb-4 active:bg-slate-50 shadow-sm"
      >
        {/* Top line: Category Badge + Status Badge */}
        <View className="flex-row justify-between items-center mb-3">
          <View className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            <Text className="text-slate-700 text-xs font-semibold">
              {getRecordTypeBadge(item.record_type)}
            </Text>
          </View>
          <View className={`px-2.5 py-0.5 rounded-full border ${statusCfg.badgeStyle}`}>
            <Text className="text-[10px] font-bold uppercase tracking-wider">
              {item.processing_status === 'completed' ? 'Ready' : item.processing_status}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text className="text-slate-800 font-extrabold text-base mb-1" numberOfLines={1}>
          {item.metadata.original_filename || 'Medical Report'}
        </Text>

        {/* Date */}
        <Text className="text-slate-400 text-xs mb-3">
          Uploaded: {new Date(item.created_at).toLocaleDateString()}
        </Text>

        {/* Status text or AI summary */}
        {item.processing_status === 'completed' ? (
          item.analysis?.ai_summary ? (
            <Text className="text-slate-500 text-sm leading-relaxed mb-1" numberOfLines={2}>
              {item.analysis.ai_summary}
            </Text>
          ) : (
            <Text className="text-slate-400 text-sm italic">AI Summary Ready</Text>
          )
        ) : item.processing_status === 'failed' ? (
          <View className="bg-rose-50 border border-rose-100 p-3 rounded-xl mt-1">
            <Text className="text-red-700 text-xs leading-relaxed mb-3">
              We couldn't understand this report. Please upload a clearer image or PDF.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/upload')}
              className="bg-red-600 py-2.5 rounded-lg active:bg-red-700 items-center"
            >
              <Text className="text-white font-bold text-xs">Upload Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-teal-600 font-semibold text-sm italic">
            {statusCfg.label}
          </Text>
        )}

        {/* Arrow chevron indicator (unless failed, where we show Upload Again action button) */}
        {item.processing_status !== 'failed' && (
          <View className="flex-row justify-end mt-2">
            <Text className="text-slate-300 text-base">➔</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
      {/* Header section */}
      <View className="flex-row justify-between items-baseline mb-4">
        <View>
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">Medical Vault</Text>
          <Text className="text-slate-400 text-xs font-semibold mt-1">
            Securely store and organize your medical records.
          </Text>
        </View>
        {!loading && !error && records.length > 0 && (
          <Text className="text-teal-700 font-bold text-xs bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-md">
            {processedRecords.length} Reports
          </Text>
        )}
      </View>

      {/* Main View rendering loader skeleton, error retry, empty or list */}
      {loading ? (
        // Loading Progressive Skeleton (Individual card outlines, no fullscreen spinner)
        <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
          <View className="h-12 bg-slate-200 rounded-xl mb-4 animate-pulse" />
          <View className="h-10 bg-slate-200 rounded-xl mb-6 animate-pulse" />
          <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-4 shadow-sm">
            <View className="h-4 w-28 bg-slate-200 rounded-md animate-pulse" />
            <View className="h-5 w-48 bg-slate-200 rounded-md mt-4 animate-pulse" />
            <View className="h-4 w-full bg-slate-100 rounded-md mt-4 animate-pulse" />
          </View>
          <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-4 shadow-sm">
            <View className="h-4 w-28 bg-slate-200 rounded-md animate-pulse" />
            <View className="h-5 w-48 bg-slate-200 rounded-md mt-4 animate-pulse" />
            <View className="h-4 w-full bg-slate-100 rounded-md mt-4 animate-pulse" />
          </View>
        </ScrollView>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-3xl mb-2">⚠️</Text>
          <Text className="text-slate-800 font-bold text-lg">Failed to retrieve records</Text>
          <Text className="text-slate-500 text-center mt-2 mb-6">{error}</Text>
          <TouchableOpacity
            onPress={() => fetchRecords(true)}
            className="bg-teal-700 px-8 py-4 rounded-xl active:bg-teal-800"
          >
            <Text className="text-white font-bold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : records.length === 0 ? (
        // Empty State: Premium Onboarding Card with a single primary CTA
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm items-center w-full">
            <Text className="text-4xl mb-4">📁</Text>
            <Text className="text-slate-800 font-extrabold text-lg text-center mb-2">
              Welcome to your Medical Vault
            </Text>
            <Text className="text-slate-500 text-center text-sm leading-relaxed mb-6 px-4">
              Securely store blood tests, prescriptions, scans, discharge summaries and other medical records in one place.
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
          {/* Search Bar */}
          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row items-center mb-4 shadow-sm">
            <Text className="mr-2 text-slate-400">🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search reports..."
              placeholderTextColor="#94A3B8"
              className="flex-1 text-slate-800 font-medium text-sm p-0"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text className="text-slate-400 font-bold text-sm">✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal Scroll Filter Chips */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {FILTER_CHIPS.map((chip) => {
                const isSelected = selectedChip === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => setSelectedChip(chip.id)}
                    className={
                      isSelected
                        ? 'px-4 py-2 rounded-xl mr-2 border bg-teal-700 border-teal-700'
                        : 'px-4 py-2 rounded-xl mr-2 border bg-white border-slate-200 active:bg-slate-50'
                    }
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Sort Selector Bar */}
          <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Sort by
            </Text>
            <View className="flex-row space-x-3">
              {(['newest', 'oldest', 'alphabetical'] as SortType[]).map((type) => {
                const isSelected = sortBy === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSortBy(type)}
                    className="px-2.5 py-1"
                  >
                    <Text
                      className={`text-xs font-bold capitalize ${
                        isSelected ? 'text-teal-700 underline' : 'text-slate-400'
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Records List or Empty State */}
          {processedRecords.length === 0 ? (
            <View className="flex-1 justify-center items-center py-12">
              <Text className="text-slate-800 font-extrabold text-base mb-1">No reports found</Text>
              <Text className="text-slate-400 text-xs">No reports match this filter.</Text>
            </View>
          ) : (
            <FlatList
              data={processedRecords}
              keyExtractor={(item) => item.id}
              renderItem={renderCard}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            />
          )}

          {/* Large Floating Upload Button */}
          <TouchableOpacity
            onPress={() => router.push('/upload')}
            className="absolute bottom-6 right-0 bg-teal-700 h-14 px-6 rounded-full flex-row items-center justify-center shadow-lg active:bg-teal-800"
          >
            <Text className="text-white font-extrabold text-base mr-2">+</Text>
            <Text className="text-white font-bold text-sm">Upload Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
