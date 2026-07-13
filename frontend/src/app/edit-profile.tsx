import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../i18n';
import { updateProfile } from '../api/auth';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser, language } = useAuthStore();
  const { t } = useTranslation();

  // Form states
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [aiPersonalization, setAiPersonalization] = useState('');

  const [saving, setSaving] = useState(false);

  // Load existing profile values
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setDob(user.dob || '');
      setBloodGroup(user.health_profile?.blood_group || '');
      setAllergies(user.health_profile?.allergies || '');
      setMedicalConditions(user.health_profile?.medical_conditions || '');
      setEmergencyContactName(user.emergency_profile?.emergency_contact_name || '');
      setEmergencyContactPhone(user.emergency_profile?.emergency_contact_phone || '');
      setAiPersonalization(user.health_profile?.ai_personalization || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Full Name is required.');
      return;
    }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      Alert.alert('Invalid Date', 'Date of Birth must be in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        dob: dob.trim() || null,
        language: language,
        health_profile: {
          blood_group: bloodGroup || null,
          allergies: allergies.trim() || null,
          medical_conditions: medicalConditions.trim() || null,
          ai_personalization: aiPersonalization.trim() || null,
        },
        emergency_profile: {
          emergency_contact_name: emergencyContactName.trim() || null,
          emergency_contact_phone: emergencyContactPhone.trim() || null,
        },
      };

      const response = await updateProfile(payload);
      if (response.success && response.data) {
        updateUser(response.data);
        Alert.alert('Success', 'Profile updated successfully.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile.');
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.response?.data?.detail || 'An error occurred while saving profile changes.';
      Alert.alert('Error', errMsg);
    } finally {
      setSaving(false);
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

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-slate-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 py-1">
          <Ionicons name="arrow-back" size={24} color="#0f766e" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">Edit Health Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text className="text-slate-400 text-xs mb-6 leading-relaxed">
          Update your medical history, identity credentials, emergency settings, and custom AI personalization preferences.
        </Text>

        {/* 1. PERSONAL INFORMATION */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="person-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">Personal Identity</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-slate-500 font-bold text-xs mb-1.5">Full Name *</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Alex Johnson"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
              />
            </View>

            <View className="mt-3">
              <Text className="text-slate-500 font-bold text-xs mb-1.5">Email Address (Read-only)</Text>
              <TextInput
                value={user?.email || ''}
                editable={false}
                placeholder="e.g. user@example.com"
                placeholderTextColor="#94a3b8"
                className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 text-sm"
              />
            </View>

            <View className="mt-3">
              <Text className="text-slate-500 font-bold text-xs mb-1.5">Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
              />
            </View>
          </View>
        </View>

        {/* 2. HEALTH INFORMATION */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="medkit-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">Health Information</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-slate-500 font-bold text-xs mb-2">Blood Group</Text>
              <View className="flex-row flex-wrap">
                {BLOOD_GROUPS.map((bg) => {
                  const isSelected = bloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      onPress={() => setBloodGroup(isSelected ? '' : bg)}
                      className={
                        isSelected 
                          ? 'px-3.5 py-2.5 rounded-xl border mr-2 mb-2 border-teal-700 bg-teal-50' 
                          : 'px-3.5 py-2.5 rounded-xl border mr-2 mb-2 border-slate-200 bg-white'
                      }
                    >
                      <Text className={isSelected ? 'text-xs font-bold text-teal-700' : 'text-xs font-bold text-slate-600'}>
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="mt-3">
              <Text className="text-slate-500 font-bold text-xs mb-1.5">Allergies (Separated by commas)</Text>
              <TextInput
                value={allergies}
                onChangeText={setAllergies}
                placeholder="e.g. Penicillin, Peanuts, Pollen"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
              />
            </View>

            <View className="mt-3">
              <Text className="text-slate-500 font-bold text-xs mb-1.5">Medical Conditions & History</Text>
              <TextInput
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                placeholder="e.g. Hypertension, Diabetes Type 2"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
              />
            </View>
          </View>
        </View>

        {/* 3. EMERGENCY SOS CONTACT */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="alert-circle-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">Emergency SOS Contact</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-slate-500 font-bold text-xs mb-1.5">Emergency Contact Name</Text>
              <TextInput
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                placeholder="e.g. Jane Johnson"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
              />
            </View>

            <View className="mt-3">
              <Text className="text-slate-500 font-bold text-xs mb-1.5">Emergency Phone Number</Text>
              <TextInput
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                placeholder="e.g. +919876543210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
              />
            </View>
          </View>
        </View>

        {/* 4. AI PERSONALIZATION */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6">
          <View className="flex-row items-center mb-4 space-x-2">
            <Ionicons name="options-outline" size={18} color="#0f766e" />
            <Text className="text-slate-800 font-extrabold text-base">AI Personalization</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-slate-500 font-bold text-xs mb-1.5">Custom AI Companion Instructions</Text>
              <TextInput
                value={aiPersonalization}
                onChangeText={setAiPersonalization}
                placeholder="e.g. I prefer very simple layman summaries. Always highlight dietary warnings. I am vegetarian."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm h-24"
              />
            </View>
          </View>
        </View>

        {/* 5. LANGUAGE SETTINGS */}
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

        {/* SAVE CHANGES */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="w-full bg-teal-700 py-4 rounded-2xl items-center justify-center mb-8 active:bg-teal-800"
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold text-lg">Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
