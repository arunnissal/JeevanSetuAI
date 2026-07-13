import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../i18n';
import { updateProfile } from '../../api/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser, language } = useAuthStore();
  const { t } = useTranslation();

  const [showEmergencyCard, setShowEmergencyCard] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Logged Out', 'You have been logged out successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to log out cleanly.');
    }
  };

  const changeLanguage = async (lang: string) => {
    try {
      const response = await updateProfile({ language: lang });
      if (response.success && response.data) {
        updateUser(response.data);
        useAuthStore.getState().setLanguage(lang);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update preferred language.');
    }
  };

  const copyEmergencyCardToClipboard = () => {
    const formattedCard = 
`🚨 *JEEVANSETU AI - EMERGENCY MEDICAL CARD* 🚨
Name: ${user?.fullName || 'Not provided'}
DOB: ${user?.dob || 'Not provided'}
Blood Group: ${user?.health_profile?.blood_group || 'Not provided'}
Allergies: ${user?.health_profile?.allergies || 'None'}
Medical Conditions: ${user?.health_profile?.medical_conditions || 'None'}
Emergency Contact: ${user?.emergency_profile?.emergency_contact_name || 'Not configured'}
Phone: ${user?.emergency_profile?.emergency_contact_phone || 'Not configured'}`;

    Clipboard.setString(formattedCard);
    Alert.alert('Copied', 'Emergency medical card copied to clipboard.');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
        <Text className="text-2xl font-extrabold text-slate-900">Health Profile</Text>
        <TouchableOpacity
          onPress={() => router.push('/edit-profile')}
          className="bg-teal-700 px-4 py-2.5 rounded-xl active:bg-teal-800"
        >
          <Text className="text-white font-bold text-xs">Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        {/* PROFILE COMPLETENESS */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider">
            {t.profile.setupProgress}
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
            {t.profile.completenessDesc}
          </Text>
        </View>

        {/* 1. PERSONAL INFORMATION CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="person-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">Personal Identity</Text>
          </View>

          <View className="space-y-4">
            <View className="border-b border-slate-50 pb-3">
              <Text className="text-slate-400 text-xs font-bold">Full Name</Text>
              <Text className="text-slate-800 text-base font-semibold mt-1">
                {user?.fullName || t.profile.notProvided}
              </Text>
            </View>

            <View className="border-b border-slate-50 pb-3">
              <Text className="text-slate-400 text-xs font-bold">Email Address</Text>
              <Text className="text-slate-850 text-base font-semibold mt-1">
                {user?.email || t.profile.notProvided}
              </Text>
            </View>

            <View className="pb-1">
              <Text className="text-slate-400 text-xs font-bold">Date of Birth</Text>
              <Text className="text-slate-800 text-base font-semibold mt-1">
                {user?.dob || t.profile.notProvided}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. HEALTH INFORMATION CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="medkit-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">Health Information</Text>
          </View>

          <View className="space-y-4">
            <View className="border-b border-slate-50 pb-3">
              <Text className="text-slate-400 text-xs font-bold">Blood Group</Text>
              <Text className="text-slate-800 text-base font-extrabold mt-1 text-teal-700">
                {user?.health_profile?.blood_group || t.profile.notProvided}
              </Text>
            </View>

            <View className="border-b border-slate-50 pb-3">
              <Text className="text-slate-400 text-xs font-bold">Allergies</Text>
              <Text className="text-slate-800 text-sm font-semibold mt-1 leading-relaxed">
                {user?.health_profile?.allergies || 'No known allergies'}
              </Text>
            </View>

            <View className="pb-1">
              <Text className="text-slate-400 text-xs font-bold">Medical Conditions & History</Text>
              <Text className="text-slate-800 text-sm font-semibold mt-1 leading-relaxed">
                {user?.health_profile?.medical_conditions || 'No conditions documented'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. EMERGENCY CONTACT & SOS CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="alert-circle-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">Emergency SOS Contact</Text>
          </View>

          <View className="space-y-4">
            <View className="border-b border-slate-50 pb-3">
              <Text className="text-slate-400 text-xs font-bold">Contact Name</Text>
              <Text className="text-slate-800 text-base font-semibold mt-1">
                {user?.emergency_profile?.emergency_contact_name || t.profile.notProvided}
              </Text>
            </View>

            <View className="pb-2">
              <Text className="text-slate-400 text-xs font-bold">Phone Number</Text>
              <Text className="text-slate-800 text-base font-semibold mt-1">
                {user?.emergency_profile?.emergency_contact_phone || t.profile.notProvided}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowEmergencyCard(true)}
              className="mt-2 border border-red-200 bg-red-50 p-4 rounded-xl flex-row items-center justify-between active:bg-red-100"
            >
              <View className="flex-row items-center space-x-3">
                <Ionicons name="card-outline" size={22} color="#dc2626" />
                <View>
                  <Text className="text-red-700 font-bold text-sm">Emergency Medical Card</Text>
                  <Text className="text-red-600 text-[10px]">Show key medical info to responders</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. AI PERSONALIZATION CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="options-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">AI Personalization</Text>
          </View>

          <View className="space-y-2">
            <Text className="text-slate-400 text-xs font-bold">Custom Companion Instructions</Text>
            <Text className="text-slate-700 text-sm leading-relaxed mt-1">
              {user?.health_profile?.ai_personalization || 'No custom prompt rules configured.'}
            </Text>
          </View>
        </View>

        {/* 5. LANGUAGE SETTINGS CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="language-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">{t.profile.languageSelection}</Text>
          </View>
          
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => changeLanguage('en')}
              className={
                language === 'en' 
                  ? 'flex-1 py-3 rounded-xl items-center border border-teal-700 bg-teal-50' 
                  : 'flex-1 py-3 rounded-xl items-center border border-slate-200 bg-white'
              }
            >
              <Text className={language === 'en' ? 'font-semibold text-teal-700' : 'font-semibold text-slate-600'}>
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeLanguage('hi')}
              className={
                language === 'hi' 
                  ? 'flex-1 py-3 rounded-xl items-center border border-teal-700 bg-teal-50' 
                  : 'flex-1 py-3 rounded-xl items-center border border-slate-200 bg-white'
              }
            >
              <Text className={language === 'hi' ? 'font-semibold text-teal-700' : 'font-semibold text-slate-600'}>
                हिन्दी
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeLanguage('ta')}
              className={
                language === 'ta' 
                  ? 'flex-1 py-3 rounded-xl items-center border border-teal-700 bg-teal-50' 
                  : 'flex-1 py-3 rounded-xl items-center border border-slate-200 bg-white'
              }
            >
              <Text className={language === 'ta' ? 'font-semibold text-teal-700' : 'font-semibold text-slate-600'}>
                தமிழ்
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          onPress={handleLogout}
          className="w-full bg-red-50 border border-red-200 py-4 rounded-2xl items-center mb-8 active:bg-red-100"
        >
          <Text className="text-red-600 font-bold text-lg">{t.profile.logout}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 🚨 SOS EMERGENCY MEDICAL CARD MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEmergencyCard}
        onRequestClose={() => setShowEmergencyCard(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl w-full border border-red-200 overflow-hidden">
            {/* Modal Header */}
            <View className="bg-red-600 px-6 py-5 flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2.5">
                <Ionicons name="pulse" size={26} color="white" />
                <Text className="text-white font-black text-lg uppercase tracking-wider">Emergency Medical Card</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEmergencyCard(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView className="p-6 max-h-[450px]">
              <View className="space-y-4">
                <View className="border-b border-slate-100 pb-3">
                  <Text className="text-slate-400 font-bold text-[10px] uppercase">Patient Full Name</Text>
                  <Text className="text-slate-800 text-lg font-extrabold mt-0.5">{user?.fullName || 'Not provided'}</Text>
                </View>

                <View className="border-b border-slate-100 pb-3 flex-row justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-slate-400 font-bold text-[10px] uppercase">Date of Birth</Text>
                    <Text className="text-slate-800 text-base font-extrabold mt-0.5">{user?.dob || 'Not provided'}</Text>
                  </View>
                  <View className="w-28">
                    <Text className="text-slate-400 font-bold text-[10px] uppercase">Blood Group</Text>
                    <Text className="text-red-600 text-xl font-black mt-0.5">{user?.health_profile?.blood_group || 'Unknown'}</Text>
                  </View>
                </View>

                <View className="border-b border-slate-100 pb-3">
                  <Text className="text-red-500 font-bold text-[10px] uppercase">🚨 Critical Allergies</Text>
                  <Text className="text-red-700 text-sm font-semibold mt-1 leading-relaxed">
                    {user?.health_profile?.allergies || 'No known allergies'}
                  </Text>
                </View>

                <View className="border-b border-slate-100 pb-3">
                  <Text className="text-slate-400 font-bold text-[10px] uppercase">Active Medical Conditions</Text>
                  <Text className="text-slate-800 text-sm font-semibold mt-1 leading-relaxed">
                    {user?.health_profile?.medical_conditions || 'No conditions documented'}
                  </Text>
                </View>

                <View className="pb-2">
                  <Text className="text-slate-400 font-bold text-[10px] uppercase">SOS Emergency Contact</Text>
                  <Text className="text-slate-800 text-base font-extrabold mt-0.5">{user?.emergency_profile?.emergency_contact_name || 'Not configured'}</Text>
                  {user?.emergency_profile?.emergency_contact_phone ? (
                    <Text className="text-teal-700 text-base font-extrabold mt-1">{user?.emergency_profile?.emergency_contact_phone}</Text>
                  ) : null}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View className="border-t border-slate-100 p-6 flex-row space-x-3 bg-slate-50">
              <TouchableOpacity
                onPress={copyEmergencyCardToClipboard}
                className="flex-1 bg-slate-800 py-3.5 rounded-xl flex-row items-center justify-center space-x-2 active:bg-slate-900"
              >
                <Ionicons name="copy-outline" size={18} color="white" />
                <Text className="text-white font-bold text-sm">Copy Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowEmergencyCard(false)}
                className="flex-1 bg-red-600 py-3.5 rounded-xl flex-row items-center justify-center active:bg-red-700"
              >
                <Text className="text-white font-bold text-sm">Close Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
