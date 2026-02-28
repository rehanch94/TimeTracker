import { PrismaClient } from "@prisma/client";

// Netlify's Supabase integration sets SUPABASE_DATABASE_URL, not DATABASE_URL
if (!process.env.DATABASE_URL && process.env.SUPABASE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Reuse one client in serverless (Netlify) to avoid "too many connections"
globalForPrisma.prisma = prisma;
