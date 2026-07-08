import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVaultRecords } from '../../api/vault';

interface RecordItem {
  id: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  metadata: {
    original_filename?: string;
  };
}

export default function VaultScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    setError(null);
    try {
      const response = await getVaultRecords();
      if (response.success && response.data) {
        setRecords(response.data);
      } else {
        setError(response.message || 'Failed to retrieve records');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not fetch records. Please try again.');
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

  const getStatusColor = (status: RecordItem['processing_status']) => {
    switch (status) {
      case 'completed': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'failed': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-amber-700 bg-amber-50 border-amber-200';
    }
  };

  const renderItem = ({ item }: { item: RecordItem }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(vault)/${item.id}`)}
      className="bg-white border border-slate-200 p-5 rounded-2xl flex-row justify-between items-center mb-4 active:bg-slate-50 shadow-sm"
    >
      <View className="flex-1 mr-4">
        <Text className="text-slate-800 font-bold text-base mb-1" numberOfLines={1}>
          {item.metadata.original_filename || 'Medical Report'}
        </Text>
        <Text className="text-slate-400 text-xs">
          Uploaded: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View className={`px-3 py-1 rounded-full border ${getStatusColor(item.processing_status)}`}>
        <Text className="text-xs font-semibold capitalize">{item.processing_status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-3xl font-extrabold text-slate-900">Medical Vault</Text>
        <TouchableOpacity
          onPress={() => router.push('/(vault)/upload')}
          className="bg-teal-700 px-4 py-2.5 rounded-xl active:bg-teal-800"
        >
          <Text className="text-white font-bold text-sm">+ Add Report</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F766E" />
          <Text className="text-slate-400 text-sm font-semibold mt-4">Loading reports...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-red-600 font-bold text-lg">Error occurred</Text>
          <Text className="text-slate-500 text-center mt-2 mb-6">{error}</Text>
          <TouchableOpacity
            onPress={() => fetchRecords()}
            className="bg-teal-700 px-6 py-3 rounded-xl active:bg-teal-800"
          >
            <Text className="text-white font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : records.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 bg-teal-50 rounded-full items-center justify-center mb-6">
            <Text className="text-teal-700 text-3xl">📂</Text>
          </View>
          <Text className="text-slate-800 font-bold text-xl text-center mb-2">No Medical Reports</Text>
          <Text className="text-slate-500 text-center text-sm mb-8 px-4">
            Upload your first health document (lab reports, prescriptions, scan summaries) to begin.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(vault)/upload')}
            className="bg-teal-700 px-8 py-4 rounded-2xl active:bg-teal-800 shadow-md"
          >
            <Text className="text-white font-bold text-base">Upload Your First Report</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0F766E']} />
          }
        />
      )}
    </SafeAreaView>
  );
}
