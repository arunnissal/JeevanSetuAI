import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../i18n';
import { getErrorMessage } from '../../utils/errors';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await login({ email, password });
      if (response.success && response.data) {
        const { tokens, user } = response.data;
        setAuth(tokens.access, tokens.refresh, user);
        Alert.alert(t.common.success, 'Logged in successfully!');
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Something went wrong. Please check your credentials.');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between px-6 py-12">
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-extrabold text-slate-900 mb-2">{t.login.title}</Text>
        <Text className="text-slate-500 mb-8">{t.login.subtitle}</Text>

        {error && (
          <View className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
            <Text className="text-red-600 font-medium">{error}</Text>
          </View>
        )}

        <View className="space-y-4">
          <View>
            <Text className="text-slate-600 font-medium mb-2">{t.login.emailLabel}</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
              placeholder={t.login.emailPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mt-4">
            <Text className="text-slate-600 font-medium mb-2">{t.login.passwordLabel}</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-950 focus:border-teal-700"
              placeholder={t.login.passwordPlaceholder}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="bg-teal-700 py-4 rounded-2xl items-center justify-center mt-8 shadow-md active:bg-teal-800"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-lg font-semibold">{t.login.signInButton}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="items-center">
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text className="text-teal-700 font-medium text-base">
            {t.login.noAccount}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
