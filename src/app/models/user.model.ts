export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  state: string;
  email: string;
  whatsappNumber: string;
  dateOfBirth: string;
  companyName: string;
  industry: string;
  briefProfile: string;
  workingSince: string;
  areasOfInterest: string;
  linkedinProfile?: string;
  website?: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

export interface User {
  id: number;
  name: string;
  email: string;
  state: string;
  whatsappNumber: string;
  dateOfBirth: string;
  companyName: string;
  industry: string;
  briefProfile: string;
  workingSince: string;
  areasOfInterest: string;
  linkedinProfile?: string;
  website?: string;
  createdAt: string;
}

export interface UserLookup {
  id: number;
  name: string;
  email: string;
}
