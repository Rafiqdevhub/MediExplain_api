export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  plan: "free" | "pro" | "enterprise";
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  isEmailVerified: boolean;
  plan: "free" | "pro" | "enterprise";
  filesUploadedCount: number;
  monthlyFileLimit: number;
  lastLimitReset: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileResponse {
  id: string;
  fullName: string;
  email: string;
  plan: "free" | "pro" | "enterprise";
  filesUploadedCount: number;
  monthlyFileLimit: number;
  lastLimitReset: Date;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  data?: {
    fileId: string;
    fileName: string;
    uploadedAt: Date;
    filesRemaining: number;
  };
  error?: string;
}
