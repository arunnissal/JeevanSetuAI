import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDashboardData } from '../../api/dashboard';
import { getSOSTriggerData } from '../../api/emergency';
import { useTranslation } from '../../i18n';
import { getDailyTip } from '../../constants/healthTips';
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
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sosTriggering, setSosTriggering] = useState(false);

  const fetchDashboard = async (showProgress = true) => {
    if (showProgress) setLoading(true);
    setError(null);
    try {
      const response = await getDashboardData();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to load dashboard data.');
      }
    } catch (err: any) {
      setError(t.dashboard.errorDesc || 'Unable to retrieve dashboard. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  const triggerSOS = () => {
    if (!data) return;

    if (!data.emergency_ready) {
      Alert.alert(
        'SOS Not Configured',
        'Please complete your emergency contact details in your profile first to enable the SOS alert.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    Alert.alert(
      'Trigger Emergency SOS?',
      'This will notify your emergency contact immediately with your vital medical information.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Trigger',
          style: 'destructive',
          onPress: async () => {
            setSosTriggering(true);
            try {
              const res = await getSOSTriggerData();
              Alert.alert(
                t.dashboard.emergencySosTriggered || 'Emergency SOS Triggered!',
                `A notification alert has been sent to your emergency contact: ${res.data?.emergency_contact_name || 'Emergency Contact'} (${res.data?.emergency_contact_phone || 'Phone'}).`
              );
            } catch (err) {
              Alert.alert('SOS Error', 'Failed to trigger SOS alert cleanly. Please try calling emergency services directly.');
            } finally {
              setSosTriggering(false);
            }
          }
        }
      ]
    );
  };

  const renderActivityIcon = (type: ActivityDTO['event_type']) => {
    switch (type) {
      case 'UPLOAD': return '📂';
      case 'AI': return '🧠';
      case 'SOS': return '🚨';
      case 'PROFILE': return '👤';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
        <ScrollView showsVerticalScrollIndicator={false} className="space-y-6">
          <View className="h-14 justify-center">
            <View className="h-6 w-48 bg-slate-200 rounded-md animate-pulse" />
            <View className="h-4 w-60 bg-slate-200 rounded-md mt-2 animate-pulse" />
          </View>
          <View className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <View className="h-4 w-40 bg-slate-200 rounded-md animate-pulse" />
            <View className="mt-4 space-y-3">
              <View className="h-4 w-full bg-slate-100 rounded-md animate-pulse" />
              <View className="h-4 w-full bg-slate-100 rounded-md animate-pulse mt-2" />
              <View className="h-4 w-full bg-slate-100 rounded-md animate-pulse mt-2" />
            </View>
          </View>
          <View className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <View className="h-4 w-32 bg-slate-200 rounded-md animate-pulse" />
            <View className="h-16 w-full bg-slate-100 rounded-md mt-4 animate-pulse" />
          </View>
          <View className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <View className="h-4 w-36 bg-slate-200 rounded-md animate-pulse" />
            <View className="mt-4 space-y-3">
              <View className="h-10 w-full bg-slate-100 rounded-md animate-pulse" />
              <View className="h-10 w-full bg-slate-100 rounded-md mt-2 animate-pulse" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-8">
        <Text className="text-5xl mb-4">⚠️</Text>
        <Text className="text-slate-800 font-extrabold text-xl mb-2">
          {t.dashboard.errorTitle || 'Unable to load dashboard'}
        </Text>
        <Text className="text-slate-500 text-center mb-8 text-sm leading-relaxed">
          {error || t.dashboard.errorDesc || 'Please check your connection and try again.'}
        </Text>
        <TouchableOpacity
          onPress={() => fetchDashboard(true)}
          className="bg-teal-700 w-full py-4 rounded-2xl shadow-sm active:bg-teal-800"
        >
          <Text className="text-white text-center font-bold text-base">
            {t.dashboard.retry || 'Retry'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isProfileComplete = data.profile_progress === 100;
  const isHealthComplete = !data.missing_fields.includes('Blood Group');
  const isEmergencyComplete = !data.missing_fields.includes('Emergency Contact');

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
        {/* 1. Greeting Section */}
        <View className="mb-6">
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {getGreetingMessage()}
          </Text>
          <Text className="text-slate-500 font-medium text-sm mt-1">
            {t.dashboard.greetingCompanion}
          </Text>
        </View>

        {/* Premium AI Health Companion Card */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row items-center space-x-2.5 mb-2">
            <Text className="text-xl">🤖</Text>
            <Text className="text-slate-800 font-extrabold text-base">JeevanSetu AI</Text>
          </View>
          <Text className="text-slate-500 font-semibold text-xs mb-1.5 uppercase tracking-wider">
            Your Personal Health Companion
          </Text>
          <Text className="text-slate-600 text-xs leading-relaxed mb-4">
            Ask questions about your health journey, understand reports, compare results, and learn about your health in simple language.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(screens)/health-assistant')}
            className="bg-teal-700 py-3.5 rounded-xl items-center flex-row justify-center space-x-2 active:bg-teal-800"
          >
            <Text className="text-white font-bold text-sm">Start Conversation →</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Digital Health Profile Checklist Card */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-4">
            {t.dashboard.profileCompleteness}
          </Text>

          {isProfileComplete ? (
            <View className="flex-row items-center bg-teal-50 border border-teal-100 p-3 rounded-xl">
              <Text className="text-teal-800 text-sm font-semibold">
                {t.dashboard.checklistComplete}
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-slate-700 text-sm font-medium">
                  {t.dashboard.personalInfo}
                </Text>
                <Text className={`text-xs font-bold ${data.full_name ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {data.full_name ? '✓ Complete' : '⚠️ Missing'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-1 border-t border-slate-100">
                <Text className="text-slate-700 text-sm font-medium">
                  {t.dashboard.healthInfo}
                </Text>
                <Text className={`text-xs font-bold ${isHealthComplete ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {isHealthComplete ? '✓ Complete' : '⚠️ Missing'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-1 border-t border-slate-100">
                <Text className="text-slate-700 text-sm font-medium">
                  {t.dashboard.emergencyContact}
                </Text>
                <Text className={`text-xs font-bold ${isEmergencyComplete ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {isEmergencyComplete ? '✓ Complete' : '⚠️ Missing'}
                </Text>
              </View>

              <Text className="text-slate-400 text-xs mt-3 leading-relaxed">
                {t.dashboard.checklistIncomplete}
              </Text>
            </View>
          )}
        </View>

        {/* 3. Latest AI Insight Preview Card */}
        {data.latest_insight ? (
          <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
            <Text className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-3">
              {t.dashboard.latestInsight}
            </Text>
            <Text className="text-slate-900 font-bold text-base mb-2">
              {data.latest_insight.title}
            </Text>
            <Text className="text-slate-600 text-sm leading-relaxed mb-4" numberOfLines={3}>
              {data.latest_insight.summary}
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/(vault)/${data.latest_insight?.record_id}`)}
              className="border border-slate-200 py-3 rounded-xl items-center active:bg-slate-50"
            >
              <Text className="text-teal-700 font-bold text-sm">
                {t.dashboard.readFullAnalysis}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-6 items-center shadow-sm">
            <Text className="text-4xl mb-3">📂</Text>
            <Text className="text-slate-800 font-extrabold text-lg text-center mb-2">
              {t.dashboard.noInsightTitle}
            </Text>
            <Text className="text-slate-500 text-center text-sm leading-relaxed mb-6 px-4">
              {t.dashboard.noInsightDesc}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(vault)/upload')}
              className="bg-teal-700 w-full py-4 rounded-xl active:bg-teal-800"
            >
              <Text className="text-white text-center font-bold text-sm">
                {t.dashboard.uploadFirstReport}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Recent Activity Card */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-400 font-semibold text-xs uppercase tracking-wider">
              {t.dashboard.recentActivity}
            </Text>
            {data.recent_activity.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/timeline')}>
                <Text className="text-teal-700 text-xs font-bold">
                  {t.dashboard.viewAllTimeline}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {data.recent_activity.length > 0 ? (
            <View className="space-y-4">
              {data.recent_activity.map((activity, index) => (
                <View
                  key={activity.id}
                  className={`flex-row items-center py-2 ${index > 0 ? 'border-t border-slate-50 mt-2' : ''}`}
                >
                  <Text className="text-xl mr-3">{renderActivityIcon(activity.event_type)}</Text>
                  <View className="flex-1">
                    <Text className="text-slate-800 font-semibold text-sm">{activity.title}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-slate-400 text-sm text-center py-4">
              No recent events logged yet.
            </Text>
          )}
        </View>

        {/* 5. Emergency SOS Card */}
        <TouchableOpacity
          onPress={triggerSOS}
          disabled={sosTriggering}
          className="bg-red-50 border border-red-200 p-5 rounded-2xl mb-6 shadow-sm active:bg-red-100"
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-red-600 font-bold text-base">
              🚨 {t.dashboard.emergencySosTitle}
            </Text>
            <View className="bg-red-100 px-2 py-0.5 rounded-md">
              <Text className="text-red-700 text-xs font-bold">SOS</Text>
            </View>
          </View>
          <Text className="text-red-700 text-sm leading-relaxed">
            {t.dashboard.emergencySosDesc}
          </Text>
        </TouchableOpacity>

        {/* 6. Health Tip Card */}
        <View className="bg-teal-50 border border-teal-100 p-5 rounded-2xl mb-8 shadow-sm">
          <Text className="text-teal-800 font-bold text-xs uppercase tracking-wider mb-2">
            💡 {t.dashboard.healthTipTitle}
          </Text>
          <Text className="text-teal-900 text-sm leading-relaxed font-medium">
            {getDailyTip()}
          </Text>
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        onPress={() => router.push('/(screens)/health-assistant')}
        className="absolute bottom-6 right-6 bg-teal-700 w-14 h-14 rounded-full items-center justify-center shadow-lg active:bg-teal-800 z-50"
      >
        <Text className="text-2xl text-white">💬</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
