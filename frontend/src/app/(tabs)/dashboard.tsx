import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDashboardData } from '../../api/dashboard';
import { getVaultRecords } from '../../api/vault';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface InsightDTO {
  title: string;
  summary: string;
  record_id: string;
  created_at: string;
}

interface ActivityDTO {
  id: string;
  title: string;
  event_type: 'UPLOAD' | 'AI' | 'SOS' | 'PROFILE';
  record_id?: string;
  created_at: string;
}

interface DashboardData {
  full_name: string;
  profile_progress: number;
  latest_insight: InsightDTO | null;
  recent_activity: ActivityDTO[];
  emergency_ready: boolean;
  missing_fields: string[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (showProgress = true) => {
    if (showProgress) setLoading(true);
    setError(null);
    try {
      const response = await getDashboardData();
      const vaultResponse = await getVaultRecords();
      
      if (response.success && response.data) {
        setData(response.data);
      }
      if (vaultResponse.success && vaultResponse.data) {
        setRecords(vaultResponse.data);
      }
    } catch (err: any) {
      setError('Unable to retrieve dashboard. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard(false);
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard(false);
  };

  const getGreetingMessage = () => {
    const hours = new Date().getHours();
    let greet = 'Good morning';
    if (hours >= 12 && hours < 17) {
      greet = 'Good afternoon';
    } else if (hours >= 17 && hours < 22) {
      greet = 'Good evening';
    } else if (hours >= 22 || hours < 5) {
      greet = 'Hello';
    }
    const name = data?.full_name ? `, ${data.full_name}` : '';
    return `${greet}${name}`;
  };

  // 1. Health snapshot metrics calculation
  const snapshotData = useMemo(() => {
    let attentionCount = 0;
    let completedCount = 0;

    records.forEach((record: any) => {
      if (record.processing_status === 'completed') {
        completedCount++;
      }
      if (record.analysis?.diagnoses) {
        record.analysis.diagnoses.forEach((finding: string) => {
          const checkText = finding.toLowerCase();
          if (
            checkText.includes('low') ||
            checkText.includes('high') ||
            checkText.includes('deficien') ||
            checkText.includes('attention') ||
            checkText.includes('abnormal') ||
            checkText.includes('concern') ||
            checkText.includes('decreased') ||
            checkText.includes('increased') ||
            checkText.includes('alert')
          ) {
            attentionCount++;
          }
        });
      }
    });

    const isHealthy = attentionCount === 0;
    const lastUpdated = records.length > 0 ? 'Today' : 'Never';

    return {
      isHealthy,
      reportsCount: records.length,
      attentionCount,
      lastUpdated,
    };
  }, [records]);

  // 2. Personalized lifestyle suggestion
  const todaySuggestion = useMemo(() => {
    let hasVitDConcern = false;
    let hasCholesterolConcern = false;
    
    records.forEach((r) => {
      if (r.analysis?.diagnoses) {
        r.analysis.diagnoses.forEach((finding: string) => {
          const fLower = finding.toLowerCase();
          if (fLower.includes('vitamin d') || fLower.includes('vit d')) {
            if (fLower.includes('low') || fLower.includes('deficien')) {
              hasVitDConcern = true;
            }
          }
          if (fLower.includes('cholesterol') || fLower.includes('lipid') || fLower.includes('ldl')) {
            if (fLower.includes('high') || fLower.includes('elevated') || fLower.includes('abnormal')) {
              hasCholesterolConcern = true;
            }
          }
        });
      }
    });

    if (hasVitDConcern) {
      return "Spend some time in morning sunlight to naturally boost your Vitamin D.";
    }
    if (hasCholesterolConcern) {
      return "Incorporate healthy fats like olive oil and nuts, and limit saturated fats.";
    }
    if (snapshotData.attentionCount > 0) {
      return "Keep monitoring your wellness values and discuss report changes with your doctor.";
    }

    const defaultSuggestions = [
      "Stay hydrated today by drinking 2-3 liters of clean water.",
      "Spend some time in morning sunlight to support your immune system.",
      "Continue regular, light exercise like a 30-minute evening walk.",
      "Ensure a restful sleeping pattern of 7-8 hours tonight to aid recovery.",
      "Incorporate green vegetables and fiber into your meals today."
    ];
    const day = new Date().getDay();
    return defaultSuggestions[day % defaultSuggestions.length];
  }, [records, snapshotData.attentionCount]);

  // 3. Slice recent reports
  const latestThree = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [records]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
        <ScrollView showsVerticalScrollIndicator={false} className="space-y-6">
          <View className="h-14 justify-center">
            <View className="h-6 w-48 bg-slate-200 rounded-md" />
            <View className="h-4 w-60 bg-slate-200 rounded-md mt-2" />
          </View>
          <View className="bg-white border border-slate-200 p-5 rounded-2xl h-28" />
          <View className="bg-white border border-slate-200 p-5 rounded-2xl h-20" />
          <View className="bg-white border border-slate-200 p-5 rounded-2xl h-28" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-8">
        <Ionicons name="warning-outline" size={48} color={colors.textMuted} />
        <Text className="text-slate-800 font-extrabold text-lg mt-4 mb-2">Unable to load dashboard</Text>
        <Text className="text-slate-500 text-center mb-6 text-xs leading-relaxed">{error}</Text>
        <TouchableOpacity
          onPress={() => fetchDashboard(true)}
          className="bg-teal-700 w-full py-3.5 rounded-xl active:bg-teal-800"
        >
          <Text className="text-white text-center font-bold text-sm">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 relative">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* 1. GREETING SECTION */}
        <View className="mb-6">
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {getGreetingMessage()} 👋
          </Text>
          <Text className="text-slate-500 font-medium text-sm mt-1">
            Welcome back to your health companion.
          </Text>
        </View>

        {/* 2. HEALTH SNAPSHOT CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name="pulse-outline" size={20} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-sm ml-2">Health Snapshot</Text>
          </View>
          
          <View className="flex-row justify-between items-center py-2.5 border-b border-slate-100">
            <Text className="text-slate-400 text-xs font-semibold">Overall Status</Text>
            <View className="flex-row items-center">
              <View className={
                snapshotData.isHealthy
                  ? "w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"
                  : "w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"
              } />
              <Text className="text-slate-800 text-xs font-extrabold">
                {snapshotData.isHealthy ? 'Mostly Healthy' : 'Needs Attention'}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center py-2.5 border-b border-slate-100">
            <Text className="text-slate-400 text-xs font-semibold">Recent Reports</Text>
            <Text className="text-slate-800 text-xs font-extrabold">{snapshotData.reportsCount}</Text>
          </View>

          <View className="flex-row justify-between items-center py-2.5 border-b border-slate-100">
            <Text className="text-slate-400 text-xs font-semibold">Needs Attention</Text>
            <Text className={
              snapshotData.attentionCount > 0
                ? "text-amber-600 text-xs font-extrabold"
                : "text-slate-800 text-xs font-extrabold"
            }>
              {snapshotData.attentionCount}
            </Text>
          </View>

          <View className="flex-row justify-between items-center pt-2.5">
            <Text className="text-slate-400 text-xs font-semibold">Last Updated</Text>
            <Text className="text-slate-800 text-xs font-extrabold">{snapshotData.lastUpdated}</Text>
          </View>
        </View>

        {/* 3. TODAY'S SUGGESTION CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-3">
            <Ionicons name="bulb-outline" size={20} color="#d97706" />
            <Text className="text-slate-800 font-extrabold text-sm ml-2">Today's Suggestion</Text>
          </View>
          <Text className="text-slate-600 text-xs leading-relaxed font-medium">
            {todaySuggestion}
          </Text>
        </View>

        {/* 4. JEEVANSETU AI COMPANION CARD */}
        <View className="bg-white border border-teal-100 p-5 rounded-2xl mb-6 bg-teal-50/20">
          <View className="flex-row items-center mb-2">
            <Ionicons name="sparkles-outline" size={20} color="#0f766e" />
            <Text className="text-teal-900 font-extrabold text-sm ml-2">JeevanSetu AI</Text>
          </View>
          <Text className="text-teal-700 font-semibold text-[10px] mb-1.5 uppercase tracking-wider">
            Your Personal Health Companion
          </Text>
          <Text className="text-slate-600 text-xs leading-relaxed mb-4">
            Ask questions about your health journey, understand reports, and learn about wellness in simple language.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/health-assistant')}
            className="bg-teal-700 py-3 rounded-xl items-center flex-row justify-center active:bg-teal-800"
          >
            <Text className="text-white font-bold text-xs mr-1.5">Start Conversation</Text>
            <Ionicons name="arrow-forward" size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 5. QUICK ACTIONS */}
        <View className="mb-6">
          <Text className="text-slate-800 font-extrabold text-sm mb-3">Quick Actions</Text>
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                onPress={() => router.push('/upload')}
                className="bg-white border border-slate-200 p-4 rounded-xl active:bg-slate-50 items-center justify-center min-h-[90px]"
              >
                <Ionicons name="cloud-upload-outline" size={24} color="#0f766e" />
                <Text className="text-slate-800 font-bold text-xs mt-2 text-center">Upload Report</Text>
              </TouchableOpacity>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                onPress={() => router.push('/vault')}
                className="bg-white border border-slate-200 p-4 rounded-xl active:bg-slate-50 items-center justify-center min-h-[90px]"
              >
                <Ionicons name="documents-outline" size={24} color="#0f766e" />
                <Text className="text-slate-800 font-bold text-xs mt-2 text-center">My Reports</Text>
              </TouchableOpacity>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                onPress={() => router.push('/timeline')}
                className="bg-white border border-slate-200 p-4 rounded-xl active:bg-slate-50 items-center justify-center min-h-[90px]"
              >
                <Ionicons name="analytics-outline" size={24} color="#0f766e" />
                <Text className="text-slate-800 font-bold text-xs mt-2 text-center">Health Journey</Text>
              </TouchableOpacity>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                onPress={() => router.push('/profile')}
                className="bg-white border border-slate-200 p-4 rounded-xl active:bg-slate-50 items-center justify-center min-h-[90px]"
              >
                <Ionicons name="person-outline" size={24} color="#0f766e" />
                <Text className="text-slate-800 font-bold text-xs mt-2 text-center">Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 6. RECENT REPORTS */}
        <View className="mb-24">
          <Text className="text-slate-800 font-extrabold text-sm mb-3">Recent Reports</Text>
          {latestThree.length === 0 ? (
            <View className="bg-white border border-slate-200 p-6 rounded-2xl items-center">
              <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
              <Text className="text-slate-800 font-extrabold text-xs text-center mt-2 mb-1">
                No reports uploaded yet.
              </Text>
              <Text className="text-slate-500 text-center text-[10px] leading-relaxed mb-4 px-4">
                Upload your first report to begin your health journey.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/upload')}
                className="bg-teal-700 px-6 py-2 rounded-xl active:bg-teal-800"
              >
                <Text className="text-white font-bold text-xs">Upload Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-3">
              {latestThree.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/${item.id}`)}
                  className="bg-white border border-slate-200 p-4 rounded-xl flex-row items-center justify-between active:bg-slate-50"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <Ionicons name="document-text-outline" size={18} color="#64748b" />
                    <View className="ml-3 flex-1">
                      <Text className="text-slate-800 font-bold text-xs" numberOfLines={1}>
                        {item.metadata?.original_filename || 'Medical Report'}
                      </Text>
                      <Text className="text-slate-400 text-[10px] font-medium mt-1">
                        Uploaded: {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View className={
                    item.processing_status === 'completed'
                      ? 'bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg'
                      : item.processing_status === 'failed'
                      ? 'bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg'
                      : 'bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg'
                  }>
                    <Text className={
                      item.processing_status === 'completed'
                        ? 'text-emerald-700 text-[9px] font-bold uppercase tracking-wider'
                        : item.processing_status === 'failed'
                        ? 'text-rose-700 text-[9px] font-bold uppercase tracking-wider'
                        : 'text-amber-700 text-[9px] font-bold uppercase tracking-wider'
                    }>
                      {item.processing_status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        onPress={() => router.push('/health-assistant')}
        className="absolute bottom-10 right-6 bg-teal-700 w-14 h-14 rounded-full items-center justify-center border border-teal-800 z-50"
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
