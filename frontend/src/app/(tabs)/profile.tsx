import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProfileScreen() {
  const { user, language, setLanguage, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Logged Out', 'You have been logged out successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to log out cleanly.');
    }
  };

  // Translations
  const t = {
    en: {
      profile: 'Profile Readiness',
      setupProgress: 'Setup Progress',
      completenessDesc: 'This score measures how complete your medical profile configuration is. It does NOT represent your physical health status.',
      personalInfo: 'Personal Information',
      name: 'Name',
      email: 'Email',
      dob: 'Date of Birth',
      languageSelection: 'Language / भाषा selection',
      logout: 'Sign Out',
      notProvided: 'Not provided',
    },
    hi: {
      profile: 'प्रोफाइल पूर्णता',
      setupProgress: 'सेटअप प्रगति',
      completenessDesc: 'यह स्कोर मापता है कि आपका मेडिकल प्रोफाइल सेटअप कितना पूरा है। यह आपके शारीरिक स्वास्थ्य का प्रतिनिधित्व नहीं करता है।',
      personalInfo: 'व्यक्तिगत जानकारी',
      name: 'नाम',
      email: 'ईमेल',
      dob: 'जन्म तिथि',
      languageSelection: 'भाषा / Language चयन',
      logout: 'साइन आउट',
      notProvided: 'प्रदान नहीं किया गया',
    }
  }[language === 'hi' ? 'hi' : 'en'];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <Text className="text-3xl font-extrabold text-slate-900 mb-6">{t.profile}</Text>

        {/* Setup completeness score */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-slate-500 font-semibold text-xs uppercase tracking-wider">
            {t.setupProgress}
          </Text>
          <View className="flex-row justify-between items-baseline mt-2">
            <Text className="text-4xl font-extrabold text-teal-700">
              {user?.profileProgress || 0}%
            </Text>
            <Text className="text-slate-400 text-sm font-medium">Ready</Text>
          </View>
          
          <View className="h-3 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
            <View 
              style={{ width: `${user?.profileProgress || 0}%` }}
              className="h-full bg-teal-700 rounded-full"
            />
          </View>
          
          <Text className="text-slate-400 text-xs mt-4 leading-relaxed">
            {t.completenessDesc}
          </Text>
        </View>

        {/* User Details */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-slate-800 font-bold text-lg mb-4">{t.personalInfo}</Text>
          
          <View className="space-y-4">
            <View>
              <Text className="text-slate-400 text-xs">{t.name}</Text>
              <Text className="text-slate-800 text-base font-semibold mt-1">
                {user?.fullName || t.notProvided}
              </Text>
            </View>

            <View className="mt-3">
              <Text className="text-slate-400 text-xs">{t.email}</Text>
              <Text className="text-slate-800 text-base font-semibold mt-1">
                {user?.email || t.notProvided}
              </Text>
            </View>

            <View className="mt-3">
              <Text className="text-slate-400 text-xs">{t.dob}</Text>
              <Text className="text-slate-800 text-base font-semibold mt-1">
                {user?.dob || t.notProvided}
              </Text>
            </View>
          </View>
        </View>

        {/* Language Selection */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-8 shadow-sm">
          <Text className="text-slate-800 font-bold text-lg mb-4">{t.languageSelection}</Text>
          
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={() => setLanguage('en')}
              className={`flex-1 py-3 rounded-xl items-center border ${
                language === 'en' 
                  ? 'border-teal-700 bg-teal-50' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text className={`font-semibold ${language === 'en' ? 'text-teal-700' : 'text-slate-600'}`}>
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage('hi')}
              className={`flex-1 py-3 rounded-xl items-center border ${
                language === 'hi' 
                  ? 'border-teal-700 bg-teal-50' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text className={`font-semibold ${language === 'hi' ? 'text-teal-700' : 'text-slate-600'}`}>
                हिन्दी
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="w-full bg-red-50 border border-red-200 py-4 rounded-2xl items-center mb-8 active:bg-red-100"
        >
          <Text className="text-red-600 font-bold text-lg">{t.logout}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
