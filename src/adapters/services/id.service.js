import { nanoid } from "nanoid";
import crypto from "crypto";

// Generate unique ID dengan nanoid (default 21 karakter).
export const generateId = (size = 21) => nanoid(size);

// Generate UUID v4 secara acak.
export const generateUUID = () => crypto.randomUUID();

// Generate kode OTP numerik.
export const generateOtp = (min = 100000, max = 999999) =>
  crypto.randomInt(min, max);
