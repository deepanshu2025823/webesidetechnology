import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { can, canView, isOwnScoped, type Access, type ModuleKey } from "@/lib/permissions";

const COOKIE = "webeside_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Reads the signed cookie. Returns null when absent, expired or tampered with. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/** Session guard for admin server components and actions. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}

/**
 * Module guard for admin pages and server actions. Throws FORBIDDEN, which the
 * admin error boundary turns into a "no access" screen.
 */
export async function requirePermission(module: ModuleKey, level: Access = "read"): Promise<SessionUser> {
  const session = await requireSession();
  if (!can(session.role, module, level)) throw new Error("FORBIDDEN");
  return session;
}

/** Page guard that also allows roles limited to their own records. */
export async function requireModule(module: ModuleKey): Promise<SessionUser> {
  const session = await requireSession();
  if (!canView(session.role, module)) throw new Error("FORBIDDEN");
  return session;
}

/** True when this user should only see records assigned to them. */
export async function scopedToOwn(module: ModuleKey): Promise<boolean> {
  const session = await requireSession();
  return isOwnScoped(session.role, module);
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.isActive) return null;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, name: user.name, email: user.email, role: user.role } satisfies SessionUser;
}

export async function logActivity(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  summary?: string,
) {
  await prisma.activityLog.create({
    data: { userId, action, entity, entityId, summary: summary?.slice(0, 400) },
  });
}
