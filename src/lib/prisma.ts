import { PrismaClient } from "@prisma/client";

// Prisma expects DATABASE_URL. Map from integration-provided vars so no manual env is needed.
if (!process.env.DATABASE_URL) {
  if (process.env.POSTGRES_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL; // Vercel Supabase integration
  } else if (process.env.SUPABASE_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL; // Netlify Supabase integration
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Reuse one client in serverless (Netlify) to avoid "too many connections"
globalForPrisma.prisma = prisma;
