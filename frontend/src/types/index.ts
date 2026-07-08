export interface User {
  id: string;
  email: string;
  fullName: string;
  dob?: string;
  profileProgress: number; // setup completion (0-100)
}

export interface HealthProfile {
  bloodGroup?: string;
  allergies?: string[];
  medicalConditions?: string[];
}

export interface EmergencyProfile {
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodGroup?: string;
  allergies?: string[];
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
