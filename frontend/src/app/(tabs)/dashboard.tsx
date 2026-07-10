import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDashboardData } from '../../api/dashboard';
import { getVaultRecords } from '../../api/vault';
import { colors } from '../../theme/colors';

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
    let greet = 'Good Morning';
    if (hours >= 12 && hours < 17) {
      greet = 'Good Afternoon';
    } else if (hours >= 17 && hours < 22) {
      greet = 'Good Evening';
    } else if (hours >= 22 || hours < 5) {
      greet = 'Hello';
    }
    const name = data?.full_name ? `, ${data.full_name}` : '';
    return `${greet}${name} 👋`;
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

    const status = attentionCount === 0 ? '🟢 Mostly Healthy' : '🟡 Needs Attention';
    const lastUpdated = records.length > 0 ? 'Today' : 'Never';

    return {
      status,
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
            <View className="h-6 w-48 bg-slate-200 rounded-md animate-pulse" />
            <View className="h-4 w-60 bg-slate-200 rounded-md mt-2 animate-pulse" />
          </View>
          <View className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm animate-pulse h-28" />
          <View className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm animate-pulse h-20" />
          <View className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm animate-pulse h-28" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-8">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-slate-800 font-extrabold text-lg mb-2">Unable to load dashboard</Text>
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
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4 relative">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
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
            {getGreetingMessage()}
          </Text>
          <Text className="text-slate-500 font-medium text-sm mt-1">
            Welcome back.
          </Text>
        </View>

        {/* 2. HEALTH SNAPSHOT CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-slate-800 font-extrabold text-sm mb-3.5">🩺 Health Snapshot</Text>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-slate-400 text-xs font-semibold">Overall Status</Text>
            <Text className="text-slate-800 text-xs font-extrabold">{snapshotData.status}</Text>
          </View>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-slate-400 text-xs font-semibold">Recent Reports</Text>
            <Text className="text-slate-800 text-xs font-extrabold">{snapshotData.reportsCount}</Text>
          </View>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-slate-400 text-xs font-semibold">Needs Attention</Text>
            <Text className="text-slate-800 text-xs font-extrabold">{snapshotData.attentionCount}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-400 text-xs font-semibold">Last Updated</Text>
            <Text className="text-slate-800 text-xs font-extrabold">{snapshotData.lastUpdated}</Text>
          </View>
        </View>

        {/* 3. TODAY'S SUGGESTION CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-slate-800 font-extrabold text-sm mb-2">💡 Today's Suggestion</Text>
          <Text className="text-slate-600 text-xs leading-relaxed font-medium">
            {todaySuggestion}
          </Text>
        </View>

        {/* 4. JEEVANSETU AI COMPANION CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row items-center space-x-2 mb-2">
            <Text className="text-lg">🤖</Text>
            <Text className="text-slate-800 font-extrabold text-sm">JeevanSetu AI</Text>
          </View>
          <Text className="text-slate-500 font-semibold text-[10px] mb-1.5 uppercase tracking-wider">
            Your Personal Health Companion
          </Text>
          <Text className="text-slate-600 text-xs leading-relaxed mb-4">
            Ask questions about your health journey, understand reports, and learn about wellness in simple language.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/health-assistant')}
            className="bg-teal-700 py-3.5 rounded-xl items-center flex-row justify-center space-x-2 active:bg-teal-800"
          >
            <Text className="text-white font-bold text-sm">Start Conversation →</Text>
          </TouchableOpacity>
        </View>

        {/* 5. QUICK ACTIONS */}
        <View className="mb-6">
          <Text className="text-slate-800 font-extrabold text-sm mb-3">⚡ Quick Actions</Text>
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                onPress={() => router.push('/(vault)/upload')}
                className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm active:bg-slate-50 items-center"
              >
                <Text className="text-xl mb-1.5">📤</Text>
                <Text className="text-slate-800 font-bold text-xs">Upload Report</Text>
              </TouchableOpacity>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/vault')}
                className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm active:bg-slate-50 items-center"
              >
                <Text className="text-xl mb-1.5">🗂️</Text>
                <Text className="text-slate-800 font-bold text-xs">My Reports</Text>
              </TouchableOpacity>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/timeline')}
                className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm active:bg-slate-50 items-center"
              >
                <Text className="text-xl mb-1.5">📈</Text>
                <Text className="text-slate-800 font-bold text-xs">Health Journey</Text>
              </TouchableOpacity>
            </View>
            <View className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm active:bg-slate-50 items-center"
              >
                <Text className="text-xl mb-1.5">👤</Text>
                <Text className="text-slate-800 font-bold text-xs">Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 6. RECENT REPORTS */}
        <View className="mb-8">
          <Text className="text-slate-800 font-extrabold text-sm mb-3">📄 Recent Reports</Text>
          {latestThree.length === 0 ? (
            <View className="bg-white border border-slate-200 p-6 rounded-2xl items-center shadow-sm">
              <Text className="text-4xl mb-3">📄</Text>
              <Text className="text-slate-800 font-extrabold text-sm text-center mb-1">
                No reports uploaded yet.
              </Text>
              <Text className="text-slate-500 text-center text-xs leading-relaxed mb-4 px-4">
                Upload your first report to begin your health journey.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(vault)/upload')}
                className="bg-teal-700 px-6 py-2.5 rounded-xl active:bg-teal-800"
              >
                <Text className="text-white font-bold text-xs">Upload Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-3">
              {latestThree.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/(vault)/${item.id}`)}
                  className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex-row items-center justify-between active:bg-slate-50"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-slate-800 font-bold text-xs" numberOfLines={1}>
                      {item.metadata?.original_filename || 'Medical Report'}
                    </Text>
                    <Text className="text-slate-400 text-[10px] font-medium mt-1">
                      Uploaded: {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Text className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">
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
        className="absolute bottom-6 right-6 bg-teal-700 w-14 h-14 rounded-full items-center justify-center shadow-lg active:bg-teal-800 z-50"
      >
        <Text className="text-2xl text-white">💬</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
