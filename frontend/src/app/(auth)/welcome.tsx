import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../../i18n';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between px-6 py-12">
      <View className="items-center mt-16">
        <View className="w-24 h-24 bg-teal-700 rounded-full justify-center items-center mb-6 shadow-lg shadow-teal-700/30">
          <Text className="text-white text-4xl font-bold">JS</Text>
        </View>
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight text-center">
          {t.welcome.title}
        </Text>
        <Text className="text-lg text-slate-500 text-center mt-2 px-4">
          {t.welcome.tagline}
        </Text>
      </View>

      <View className="w-full space-y-4 mb-8">
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          className="w-full bg-teal-700 py-4 rounded-2xl items-center shadow-md active:bg-teal-800"
        >
          <Text className="text-white text-lg font-semibold">{t.welcome.getStarted}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          className="w-full border border-slate-200 bg-white py-4 rounded-2xl items-center mt-4 active:bg-slate-50"
        >
          <Text className="text-teal-700 text-lg font-semibold">{t.welcome.alreadyHaveAccount}</Text>
        </TouchableOpacity>

        <Text className="text-xs text-slate-400 text-center mt-6">
          {t.welcome.termsDesc}
        </Text>
      </View>
    </SafeAreaView>
  );
}
