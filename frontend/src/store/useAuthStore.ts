import { create } from 'zustand';
import apiClient from '../api/axios';
import { User } from '../types';

const mapUser = (rawUser: any): User | null => {
  if (!rawUser) return null;
  return {
    id: rawUser.id,
    email: rawUser.email,
    fullName: rawUser.full_name || '',
    dob: rawUser.dob || '',
    profileProgress: rawUser.profile_progress ?? 0,
    language: rawUser.language || 'en',
    health_profile: rawUser.health_profile ? {
      blood_group: rawUser.health_profile.blood_group || '',
      allergies: rawUser.health_profile.allergies || '',
      medical_conditions: rawUser.health_profile.medical_conditions || '',
      ai_personalization: rawUser.health_profile.ai_personalization || '',
    } : undefined,
    emergency_profile: rawUser.emergency_profile ? {
      emergency_contact_name: rawUser.emergency_profile.emergency_contact_name || '',
      emergency_contact_phone: rawUser.emergency_profile.emergency_contact_phone || '',
    } : undefined,
  };
};

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  language: string; // 'en' | 'hi'
  setLanguage: (lang: string) => void;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
  refreshAuthToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  language: 'en',
  
  setLanguage: (lang) => set({ language: lang }),
  
  setAuth: (token, refreshToken, user) => {
    // Set token in Axios Authorization header
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ token, refreshToken, user: mapUser(user), isAuthenticated: true });
  },
  
  updateUser: (user) => set({ user: mapUser(user) }),
  
  logout: async () => {
    const { refreshToken } = get();
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh: refreshToken });
      }
    } catch (e) {
      console.warn("Logout request failed, proceeding with local clear.", e);
    } finally {
      delete apiClient.defaults.headers.common['Authorization'];
      set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
    }
  },
  
  refreshAuthToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;
    try {
      const response = await apiClient.post('/auth/refresh', { refresh: refreshToken });
      const newToken = response.data.access;
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      set({ token: newToken });
      return true;
    } catch (e) {
      console.error("Token refresh failed:", e);
      // Auto logout on refresh failure
      delete apiClient.defaults.headers.common['Authorization'];
      set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
      return false;
    }
  }
}));
