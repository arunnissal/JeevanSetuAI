import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { register } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../i18n';
import { getErrorMessage } from '../../utils/errors';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      setError('Please fill in all required fields');
      return;
    }

    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError('Date of birth must be in YYYY-MM-DD format');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = { email, password, full_name: fullName };
      if (dob) payload.dob = dob;

      const response = await register(payload);
      if (response.success && response.data) {
        const { tokens, user } = response.data;
        setAuth(tokens.access, tokens.refresh, user);
        Alert.alert(t.common.success, 'Account created successfully!');
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Registration failed. Email might already be taken.');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between px-6 py-8">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <Text className="text-3xl font-extrabold text-slate-900 mb-2">{t.register.title}</Text>
        <Text className="text-slate-500 mb-8">{t.register.subtitle}</Text>

        {error && (
          <View className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
            <Text className="text-red-600 font-medium">{error}</Text>
          </View>
        )}

        <View className="space-y-4">
          <View>
            <Text className="text-slate-600 font-medium mb-2">{t.register.nameLabel}</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
              placeholder={t.register.namePlaceholder}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View className="mt-4">
            <Text className="text-slate-600 font-medium mb-2">{t.register.emailLabel}</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
              placeholder="e.g., alex@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mt-4">
            <Text className="text-slate-600 font-medium mb-2">{t.register.passwordLabel}</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View className="mt-4">
            <Text className="text-slate-600 font-medium mb-2">{t.register.dobLabel}</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
              placeholder={t.register.dobPlaceholder}
              value={dob}
              onChangeText={setDob}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          className="bg-teal-700 py-4 rounded-2xl items-center justify-center mt-8 shadow-md active:bg-teal-800"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-lg font-semibold">{t.register.signUpButton}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <View className="items-center mt-6">
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text className="text-teal-700 font-medium text-base">
            {t.register.alreadyHaveAccount}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
