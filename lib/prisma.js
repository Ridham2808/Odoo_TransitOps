// lib/prisma.js
// Singleton PrismaClient — guards against multiple instances in dev hot reload

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
