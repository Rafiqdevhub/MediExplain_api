import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../models/users.model";

export const requireEmailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "You must be logged in to access this resource",
      });
      return;
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (userResult.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
        error: "Your account could not be found",
      });
      return;
    }

    const user = userResult[0];

    // Check if account is active
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "Account deactivated",
        error: "Your account has been deactivated. Please contact support.",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Email verification middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: "An error occurred while checking account status",
    });
  }
};
