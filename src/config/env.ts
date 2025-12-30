import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || "",
  corsOrigin: process.env.CORS_ORIGIN || "",
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://mediexplain.ai",
      ],
  nodeEnv: process.env.NODE_ENV || "development",
  // Upload Configuration
  upload: {
    limit: parseInt(process.env.UPLOAD_LIMIT || "10"),
  },
  // JWT Configuration
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      "access-secret-key",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret-key",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    // Legacy support
    secret: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    from: process.env.EMAIL_FROM || "neatnode09@gmail.com",
    verificationExpiry: parseInt(process.env.VERIFICATION_EXPIRY || "86400000"), // 24 hours in milliseconds
  },
} as const;
