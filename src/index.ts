import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import { config } from "./config/env";

dotenv.config();

const app = express();
app.disable("x-powered-by");
app.use(morgan("dev"));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "MediExplain_api",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: config.nodeEnv,
    database: "connected",
    features: {
      authentication: "active",
      emailService: "active",
    },
  });
});

app.use("/api/auth", authRoutes);

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
    });
  }
);

app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    const errorDetails =
      config.nodeEnv === "production"
        ? { message: "Internal Server Error" }
        : { message: err.message, stack: err.stack };

    console.error(
      `[${new Date().toISOString()}] Server error occurred:`,
      err.message,
      statusCode
    );

    res.status(statusCode).json({
      error: "Server Error",
      ...errorDetails,
    });
  }
);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`MediExplain_api running on http://localhost:${PORT}`);
  });
}

export default app;
