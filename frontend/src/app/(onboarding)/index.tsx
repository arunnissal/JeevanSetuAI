import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

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
      // Step 2 is fully optional but encouraged
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
        Alert.alert('Onboarding Complete', 'Welcome to JeevanSetu AI!');
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
            Step {step} of 3
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
            <Text className="text-2xl font-extrabold text-slate-900 mb-2">Personal Profile</Text>
            <Text className="text-slate-500 mb-6">Please enter your basic profile information.</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-600 font-medium mb-2">Full Name *</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="e.g., Alex Johnson"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-600 font-medium mb-2">Date of Birth (Optional)</Text>
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
            <Text className="text-2xl font-extrabold text-slate-900 mb-2">Health Profile</Text>
            <Text className="text-slate-500 mb-6">These details help us customize your experience.</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-600 font-medium mb-2">Blood Group</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="e.g., O+, A-"
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                  autoCapitalize="characters"
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-600 font-medium mb-2">Allergies (Optional)</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="e.g., Penicillin, Peanuts"
                  value={allergies}
                  onChangeText={setAllergies}
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-600 font-medium mb-2">Medical Conditions (Optional)</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="e.g., Hypertension, Asthma"
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
            <Text className="text-2xl font-extrabold text-slate-900 mb-2">Emergency Profile</Text>
            <Text className="text-slate-500 mb-6">Who should we notify during an emergency SOS?</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-600 font-medium mb-2">Emergency Contact Name *</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
                  placeholder="e.g., Jane Johnson (Spouse)"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                />
              </View>

              <View className="mt-4">
                <Text className="text-slate-600 font-medium mb-2">Emergency Contact Phone *</Text>
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
            <Text className="text-slate-700 text-lg font-semibold">Back</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            onPress={handleNext}
            className="flex-1 bg-teal-700 py-4 rounded-2xl items-center active:bg-teal-800"
          >
            <Text className="text-white text-lg font-semibold">Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="flex-1 bg-teal-700 py-4 rounded-2xl items-center justify-center active:bg-teal-800"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-semibold">Submit</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
