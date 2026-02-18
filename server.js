import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./routes/index.js";

dotenv.config();
const app = express();

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views")); // Views folder path

// Middleware untuk parsing JSON
app.use(express.json());

// Daftar origin yang diizinkan
const allowedOrigins = [
  "http://localhost:5173", // Untuk development lokal
  "https://chatter-new.vercel.app", // Untuk production di Vercel
];

// Konfigurasi CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Izinkan request tanpa origin (seperti mobile apps atau curl requests)
      if (!origin) return callback(null, true);

      // Cek apakah origin ada di daftar allowedOrigins
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
        return callback(new Error(msg), false);
      }

      // Izinkan request
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Metode HTTP yang diizinkan
    allowedHeaders: ["Content-Type", "Authorization"], // Header yang diizinkan
  }),
);

// API Routes
app.use("/api", routes);

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
