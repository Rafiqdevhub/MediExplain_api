import express from "express";
import {
  register,
  login,
  resetPassword,
  refresh,
  logout,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPasswordWithToken,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { requireEmailVerification } from "../middleware/emailVerification";

const router = express.Router();

// Authentication routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/reset-password", resetPassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password-with-token", resetPasswordWithToken);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.put(
  "/update-profile",
  authenticate,
  requireEmailVerification,
  updateProfile
);
router.get("/profile", authenticate, requireEmailVerification, getProfile);

export default router;
