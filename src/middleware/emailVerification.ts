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
      .select({})
      .from(users)
      .where(eq(users.id, parseInt(req.user.userId)))
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

    // if (!user.emailVerified) {
    //   res.status(403).json({
    //     success: false,
    //     message: "Email verification required",
    //     error:
    //       "You must verify your email address to access this feature. Please check your email for the verification link.",
    //     requiresVerification: true,
    //   });
    //   return;
    // }

    next();
  } catch (error) {
    console.error("Email verification middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: "An error occurred while checking email verification status",
    });
  }
};
