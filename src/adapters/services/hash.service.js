import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// Hash nilai teks biasa (misal password).
export const hash = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

// Bandingkan teks biasa dengan hash-nya.
export const compare = (plain, hashed) => bcrypt.compare(plain, hashed);
