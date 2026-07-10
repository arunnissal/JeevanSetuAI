import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAIInsights } from '../../api/intelligence';
import { colors } from '../../theme/colors';

interface Journey {
  reports_count: number;
  ai_summaries: number;
  timeline_events: number;
  journey_started: string;
}

interface Trend {
  icon: string;
  title: string;
  status: string;
  explanation: string;
}

interface Milestone {
  title: string;
  completed: boolean;
}

interface InsightsData {
  journey: Journey;
  health_story: string;
  trends: Trend[];
  discussion_points: string[];
  doctor_questions: string[];
  milestones: Milestone[];
}

export default function InsightsScreen() {
  const router = useRouter();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (showProgress = true) => {
    if (showProgress) setLoading(true);
    setError(null);
    try {
      const response = await getAIInsights();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to retrieve health insights.');
      }
    } catch (err: any) {
      setError('Unable to load AI insights. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInsights(false);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
        {/* Loading Progressive Skeleton (Individual card outlines, no spinner) */}
        <View className="mb-4">
          <View className="h-8 w-48 bg-slate-200 rounded-md animate-pulse" />
          <View className="h-4 w-64 bg-slate-200 rounded-md mt-2 animate-pulse" />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
          <View className="h-28 bg-white border border-slate-200 p-5 rounded-2xl animate-pulse" />
          <View className="h-36 bg-white border border-slate-200 p-5 rounded-2xl animate-pulse" />
          <View className="h-24 bg-white border border-slate-200 p-5 rounded-2xl animate-pulse" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-slate-800 font-extrabold text-lg text-center">
          We couldn't generate your health insights.
        </Text>
        <Text className="text-slate-500 text-center mt-2 mb-6">
          Please try again or contact support if the issue persists.
        </Text>
        <TouchableOpacity
          onPress={() => fetchInsights(true)}
          className="bg-teal-700 px-8 py-3.5 rounded-xl active:bg-teal-800 w-full items-center"
        >
          <Text className="text-white font-bold text-sm">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Empty State: If no medical records uploaded
  if (data.journey.reports_count === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <View className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm items-center w-full max-w-sm">
          <Text className="text-5xl mb-4">📈</Text>
          <Text className="text-slate-800 font-extrabold text-lg text-center mb-2">
            Your Health Story Will Appear Here
          </Text>
          <Text className="text-slate-500 text-center text-sm leading-relaxed mb-6 px-2">
            Upload medical reports to begin discovering trends across your health journey.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/upload')}
            className="bg-teal-700 w-full py-3.5 rounded-xl active:bg-teal-800 items-center"
          >
            <Text className="text-white font-bold text-sm">Upload Medical Report</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
      {/* Title */}
      <View className="mb-4">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Insights</Text>
        <Text className="text-slate-400 text-xs font-semibold mt-1">
          Intelligent summary of your digital health story.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* 1. YOUR DIGITAL HEALTH JOURNEY */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-4 shadow-sm">
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-4">
            Your Digital Health Journey
          </Text>
          <View className="flex-row flex-wrap">
            <View className="w-1/2 pr-2 pb-4">
              <Text className="text-slate-400 text-[10px] font-medium uppercase">Medical Reports</Text>
              <Text className="text-slate-800 font-extrabold text-2xl mt-1">
                {data.journey.reports_count}
              </Text>
            </View>
            <View className="w-1/2 pl-2 pb-4">
              <Text className="text-slate-400 text-[10px] font-medium uppercase">AI Summaries</Text>
              <Text className="text-slate-800 font-extrabold text-2xl mt-1">
                {data.journey.ai_summaries}
              </Text>
            </View>
            <View className="w-1/2 pr-2">
              <Text className="text-slate-400 text-[10px] font-medium uppercase">Timeline Events</Text>
              <Text className="text-slate-800 font-extrabold text-2xl mt-1">
                {data.journey.timeline_events}
              </Text>
            </View>
            <View className="w-1/2 pl-2">
              <Text className="text-slate-400 text-[10px] font-medium uppercase">Journey Started</Text>
              <Text className="text-slate-800 font-extrabold text-base mt-2">
                {data.journey.journey_started}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. MY HEALTH STORY */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">📖</Text>
            <Text className="text-slate-800 font-extrabold text-base">My Health Story</Text>
          </View>
          <Text className="text-slate-600 text-sm leading-relaxed mb-4">
            {data.health_story}
          </Text>
          <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <Text className="text-slate-400 text-[10px] text-center font-semibold">
              This summary is AI-generated for educational purposes based on your reports.
            </Text>
          </View>
        </View>

        {/* 3. HEALTH TRENDS */}
        {data.trends && data.trends.length > 0 && (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
            <View className="flex-row items-center mb-4">
              <Text className="text-xl mr-2">📈</Text>
              <Text className="text-slate-800 font-extrabold text-base">Health Trends</Text>
            </View>
            <View className="space-y-4">
              {data.trends.map((trend, idx) => (
                <View key={idx} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <View className="flex-row justify-between items-center mb-1.5">
                    <View className="flex-row items-center">
                      <Text className="text-base mr-2">{trend.icon}</Text>
                      <Text className="text-slate-800 font-bold text-sm">{trend.title}</Text>
                    </View>
                    <View className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      <Text className="text-[10px] font-bold text-slate-600">{trend.status}</Text>
                    </View>
                  </View>
                  <Text className="text-slate-500 text-xs leading-relaxed">{trend.explanation}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 4. THINGS WORTH DISCUSSING WITH YOUR DOCTOR */}
        {data.discussion_points && data.discussion_points.length > 0 && (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
            <View className="flex-row items-center mb-3">
              <Text className="text-xl mr-2">💡</Text>
              <Text className="text-slate-800 font-extrabold text-base">Things Worth Discussing</Text>
            </View>
            <View className="space-y-2 mt-2">
              {data.discussion_points.map((point, idx) => (
                <View key={idx} className="flex-row items-start space-x-2">
                  <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                  <Text className="text-slate-600 text-xs flex-1 leading-relaxed">{point}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 5. QUESTIONS FOR YOUR NEXT DOCTOR VISIT */}
        {data.doctor_questions && data.doctor_questions.length > 0 && (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
            <View className="flex-row items-center mb-3">
              <Text className="text-xl mr-2">💬</Text>
              <Text className="text-slate-800 font-extrabold text-base">Questions for Your Doctor</Text>
            </View>
            <View className="space-y-2 mt-2">
              {data.doctor_questions.map((q, idx) => (
                <View key={idx} className="flex-row items-start space-x-2">
                  <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                  <Text className="text-slate-600 text-xs flex-1 leading-relaxed">{q}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 6. DIGITAL HEALTH JOURNEY MILESTONES */}
        {data.milestones && data.milestones.length > 0 && (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
            <View className="flex-row items-center mb-3">
              <Text className="text-xl mr-2">🏆</Text>
              <Text className="text-slate-800 font-extrabold text-base">Journey Milestones</Text>
            </View>
            <View className="space-y-2.5 mt-2">
              {data.milestones.map((milestone, idx) => (
                <View key={idx} className="flex-row items-center justify-between py-1 border-b border-slate-50 last:border-0 pb-2">
                  <Text className={`text-xs ${milestone.completed ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>
                    {milestone.title}
                  </Text>
                  <View className={`w-5 h-5 rounded-full items-center justify-center border ${
                    milestone.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {milestone.completed && <Text className="text-[10px] text-emerald-600 font-bold">✓</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 7. ABOUT THESE INSIGHTS */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-4 shadow-sm">
          <Text className="text-slate-800 font-bold text-xs mb-1.5">About These Insights</Text>
          <Text className="text-slate-500 text-[10px] leading-relaxed">
            These insights are generated using AI to help you better understand your health information. They should not replace advice from a qualified healthcare professional.
          </Text>
        </View>

        {/* 8. POSITIVE ENDING */}
        <View className="bg-slate-100 border border-slate-200 p-5 rounded-2xl mb-8 shadow-sm">
          <Text className="text-slate-700 font-extrabold text-xs mb-1.5">Your health journey is unique.</Text>
          <Text className="text-slate-500 text-[10px] leading-relaxed">
            JeevanSetu AI helps you organize and understand your medical information so every future healthcare conversation can be better informed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
