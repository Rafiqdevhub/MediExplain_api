import crypto from "crypto";

// Generate a secure verification token
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

// Generate verification expiry date (24 hours from now)
export const generateVerificationExpiry = (): Date => {
  const now = new Date();
  now.setHours(now.getHours() + 24); // 24 hours
  return now;
};

// Validate if token is expired
export const isTokenExpired = (expiryDate: Date | null): boolean => {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
};
