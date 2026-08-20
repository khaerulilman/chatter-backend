import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import routes from "./src/adapters/routes/index.js";
import redis from "./src/frameworks/redis/redis.js";
import { generalLimiter } from "./src/adapters/middleware/rate-limit.middleware.js";
const app = express();

// Trust Vercel/edge proxy so req.ip uses forwarded client IP correctly.
app.set("trust proxy", 1);

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views")); // Views folder path

// Middleware untuk parsing JSON
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// Security Helmet Middleware
app.use(helmet({ contentSecurityPolicy: false }));

// Daftar origin yang diizinkan
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://chatter-backends.vercel.app",
  "https://chatter-new.vercel.app",
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : defaultAllowedOrigins;

const isOriginAllowed = (origin) => {
  if (!origin) return true;

  // If env var is accidentally empty in deployment, fail open to avoid CORS lockout.
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.includes(origin);
};

// Konfigurasi CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Izinkan request tanpa origin (seperti mobile apps atau curl requests)
      if (!origin) return callback(null, true);

      // Cek apakah origin ada di daftar allowedOrigins
      if (!isOriginAllowed(origin)) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
        return callback(new Error(msg), false);
      }

      // Izinkan request
      return callback(null, true);
    },
    credentials: true, // Izinkan cookie dikirim cross-origin
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Metode HTTP yang diizinkan
    allowedHeaders: ["Content-Type", "Authorization"], // Header yang diizinkan
  }),
);

// API Routes
app.use("/api", generalLimiter, routes);

// Global error handling middleware
// Must be after all other middleware and routes
app.use((err, req, res, next) => {
  // Ensure CORS headers are sent even on error
  const origin = req.headers.origin;

  if (isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  console.error(`[${new Date().toISOString()}] Error:`, {
    statusCode,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    message,
    error: process.env.NODE_ENV === "development" ? err : undefined,
  });
});

// Handle 404 errors
app.use((req, res) => {
  const origin = req.headers.origin;

  if (isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  res.status(404).json({ message: "Route not found" });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  try {
    console.log("Shutting down gracefully...");
    server.close();
    if (redis.status === "ready") {
      await redis.quit();
      console.log("Redis disconnected");
    }
  } catch (error) {
    console.error("Error during shutdown:", error);
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
