import express from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Authentication routes
router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticate, getProfile);
router.put("/update-profile", authenticate, updateProfile);

export default router;
