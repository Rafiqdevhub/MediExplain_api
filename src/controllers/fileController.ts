import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../models/users.model";
import { FileUploadResponse } from "../types/auth";

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

export const uploadFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      const response: FileUploadResponse = {
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
      const response: FileUploadResponse = {
        success: false,
        message: "User not found",
        error: "User account not found",
      };
      res.status(404).json(response);
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      const response: FileUploadResponse = {
        success: false,
        message: "Account deactivated",
        error: "Your account has been deactivated. Please contact support.",
      };
      res.status(403).json(response);
      return;
    }

    // Check if user has reached their limit
    if (user.filesUploadedCount >= user.monthlyFileLimit) {
      const response: FileUploadResponse = {
        success: false,
        message: "Upload limit reached",
        error: `You have reached your monthly upload limit of ${user.monthlyFileLimit} files. Please upgrade your plan or wait until next month.`,
      };
      res.status(429).json(response);
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      const response: FileUploadResponse = {
        success: false,
        message: "Validation Error",
        error: "No file uploaded",
      };
      res.status(400).json(response);
      return;
    }

    // TODO: Process the file (save to storage, database, etc.)
    const file = req.file;

    // Increment the user's upload count
    await db
      .update(users)
      .set({
        filesUploadedCount: user.filesUploadedCount + 1,
      })
      .where(eq(users.id, user.id));

    const response: FileUploadResponse = {
      success: true,
      message: "File uploaded successfully",
      data: {
        fileId: `file_${Date.now()}`, // TODO: Generate proper file ID
        fileName: file.originalname,
        uploadedAt: new Date(),
        filesRemaining: user.monthlyFileLimit - (user.filesUploadedCount + 1),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("File upload error:", error);
    const response: FileUploadResponse = {
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred during file upload",
    };
    res.status(500).json(response);
  }
};

export const getUploadStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      });
      return;
    }

    // Check and reset monthly limit if needed
    const user = await checkAndResetMonthlyLimit(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        error: "User account not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Upload stats retrieved successfully",
      data: {
        filesUploaded: user.filesUploadedCount,
        monthlyLimit: user.monthlyFileLimit,
        filesRemaining: user.monthlyFileLimit - user.filesUploadedCount,
        lastReset: user.lastLimitReset,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("Get upload stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: "An unexpected error occurred while retrieving upload stats",
    });
  }
};
