import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const COOKIE_NAME = "tt_admin";

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) {
    // Local dev fallback; user should set ADMIN_SESSION_SECRET in .env for stability.
    return "dev-secret-change-me";
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function setAdminSession(userId: string) {
  const payload = userId;
  const value = `${payload}.${sign(payload)}`;
  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function clearAdminSession() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getAdminUser() {
  const v = cookies().get(COOKIE_NAME)?.value;
  if (!v) return null;
  const [userId, sig] = v.split(".");
  if (!userId || !sig) return null;
  if (sign(userId) !== sig) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, is_active: true },
  });
  if (!user) return null;
  if (!user.is_active) return null;
  if (user.role !== "ADMIN") return null;
  return user;
}

export async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return admin;
}

