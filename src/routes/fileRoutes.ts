import express from "express";
import { uploadFile, getUploadStats } from "../controllers/fileController";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

// File upload routes
router.post("/upload", authenticate, upload.single("file"), uploadFile);
router.get("/stats", authenticate, getUploadStats);

export default router;
