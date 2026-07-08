import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between px-6 py-12">
      <View className="items-center mt-16">
        <View className="w-24 h-24 bg-teal-700 rounded-full justify-center items-center mb-6 shadow-lg shadow-teal-700/30">
          <Text className="text-white text-4xl font-bold">JS</Text>
        </View>
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight text-center">
          JeevanSetu AI
        </Text>
        <Text className="text-lg text-slate-500 text-center mt-2 px-4">
          Your AI-Powered Digital Health Companion
        </Text>
      </View>

      <View className="w-full space-y-4 mb-8">
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          className="w-full bg-teal-700 py-4 rounded-2xl items-center shadow-md active:bg-teal-800"
        >
          <Text className="text-white text-lg font-semibold">Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          className="w-full border border-slate-200 bg-white py-4 rounded-2xl items-center active:bg-slate-50"
        >
          <Text className="text-teal-700 text-lg font-semibold">I already have an account</Text>
        </TouchableOpacity>

        <Text className="text-xs text-slate-400 text-center mt-6">
          By signing up, you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}
