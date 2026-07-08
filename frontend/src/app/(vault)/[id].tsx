import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecordDetail } from '../../api/vault';

interface RecordDetail {
  id: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  metadata: {
    original_filename?: string;
    file_size?: number;
  };
  file: {
    file_url: string;
  };
  analysis?: {
    ocr_text?: string;
    ai_summary?: string;
    diagnoses?: string[];
    medicines?: string[];
  };
}

export default function RecordDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const response = await getRecordDetail(id);
        if (response.success && response.data) {
          setRecord(response.data);
        } else {
          setError(response.message || 'Failed to fetch details');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Could not load record details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const viewFile = () => {
    if (record?.file?.file_url) {
      Linking.openURL(record.file.file_url).catch(() => {
        Alert.alert('Error', 'Cannot open file link');
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#0F766E" />
        <Text className="text-slate-500 mt-4 font-medium">Loading record details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !record) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Text className="text-red-600 font-bold text-lg">Error occurred</Text>
        <Text className="text-slate-500 text-center mt-2 mb-6">{error || 'Record details not found'}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-teal-700 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()} className="py-2">
            <Text className="text-teal-700 text-lg font-semibold">Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">Record Info</Text>
          <View className="w-12" /> {/* Spacer */}
        </View>

        {/* General Details card */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Document Information
          </Text>
          <Text className="text-slate-800 font-bold text-lg mb-2" numberOfLines={1}>
            {record.metadata.original_filename || 'medical_report.pdf'}
          </Text>
          <Text className="text-slate-500 text-sm">
            Uploaded: {new Date(record.created_at).toLocaleDateString()}
          </Text>
          <Text className="text-slate-500 text-sm mt-1">
            Status:{' '}
            <Text className={`font-bold capitalize ${
              record.processing_status === 'completed' 
                ? 'text-emerald-600' 
                : record.processing_status === 'failed' 
                ? 'text-red-600' 
                : 'text-amber-600'
            }`}>
              {record.processing_status}
            </Text>
          </Text>

          <TouchableOpacity
            onPress={viewFile}
            className="border border-slate-200 py-3 rounded-xl items-center mt-5 active:bg-slate-50"
          >
            <Text className="text-teal-700 font-bold">View Original Document</Text>
          </TouchableOpacity>
        </View>

        {/* Processing Details */}
        {record.processing_status !== 'completed' ? (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl items-center justify-center py-10 shadow-sm">
            {record.processing_status === 'failed' ? (
              <View className="items-center">
                <Text className="text-3xl mb-3">❌</Text>
                <Text className="text-slate-800 font-bold text-lg text-center">Analysis Failed</Text>
                <Text className="text-slate-500 text-sm text-center mt-2 px-4">
                  We could not parse this document successfully. Please try uploading a cleaner file.
                </Text>
              </View>
            ) : (
              <View className="items-center">
                <ActivityIndicator size="large" color="#0F766E" className="mb-4" />
                <Text className="text-slate-800 font-bold text-lg text-center">Processing Document</Text>
                <Text className="text-slate-500 text-sm text-center mt-2 px-4">
                  Our pipeline is structuring the report text. You will receive an notification when finished.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="space-y-6">
            {/* Safe Warning Medical disclaimer */}
            <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <Text className="text-amber-800 text-xs font-semibold uppercase mb-1">Medical Disclaimer</Text>
              <Text className="text-amber-700 text-xs leading-relaxed">
                This information is AI-generated for educational purposes and should not replace professional medical advice.
              </Text>
            </View>

            {/* Analysis details will go here in later phases */}
            <View className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <Text className="text-slate-800 font-bold text-base mb-3">Pipeline Status</Text>
              <Text className="text-slate-500 text-sm leading-relaxed">
                The document has been securely processed. Structuring and AI analysis features will be activated in the next phase.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
