export interface RegisterRequest {
  name: string;
  email: string;
  password: string; // For backward compatibility
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordWithTokenRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface RefreshTokenRequest {
  // Refresh token comes from HttpOnly cookie
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  requiresVerification?: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface TokenResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  };
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}
