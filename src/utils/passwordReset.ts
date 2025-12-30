import { randomBytes } from "crypto";

export const generatePasswordResetToken = (): string => {
  return randomBytes(32).toString("hex");
};

export const generatePasswordResetExpiry = (): Date => {
  const now = new Date();
  now.setHours(now.getHours() + 24);
  return now;
};

export const isPasswordResetTokenExpired = (
  expiryDate: Date | null
): boolean => {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
};

export const validatePassword = (
  password: string
): { isValid: boolean; message?: string } => {
  // Minimum 8 characters
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }

  return { isValid: true };
};

// Validate email format using regex pattern
export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Normalize email by converting to lowercase and trimming whitespace
export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};
