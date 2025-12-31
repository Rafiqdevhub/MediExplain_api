import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../models/users.model";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
} from "../utils/auth";
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UpdateProfileRequest,
} from "../types/auth";

// Helper function to check and reset monthly limit
const checkAndResetMonthlyLimit = async (userId: string) => {
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userResult.length === 0) return null;

  const user = userResult[0];
  const now = new Date();
  const lastReset = new Date(user.lastLimitReset);

  // Check if a month has passed
  if (
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  ) {
    // Reset the count
    await db
      .update(users)
      .set({
        filesUploadedCount: 0,
        lastLimitReset: now,
      })
      .where(eq(users.id, userId));

    return { ...user, filesUploadedCount: 0, lastLimitReset: now };
  }

  return user;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password }: RegisterRequest = req.body;

    if (!fullName || !email || !password) {
      const response: AuthResponse = {
        success: false,
        message: "Validation Error",
        error: "Full name, email, and password are required",
      };
      res.status(400).json(response);
      return;
    }

    if (password.length < 8) {
      const response: AuthResponse = {
        success: false,
        message: "Validation Error",
        error: "Password must be at least 8 characters long",
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

    let newUser;
    try {
      newUser = await db
        .insert(users)
        .values({
          fullName,
          email: email.toLowerCase(),
          passwordHash: hashedPassword,
          isEmailVerified: true, // Auto-verify for simplicity
          plan: "free",
          filesUploadedCount: 0,
          monthlyFileLimit: 5,
          lastLimitReset: new Date(),
          isActive: true,
        })
        .returning({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          plan: users.plan,
          filesUploadedCount: users.filesUploadedCount,
          monthlyFileLimit: users.monthlyFileLimit,
        });
    } catch (dbError: any) {
      console.error("Database error during registration:", dbError);
      if (dbError?.cause?.code === "23505") {
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

    const accessToken = generateAccessToken({
      userId: newUser[0].id,
      email: newUser[0].email,
      plan: newUser[0].plan,
    });

    const response: AuthResponse = {
      success: true,
      message: "Registration successful!",
      data: {
        accessToken,
        user: {
          id: newUser[0].id,
          fullName: newUser[0].fullName,
          email: newUser[0].email,
          plan: newUser[0].plan,
          filesUploadedCount: newUser[0].filesUploadedCount,
          monthlyFileLimit: newUser[0].monthlyFileLimit,
        },
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

    if (!user.isActive) {
      const response: AuthResponse = {
        success: false,
        message: "Account deactivated",
        error: "Your account has been deactivated. Please contact support.",
      };
      res.status(403).json(response);
      return;
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid credentials",
        error: "Invalid email or password",
      };
      res.status(401).json(response);
      return;
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    const response: AuthResponse = {
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          plan: user.plan,
          filesUploadedCount: user.filesUploadedCount,
          monthlyFileLimit: user.monthlyFileLimit,
          isEmailVerified: user.isEmailVerified,
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

    // Check and reset monthly limit if needed
    const user = await checkAndResetMonthlyLimit(req.user.userId);

    if (!user) {
      const response: AuthResponse = {
        success: false,
        message: "User not found",
        error: "User account not found",
      };
      res.status(404).json(response);
      return;
    }

    const response: AuthResponse = {
      success: true,
      message: "Profile retrieved successfully",
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        plan: user.plan,
        filesUploadedCount: user.filesUploadedCount,
        monthlyFileLimit: user.monthlyFileLimit,
        lastLimitReset: user.lastLimitReset,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
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

    const { fullName, currentPassword, newPassword, confirmPassword } =
      req.body as UpdateProfileRequest;

    const hasFullName = req.body.hasOwnProperty("fullName");
    const hasNewPassword = req.body.hasOwnProperty("newPassword");

    if (!hasFullName && !hasNewPassword) {
      const response: AuthResponse = {
        success: false,
        message: "Validation error",
        error: "At least one field (fullName or newPassword) must be provided",
      };
      res.status(400).json(response);
      return;
    }

    if (hasFullName) {
      if (typeof fullName !== "string" || fullName.trim().length === 0) {
        const response: AuthResponse = {
          success: false,
          message: "Validation error",
          error: "Full name must be a non-empty string",
        };
        res.status(400).json(response);
        return;
      }
      if (fullName.length > 255) {
        const response: AuthResponse = {
          success: false,
          message: "Validation error",
          error: "Full name must be less than 255 characters",
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
      .where(eq(users.id, req.user.userId))
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
        user.passwordHash
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
      updatedAt: new Date(),
    };

    if (fullName !== undefined) {
      updateData.fullName = fullName.trim();
    }

    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        plan: users.plan,
        updatedAt: users.updatedAt,
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
        id: updatedProfile.id,
        fullName: updatedProfile.fullName,
        email: updatedProfile.email,
        plan: updatedProfile.plan,
        updatedAt:
          updatedProfile.updatedAt?.toISOString() || new Date().toISOString(),
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
