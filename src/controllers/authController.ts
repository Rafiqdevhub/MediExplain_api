import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../models/users.model";
import {
  hashPassword,
  verifyPassword,
  hashRefreshToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshTokenSignature,
  extractRefreshTokenFromCookie,
} from "../utils/auth";
import {
  RegisterRequest,
  LoginRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  AuthResponse,
  ChangePasswordRequest,
  UpdateProfileRequest,
} from "../types/auth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/emailService";
import {
  generateVerificationToken,
  generateVerificationExpiry,
  isTokenExpired,
} from "../utils/emailVerification";
import {
  generatePasswordResetToken,
  generatePasswordResetExpiry,
  isPasswordResetTokenExpired,
  validatePassword,
  validateEmailFormat,
  normalizeEmail,
} from "../utils/passwordReset";

const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
  });
};

const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password }: RegisterRequest = req.body;

    if (!name || !email || !password) {
      const response: AuthResponse = {
        success: false,
        message: "Validation Error",
        error: "Name, email, and password are required",
      };
      res.status(400).json(response);
      return;
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      const response: AuthResponse = {
        success: false,
        message: "User already exists",
        error: "A user with this email already exists",
      };
      res.status(409).json(response);
      return;
    }
    const hashedPassword = await hashPassword(password);
    const verificationToken = generateVerificationToken();
    const verificationExpiry = generateVerificationExpiry();

    let newUser;
    try {
      newUser = await db
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          emailVerified: false,
          verificationToken,
          verificationExpires: verificationExpiry,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
        });
    } catch (dbError: any) {
      console.error("Database error during registration:", dbError);
      if (dbError?.cause?.code === "22001") {
        // Value too long for column
        const response: AuthResponse = {
          success: false,
          message: "Validation Error",
          error: "Input data exceeds maximum allowed length",
        };
        res.status(400).json(response);
        return;
      }

      if (dbError?.cause?.code === "23505") {
        // Unique constraint violation (duplicate email)
        const response: AuthResponse = {
          success: false,
          message: "User already exists",
          error: "A user with this email already exists",
        };
        res.status(409).json(response);
        return;
      }
      throw dbError;
    }

    if (newUser.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "Registration failed",
        error: "Failed to create user account",
      };
      res.status(500).json(response);
      return;
    }

    // Send verification email
    const emailSent = await sendVerificationEmail(
      newUser[0].email,
      newUser[0].name,
      verificationToken
    );

    if (!emailSent) {
      console.error("Failed to send verification email to:", newUser[0].email);
      // Don't fail registration if email fails, but log it
    }

    const response: AuthResponse = {
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      data: {
        user: {
          id: newUser[0].id.toString(),
          name: newUser[0].name,
          email: newUser[0].email,
          emailVerified: false,
        },
        requiresVerification: true,
      },
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Registration error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during registration",
    };
    res.status(500).json(response);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      const response: AuthResponse = {
        success: false,
        message: "Validation Error",
        error: "Email and password are required",
      };
      res.status(400).json(response);
      return;
    }
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid credentials",
        error: "Invalid email or password",
      };
      res.status(401).json(response);
      return;
    }

    const user = userResult[0];
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid credentials",
        error: "Invalid email or password",
      };
      res.status(401).json(response);
      return;
    }

    // Check if email is verified
    if (!user.emailVerified) {
      const response: AuthResponse = {
        success: false,
        message: "Email not verified",
        error:
          "Please verify your email address before logging in. Check your email for the verification link.",
        requiresVerification: true,
      };
      res.status(403).json(response);
      return;
    }

    const accessToken = generateAccessToken({
      userId: user.id.toString(),
      email: user.email,
    });
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = await hashRefreshToken(refreshToken);
    await db
      .update(users)
      .set({ refreshToken: hashedRefreshToken })
      .where(eq(users.id, user.id));
    setRefreshTokenCookie(res, refreshToken);

    const response: AuthResponse = {
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Login error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during login",
    };
    res.status(500).json(response);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token }: VerifyEmailRequest = req.body;

    if (!token) {
      const response: AuthResponse = {
        success: false,
        message: "Validation Error",
        error: "Verification token is required",
      };
      res.status(400).json(response);
      return;
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid token",
        error: "Verification token is invalid or has already been used",
      };
      res.status(400).json(response);
      return;
    }

    const user = userResult[0];

    // Check if token is expired
    if (isTokenExpired(user.verificationExpires)) {
      const response: AuthResponse = {
        success: false,
        message: "Token expired",
        error:
          "Verification token has expired. Please request a new verification email.",
      };
      res.status(400).json(response);
      return;
    }

    // Check if already verified
    if (user.emailVerified) {
      const response: AuthResponse = {
        success: false,
        message: "Already verified",
        error: "This email address has already been verified",
      };
      res.status(400).json(response);
      return;
    }

    // Update user as verified and clear verification data
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      })
      .where(eq(users.id, user.id));

    // Generate tokens for immediate login
    const accessToken = generateAccessToken({
      userId: user.id.toString(),
      email: user.email,
    });
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = await hashRefreshToken(refreshToken);

    await db
      .update(users)
      .set({ refreshToken: hashedRefreshToken })
      .where(eq(users.id, user.id));

    setRefreshTokenCookie(res, refreshToken);

    const response: AuthResponse = {
      success: true,
      message: "Email verified successfully! You are now logged in.",
      data: {
        accessToken,
        user: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          emailVerified: true,
        },
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Email verification error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during email verification",
    };
    res.status(500).json(response);
  }
};

export const resendVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email }: ResendVerificationRequest = req.body;

    if (!email) {
      const response: AuthResponse = {
        success: false,
        message: "Validation Error",
        error: "Email address is required",
      };
      res.status(400).json(response);
      return;
    }

    // Find user by email
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "User not found",
        error: "No account found with this email address",
      };
      res.status(404).json(response);
      return;
    }

    const user = userResult[0];

    // Check if already verified
    if (user.emailVerified) {
      const response: AuthResponse = {
        success: false,
        message: "Already verified",
        error: "This email address has already been verified",
      };
      res.status(400).json(response);
      return;
    }

    // Generate new verification token and expiry
    const verificationToken = generateVerificationToken();
    const verificationExpiry = generateVerificationExpiry();

    // Update user with new verification data
    await db
      .update(users)
      .set({
        verificationToken,
        verificationExpires: verificationExpiry,
      })
      .where(eq(users.id, user.id));

    // Send new verification email
    const emailSent = await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    if (!emailSent) {
      console.error("Failed to send verification email to:", user.email);
      const response: AuthResponse = {
        success: false,
        message: "Email sending failed",
        error: "Failed to send verification email. Please try again later.",
      };
      res.status(500).json(response);
      return;
    }

    const response: AuthResponse = {
      success: true,
      message: "Verification email sent successfully",
      data: {
        email: user.email,
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Resend verification error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred while sending verification email",
    };
    res.status(500).json(response);
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = extractRefreshTokenFromCookie(req.cookies);

    if (!refreshToken) {
      const response: AuthResponse = {
        success: false,
        message: "Refresh token required",
        error: "No refresh token provided",
      };
      res.status(401).json(response);
      return;
    }

    let decoded;
    try {
      decoded = verifyRefreshTokenSignature(refreshToken);
    } catch (error) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid refresh token",
        error: "Refresh token is invalid or expired",
      };
      res.status(401).json(response);
      return;
    }

    // Find user with matching refresh token
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, decoded.email))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid refresh token",
        error: "User not found",
      };
      res.status(401).json(response);
      return;
    }

    const user = userResult[0];

    // Verify refresh token hash
    if (!user.refreshToken) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid refresh token",
        error: "No stored refresh token",
      };
      res.status(401).json(response);
      return;
    }

    const isRefreshTokenValid = await verifyRefreshToken(
      refreshToken,
      user.refreshToken
    );
    if (!isRefreshTokenValid) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid refresh token",
        error: "Refresh token does not match stored token",
      };
      res.status(401).json(response);
      return;
    }

    const newAccessToken = generateAccessToken({
      userId: user.id.toString(),
      email: user.email,
    });
    const newRefreshToken = generateRefreshToken();
    const hashedNewRefreshToken = await hashRefreshToken(newRefreshToken);

    await db
      .update(users)
      .set({ refreshToken: hashedNewRefreshToken })
      .where(eq(users.id, user.id));

    setRefreshTokenCookie(res, newRefreshToken);

    const response: AuthResponse = {
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Refresh token error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during token refresh",
    };
    res.status(500).json(response);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = extractRefreshTokenFromCookie(req.cookies);
    if (refreshToken) {
      try {
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.refreshToken, await hashRefreshToken(refreshToken)))
          .limit(1);

        if (userResult.length > 0) {
          await db
            .update(users)
            .set({ refreshToken: null })
            .where(eq(users.id, userResult[0].id));
        }
      } catch (error) {
        console.error("Error clearing refresh token from database:", error);
      }
    }
    clearRefreshTokenCookie(res);

    const response: AuthResponse = {
      success: true,
      message: "Logged out successfully",
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Logout error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during logout",
    };
    res.status(500).json(response);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, newPassword }: ResetPasswordRequest = req.body;

    if (!email || !newPassword) {
      const response: AuthResponse = {
        success: false,
        message: "Validation Error",
        error: "Email and new password are required",
      };
      res.status(400).json(response);
      return;
    }

    if (newPassword.length < 8) {
      const response: AuthResponse = {
        success: false,
        message: "Validation error",
        error: "New password must be at least 8 characters long",
      };
      res.status(400).json(response);
      return;
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "User not found",
        error: "No user found with this email address",
      };
      res.status(404).json(response);
      return;
    }

    const user = userResult[0];
    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        refreshToken: null,
      })
      .where(eq(users.id, user.id));

    const response: AuthResponse = {
      success: true,
      message: "Password reset successfully",
      data: {
        message:
          "Password has been reset. Please login with your new password.",
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Reset password error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during password reset",
    };
    res.status(500).json(response);
  }
};

export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      const response: AuthResponse = {
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      };
      res.status(401).json(response);
      return;
    }

    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, parseInt(req.user.userId)))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "User not found",
        error: "User account not found",
      };
      res.status(404).json(response);
      return;
    }

    const user = userResult[0];

    const response: AuthResponse = {
      success: true,
      message: "Profile retrieved successfully",
      data: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.created_at?.toISOString() || new Date().toISOString(),
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Get profile error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during profile retrieval",
    };
    res.status(500).json(response);
  }
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      const response: AuthResponse = {
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      };
      res.status(401).json(response);
      return;
    }

    const { currentPassword, newPassword, confirmPassword } =
      req.body as ChangePasswordRequest;

    if (!currentPassword || !newPassword || !confirmPassword) {
      const response: AuthResponse = {
        success: false,
        message: "Validation error",
        error: "All password fields are required",
      };
      res.status(400).json(response);
      return;
    }

    if (newPassword !== confirmPassword) {
      const response: AuthResponse = {
        success: false,
        message: "Validation error",
        error: "New password and confirm password do not match",
      };
      res.status(400).json(response);
      return;
    }

    if (newPassword.length < 8) {
      const response: AuthResponse = {
        success: false,
        message: "Validation error",
        error: "New password must be at least 8 characters long",
      };
      res.status(400).json(response);
      return;
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(req.user.userId)))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "User not found",
        error: "User account not found",
      };
      res.status(404).json(response);
      return;
    }

    const user = userResult[0];

    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid current password",
        error: "Current password is incorrect",
      };
      res.status(400).json(response);
      return;
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        refreshToken: null,
      })
      .where(eq(users.id, user.id));

    const response: AuthResponse = {
      success: true,
      message: "Password changed successfully",
      data: {
        message:
          "Password has been changed. You have been logged out from other devices.",
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Change password error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during password change",
    };
    res.status(500).json(response);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      const response: AuthResponse = {
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      };
      res.status(401).json(response);
      return;
    }

    const { name, currentPassword, newPassword, confirmPassword } =
      req.body as UpdateProfileRequest;

    const hasName = req.body.hasOwnProperty("name");
    const hasNewPassword = req.body.hasOwnProperty("newPassword");

    if (!hasName && !hasNewPassword) {
      const response: AuthResponse = {
        success: false,
        message: "Validation error",
        error: "At least one field (name or newPassword) must be provided",
      };
      res.status(400).json(response);
      return;
    }

    if (hasName) {
      if (typeof name !== "string" || name.trim().length === 0) {
        const response: AuthResponse = {
          success: false,
          message: "Validation error",
          error: "Name must be a non-empty string",
        };
        res.status(400).json(response);
        return;
      }
      if (name.length > 255) {
        const response: AuthResponse = {
          success: false,
          message: "Validation error",
          error: "Name must be less than 255 characters",
        };
        res.status(400).json(response);
        return;
      }
    }

    if (hasNewPassword) {
      if (!currentPassword) {
        const response: AuthResponse = {
          success: false,
          message: "Validation error",
          error: "Current password is required when changing password",
        };
        res.status(400).json(response);
        return;
      }

      if (!confirmPassword) {
        const response: AuthResponse = {
          success: false,
          message: "Validation error",
          error: "Confirm password is required when changing password",
        };
        res.status(400).json(response);
        return;
      }

      if (newPassword !== confirmPassword) {
        const response: AuthResponse = {
          success: false,
          message: "Validation error",
          error: "New password and confirm password do not match",
        };
        res.status(400).json(response);
        return;
      }

      if (newPassword.length < 8) {
        const response: AuthResponse = {
          success: false,
          message: "Validation error",
          error: "New password must be at least 8 characters long",
        };
        res.status(400).json(response);
        return;
      }
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(req.user.userId)))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "User not found",
        error: "User account not found",
      };
      res.status(404).json(response);
      return;
    }

    const user = userResult[0];

    if (newPassword) {
      const isCurrentPasswordValid = await verifyPassword(
        currentPassword!,
        user.password
      );
      if (!isCurrentPasswordValid) {
        const response: AuthResponse = {
          success: false,
          message: "Invalid current password",
          error: "Current password is incorrect",
        };
        res.status(400).json(response);
        return;
      }
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (newPassword) {
      updateData.password = await hashPassword(newPassword);
      updateData.refreshToken = null;
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        updated_at: users.updated_at,
      });

    if (updatedUser.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "Update failed",
        error: "Failed to update profile",
      };
      res.status(500).json(response);
      return;
    }

    const updatedProfile = updatedUser[0];

    const response: AuthResponse = {
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedProfile.id.toString(),
        name: updatedProfile.name,
        email: updatedProfile.email,

        emailVerified: updatedProfile.emailVerified,
        updatedAt:
          updatedProfile.updated_at?.toISOString() || new Date().toISOString(),
        ...(newPassword && {
          securityNote:
            "Password has been changed. You have been logged out from other devices.",
        }),
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Update profile error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during profile update",
    };
    res.status(500).json(response);
  }
};

/**
 * Forgot Password - Send password reset email
 * Step 1 of password reset flow
 * Validates email, generates reset token, sends email
 */
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    // Validate email is provided
    if (!email || typeof email !== "string") {
      res.status(400).json({
        success: false,
        message: "Email is required",
        error: "EMAIL_REQUIRED",
      });
      return;
    }

    // Validate email format
    const normalizedEmail = normalizeEmail(email);
    if (!validateEmailFormat(normalizedEmail)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
        error: "INVALID_EMAIL_FORMAT",
      });
      return;
    }

    // Find user by email (don't reveal if exists for security)
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Always return success for security (prevents email enumeration attacks)
    const response: AuthResponse = {
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent",
    };

    // If user doesn't exist, return success without sending email
    if (userResult.length === 0) {
      console.log(
        `Password reset requested for non-existent email: ${normalizedEmail}`
      );
      res.status(200).json(response);
      return;
    }

    const user = userResult[0];

    // Generate reset token and expiry
    const resetToken = generatePasswordResetToken();
    const resetExpiry = generatePasswordResetExpiry();

    // Update user with reset token in database
    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpires: resetExpiry,
      })
      .where(eq(users.id, user.id));

    console.log(`Reset token generated for user: ${user.email}`);

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken
    );

    if (!emailSent) {
      console.warn(`Failed to send password reset email to ${user.email}`);
      // Still return success to not reveal email status
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Forgot password error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during password reset request",
    };
    res.status(500).json(response);
  }
};

/**
 * Reset Password - Complete password reset with token
 * Step 2 of password reset flow
 * Validates token, updates password, clears reset token
 */
export const resetPasswordWithToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!token || typeof token !== "string") {
      res.status(400).json({
        success: false,
        message: "Reset token is required",
        error: "TOKEN_REQUIRED",
      });
      return;
    }

    if (!newPassword || typeof newPassword !== "string") {
      res.status(400).json({
        success: false,
        message: "New password is required",
        error: "PASSWORD_REQUIRED",
      });
      return;
    }

    if (!confirmPassword || typeof confirmPassword !== "string") {
      res.status(400).json({
        success: false,
        message: "Password confirmation is required",
        error: "CONFIRM_PASSWORD_REQUIRED",
      });
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: "Passwords do not match",
        error: "PASSWORDS_MISMATCH",
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message:
          passwordValidation.message || "Password does not meet requirements",
        error: "WEAK_PASSWORD",
      });
      return;
    }

    // Find user by reset token
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token))
      .limit(1);

    if (userResult.length === 0) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        error: "INVALID_TOKEN",
      });
      return;
    }

    const user = userResult[0];

    // Check if token has expired
    if (isPasswordResetTokenExpired(user.resetTokenExpires)) {
      res.status(400).json({
        success: false,
        message:
          "Reset token has expired. Please request a new password reset.",
        error: "TOKEN_EXPIRED",
      });
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      })
      .where(eq(users.id, user.id));

    console.log(`Password reset successfully for user: ${user.email}`);

    const response: AuthResponse = {
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Reset password error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during password reset",
    };
    res.status(500).json(response);
  }
};

/**
 * Internal Test Endpoint - Verify Email for Testing Only
 * This endpoint is for development/testing purposes only
 * It directly marks an email as verified without requiring a token
 */
export const internalVerifyEmailForTest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === "production") {
      const response: AuthResponse = {
        success: false,
        message: "Forbidden",
        error: "This endpoint is not available in production",
      };
      res.status(403).json(response);
      return;
    }

    const { email } = req.body;

    if (!email || typeof email !== "string") {
      const response: AuthResponse = {
        success: false,
        message: "Validation Error",
        error: "Email is required",
      };
      res.status(400).json(response);
      return;
    }

    // Find user by email
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      const response: AuthResponse = {
        success: false,
        message: "User not found",
        error: "No user found with this email address",
      };
      res.status(404).json(response);
      return;
    }

    // Update user to mark email as verified and clear verification token
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      })
      .where(eq(users.email, email.toLowerCase()));

    const response: AuthResponse = {
      success: true,
      message: "Email verified successfully for testing",
      data: {
        email: email.toLowerCase(),
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Internal verify email error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during email verification",
    };
    res.status(500).json(response);
  }
};
