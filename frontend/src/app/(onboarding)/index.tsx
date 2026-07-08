import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../i18n';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, language, updateUser } = useAuthStore();
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [dob, setDob] = useState(user?.dob || '');
  
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');

  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!fullName) {
        setError('Full Name is required');
        return;
      }
      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        setError('Date of birth must be in YYYY-MM-DD format');
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      setError(null);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setError(null);
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!emergencyContactName || !emergencyContactPhone) {
      setError('Emergency contact details are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        full_name: fullName,
        dob: dob || null,
        language: language, // Send currently selected language to update profile_progress category
        health_profile: {
          blood_group: bloodGroup || null,
          allergies: allergies || null,
          medical_conditions: medicalConditions || null,
        },
        emergency_profile: {
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
        },
      };

      const response = await updateProfile(payload);
      if (response.success && response.data) {
        updateUser(response.data);
        Alert.alert(t.onboarding.successTitle, t.onboarding.successMessage);
      } else {
        setError(response.message || 'Failed to save onboarding details');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || 'Something went wrong while saving details.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between px-6 py-8">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Progress header */}
        <View className="mb-8">
          <Text className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            {t.onboarding.stepLabel.replace('{step}', step.toString())}
          </Text>
          <View className="flex-row space-x-2 mt-2">
            <View className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-teal-700' : 'bg-slate-200'}`} />
            <View className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-teal-700' : 'bg-slate-200'}`} />
            <View className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-teal-700' : 'bg-slate-200'}`} />
          </View>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
            <Text className="text-red-600 font-medium">{error}</Text>
          </View>
        )}

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <View>
            <Text className="text-2xl font-extrabold text-slate-900 mb-2">{t.onboarding.personalTitle}</Text>
            <Text className="text-slate-500 mb-6">{t.onboarding.personalSubtitle}</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-600 font-medium mb-2">{t.onboarding.nameLabel}</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="e.g., Alex Johnson"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-600 font-medium mb-2">{t.onboarding.dobLabel}</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="YYYY-MM-DD"
                  value={dob}
                  onChangeText={setDob}
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Health Info */}
        {step === 2 && (
          <View>
            <Text className="text-2xl font-extrabold text-slate-900 mb-2">{t.onboarding.healthTitle}</Text>
            <Text className="text-slate-500 mb-6">{t.onboarding.healthSubtitle}</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-600 font-medium mb-2">{t.onboarding.bloodGroupLabel}</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder={t.onboarding.bloodGroupPlaceholder}
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                  autoCapitalize="characters"
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-600 font-medium mb-2">{t.onboarding.allergiesLabel}</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder={t.onboarding.allergiesPlaceholder}
                  value={allergies}
                  onChangeText={setAllergies}
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-600 font-medium mb-2">{t.onboarding.conditionsLabel}</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder={t.onboarding.conditionsPlaceholder}
                  value={medicalConditions}
                  onChangeText={setMedicalConditions}
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Emergency Profile */}
        {step === 3 && (
          <View>
            <Text className="text-2xl font-extrabold text-slate-900 mb-2">{t.onboarding.emergencyTitle}</Text>
            <Text className="text-slate-500 mb-6">{t.onboarding.emergencySubtitle}</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-600 font-medium mb-2">{t.onboarding.contactNameLabel}</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="e.g., Jane Johnson (Spouse)"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-600 font-medium mb-2">{t.onboarding.contactPhoneLabel}</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="e.g., +919876543210"
                  keyboardType="phone-pad"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Button controls */}
      <View className="flex-row space-x-4 mt-6">
        {step > 1 && (
          <TouchableOpacity
            onPress={handleBack}
            className="flex-1 border border-slate-200 bg-white py-4 rounded-2xl items-center active:bg-slate-50"
          >
            <Text className="text-slate-700 text-lg font-semibold">{t.onboarding.backButton}</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            onPress={handleNext}
            className="flex-1 bg-teal-700 py-4 rounded-2xl items-center mt-0 active:bg-teal-800"
          >
            <Text className="text-white text-lg font-semibold">{t.onboarding.continueButton}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="flex-1 bg-teal-700 py-4 rounded-2xl items-center justify-center mt-0 active:bg-teal-800"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-semibold">{t.onboarding.submitButton}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
