import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/useAuthStore';
import '../global.css'; // Load global CSS

SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Hide splash screen as soon as auth state check is available
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/welcome');
      }
    } else if (user && user.profileProgress < 100) {
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)');
      }
    } else {
      const segs = segments as string[];
      if (inAuthGroup || inOnboardingGroup || segs.length === 0 || segs[0] === 'index') {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, user?.profileProgress, segments]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useProtectedRoute();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
