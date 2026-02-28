import { PrismaClient } from "@prisma/client";

// Prisma expects DATABASE_URL. Map from integration-provided vars so no manual env is needed.
if (!process.env.DATABASE_URL) {
  const url =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URI_NON_POOLING ||
    process.env.SUPABASE_DATABASE_URL;
  if (url) process.env.DATABASE_URL = url;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Reuse one client in serverless to avoid "too many connections"
globalForPrisma.prisma = prisma;
