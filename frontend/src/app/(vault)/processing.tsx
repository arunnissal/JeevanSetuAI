import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProcessingStatus } from '../../api/intelligence';
import { colors } from '../../theme/colors';

interface StageState {
  stage: 'UPLOAD' | 'READING' | 'UNDERSTANDING' | 'PREPARING' | 'UPDATING' | 'COMPLETED';
  status: 'idle' | 'active' | 'completed' | 'failed';
  label: string;
  icon: string;
}

const DEFAULT_STAGES: StageState[] = [
  { stage: 'UPLOAD', status: 'completed', label: 'Report Uploaded', icon: '✓' },
  { stage: 'READING', status: 'idle', label: 'Reading Your Report...', icon: '👀' },
  { stage: 'UNDERSTANDING', status: 'idle', label: 'Understanding Medical Information...', icon: '🧠' },
  { stage: 'PREPARING', status: 'idle', label: 'Preparing AI Summary...', icon: '✨' },
  { stage: 'UPDATING', status: 'idle', label: 'Updating Your Health Journey...', icon: '📚' },
  { stage: 'COMPLETED', status: 'idle', label: 'Completed', icon: '✅' }
];

export default function ProcessingScreen() {
  const router = useRouter();
  const { id: recordId } = useLocalSearchParams<{ id: string }>();

  const [showAcknowledgement, setShowAcknowledgement] = useState(true);
  const [stages, setStages] = useState<StageState[]>(DEFAULT_STAGES);
  const [processingStatus, setProcessingStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Stage pulse animation
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Poll intervals
  const pollTimerRef = useRef<any>(null);
  const autoRedirectTimerRef = useRef<any>(null);

  useEffect(() => {
    // 1. Initial pulse animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 2. Hide acknowledgement screen after 1.2 seconds and start polling
    const ackTimer = setTimeout(() => {
      setShowAcknowledgement(false);
      startPolling();
    }, 1200);

    return () => {
      clearTimeout(ackTimer);
      stopPolling();
      if (autoRedirectTimerRef.current) {
        clearTimeout(autoRedirectTimerRef.current);
      }
    };
  }, []);

  const startPolling = () => {
    if (!recordId) {
      setErrorMessage("No record ID provided to processing queue.");
      setProcessingStatus('failed');
      return;
    }

    // Immediate first poll
    pollStatus();

    // Repeat poll every 1.5 seconds
    pollTimerRef.current = setInterval(pollStatus, 1500);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const pollStatus = async () => {
    if (!recordId) return;

    try {
      const response = await getProcessingStatus(recordId);
      if (response.success && response.data) {
        const { processing_status, stages: backendStages } = response.data;
        setProcessingStatus(processing_status);

        // Update local stages matching backend status logs
        setStages((prevStages) =>
          prevStages.map((stage) => {
            const match = backendStages.find((bs: any) => bs.stage === stage.stage);
            if (match) {
              return {
                ...stage,
                status: match.status
              };
            }
            return stage;
          })
        );

        if (processing_status === 'completed') {
          stopPolling();
          triggerAutoRedirect();
        } else if (processing_status === 'failed') {
          stopPolling();
        }
      }
    } catch (err: any) {
      // Don't interrupt flow on transient network failures, just let it poll again
      console.warn("Status poll transient error:", err);
    }
  };

  const triggerAutoRedirect = () => {
    if (autoRedirectTimerRef.current) return;

    // Automatically navigate to Report Details after 1.8 seconds if user does nothing
    autoRedirectTimerRef.current = setTimeout(() => {
      router.replace(`/${recordId}`);
    }, 1800);
  };

  // 1. Entry experience: Acknowledgement Card
  if (showAcknowledgement) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <View className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm items-center w-full max-w-sm">
          <Text className="text-5xl mb-6">📄</Text>
          <Text className="text-slate-800 font-extrabold text-xl mb-3 text-center">
            Medical Report Uploaded
          </Text>
          <Text className="text-slate-500 text-sm text-center leading-relaxed">
            Your report has been securely received. Our AI will now understand your report and prepare an easy-to-read medical summary.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Success state view card
  if (processingStatus === 'completed') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <View className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm items-center w-full max-w-sm">
          <View className="h-16 w-16 bg-emerald-50 rounded-full items-center justify-center border border-emerald-100 mb-6">
            <Text className="text-emerald-500 text-3xl font-bold">✓</Text>
          </View>
          <Text className="text-slate-800 font-extrabold text-xl mb-3 text-center">
            Your medical report is ready.
          </Text>
          <Text className="text-slate-500 text-sm text-center leading-relaxed mb-8 px-4">
            Your AI summary has been successfully generated and added to your Digital Health Journey.
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (autoRedirectTimerRef.current) clearTimeout(autoRedirectTimerRef.current);
              router.replace(`/${recordId}`);
            }}
            className="bg-teal-700 w-full py-4 rounded-xl active:bg-teal-800 items-center mb-3"
          >
            <Text className="text-white font-bold text-sm">View Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (autoRedirectTimerRef.current) clearTimeout(autoRedirectTimerRef.current);
              router.replace('/vault');
            }}
            className="bg-slate-100 border border-slate-200 w-full py-4 rounded-xl active:bg-slate-200 items-center"
          >
            <Text className="text-slate-700 font-bold text-sm">Back to Vault</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Failure state view recovery card (blurry/incomplete report explanation)
  if (processingStatus === 'failed') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <View className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm items-center w-full max-w-sm">
          <Text className="text-5xl mb-6">⚠️</Text>
          <Text className="text-slate-800 font-extrabold text-lg text-center mb-3">
            We couldn't understand this report.
          </Text>
          <Text className="text-slate-500 text-sm text-center leading-relaxed mb-8 px-2">
            This usually happens when the uploaded image is blurry, incomplete, or difficult to read.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace('/upload')}
            className="bg-teal-700 w-full py-4 rounded-xl active:bg-teal-800 items-center mb-3"
          >
            <Text className="text-white font-bold text-sm">Upload Another Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setProcessingStatus('pending');
              setStages(DEFAULT_STAGES);
              startPolling();
            }}
            className="bg-slate-100 border border-slate-200 w-full py-4 rounded-xl active:bg-slate-200 items-center"
          >
            <Text className="text-slate-700 font-bold text-sm">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 4. Processing stages progress card
  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between px-6 py-10">
      <View className="flex-1 justify-center">
        {/* Title Block */}
        <View className="items-center mb-8">
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">Analyzing Report</Text>
          <Text className="text-slate-400 text-sm text-center mt-2 px-4 leading-relaxed">
            Our secure AI pipeline is reading and organizing your medical information.
          </Text>
        </View>

        {/* Steps container card */}
        <View className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          {stages.map((item) => {
            const isCompleted = item.status === 'completed';
            const isActive = item.status === 'active';
            const isFailed = item.status === 'failed';
            const isIdle = item.status === 'idle';

            // Soft faded appearance (opacity 0.25) for idle/future stages
            const opacityClass = isIdle ? 'opacity-25' : 'opacity-100';

            return (
              <View key={item.stage} className={`flex-row items-center py-2 ${opacityClass}`}>
                {/* Accessible Icon + Text + State indicators */}
                <View className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 justify-center items-center mr-4 shadow-sm">
                  {isCompleted ? (
                    <Text className="text-emerald-600 font-extrabold text-base">✓</Text>
                  ) : isFailed ? (
                    <Text className="text-red-600 font-extrabold text-base">✕</Text>
                  ) : (
                    <Text className="text-base">{item.icon}</Text>
                  )}
                </View>

                {isActive ? (
                  <Animated.View style={{ opacity: pulseAnim }} className="flex-1">
                    <Text className="text-teal-800 font-extrabold text-sm">
                      {item.label}
                    </Text>
                  </Animated.View>
                ) : (
                  <Text className={`flex-1 text-sm font-medium ${
                    isCompleted 
                      ? 'text-slate-400 line-through font-semibold' 
                      : isFailed 
                      ? 'text-red-700 font-bold' 
                      : 'text-slate-600'
                  }`}>
                    {item.label}
                  </Text>
                )}

                {/* State badges for accessibility (ScreenReaders etc.) */}
                <View className="ml-2">
                  {isCompleted && (
                    <Text className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Done</Text>
                  )}
                  {isActive && (
                    <Text className="text-[10px] text-teal-700 font-bold uppercase tracking-wide animate-pulse">Running</Text>
                  )}
                  {isFailed && (
                    <Text className="text-[10px] text-red-600 font-bold uppercase tracking-wide">Failed</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Footer metadata & help items */}
      <View className="space-y-4">
        {/* Estimated Time Card */}
        <View className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex-row items-center">
          <Text className="text-xl mr-3">⏱️</Text>
          <View className="flex-1">
            <Text className="text-slate-800 font-bold text-xs uppercase tracking-wider mb-0.5">Usually takes 10–30 seconds</Text>
            <Text className="text-slate-400 text-[10px] leading-relaxed">
              Processing time depends on report quality and internet connection speed.
            </Text>
          </View>
        </View>

        {/* Reassuring Helpful Message */}
        <Text className="text-center text-slate-400 text-xs font-semibold">
          Please keep the app open while your report is being processed.
        </Text>
      </View>
    </SafeAreaView>
  );
}
