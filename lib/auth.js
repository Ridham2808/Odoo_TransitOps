// lib/auth.js
// Authentication utilities: password hashing and JWT signing/verification

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

if (!JWT_SECRET && process.env.NODE_ENV !== "test") {
  console.warn("[auth] WARNING: JWT_SECRET is not set. Set it in .env");
}

// ── Password utilities ──────────────────────────────────────────────────────

/**
 * Hash a plaintext password with bcrypt (cost factor 12).
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ── JWT utilities ───────────────────────────────────────────────────────────

/**
 * Sign a JWT token containing the user's id, email, name, and role.
 * @param {{ id: string, email: string, name: string, role: string }} payload
 * @returns {string} signed JWT
 */
export function signToken(payload) {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @returns {{ sub: string, email: string, name: string, role: string } | null}
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie string.
 * @param {string | null} authHeader
 * @param {string | null} cookieHeader
 * @returns {string | null}
 */
export function extractToken(authHeader, cookieHeader) {
  // Bearer token in Authorization header
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Cookie: token=xxx
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}
