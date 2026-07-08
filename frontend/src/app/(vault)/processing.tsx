import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Step {
  id: number;
  label: string;
  status: 'idle' | 'running' | 'completed';
}

const INITIAL_STEPS: Step[] = [
  { id: 1, label: 'Uploading...', status: 'running' },
  { id: 2, label: 'Reading Report...', status: 'idle' },
  { id: 3, label: 'Extracting Text...', status: 'idle' },
  { id: 4, label: 'Understanding Report...', status: 'idle' },
  { id: 5, label: 'Generating Summary...', status: 'idle' },
  { id: 6, label: 'Saving Timeline...', status: 'idle' },
  { id: 7, label: 'Completed', status: 'idle' },
];

export default function ProcessingScreen() {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let currentStepId = 1;

    const interval = setInterval(() => {
      setSteps((prevSteps) => {
        const nextSteps = prevSteps.map((step) => {
          if (step.id === currentStepId) {
            return { ...step, status: 'completed' as const };
          }
          if (step.id === currentStepId + 1) {
            return { ...step, status: 'running' as const };
          }
          return step;
        });

        currentStepId += 1;

        if (currentStepId > INITIAL_STEPS.length) {
          clearInterval(interval);
          setFinished(true);
        }

        return nextSteps;
      });
    }, 1500); // 1.5 seconds per step simulation

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between px-6 py-12">
      <View className="flex-1 justify-center items-center">
        <Text className="text-3xl font-extrabold text-slate-900 mb-2">Analyzing Report</Text>
        <Text className="text-slate-500 mb-10 text-center">
          Our intelligence pipeline is reading and structuring your record.
        </Text>

        <View className="w-full bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
          {steps.map((step) => (
            <View key={step.id} className="flex-row justify-between items-center py-1">
              <View className="flex-row items-center space-x-3">
                <View className="w-6 h-6 justify-center items-center mr-2">
                  {step.status === 'completed' && (
                    <Text className="text-emerald-500 font-bold">✓</Text>
                  )}
                  {step.status === 'running' && (
                    <ActivityIndicator size="small" color="#0F766E" />
                  )}
                  {step.status === 'idle' && (
                    <View className="w-2 h-2 rounded-full bg-slate-200" />
                  )}
                </View>
                <Text 
                  className={`text-base ${
                    step.status === 'completed' 
                      ? 'text-slate-400 line-through' 
                      : step.status === 'running' 
                      ? 'text-teal-800 font-bold' 
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {finished && (
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/vault')}
          className="w-full bg-teal-700 py-4 rounded-2xl items-center shadow-md active:bg-teal-800 mt-6"
        >
          <Text className="text-white text-lg font-semibold">View Vault</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
