import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * The client portal has its own session cookie and its own user table.
 * Agency staff and client contacts can never be mistaken for one another,
 * which matters because the portal exposes invoices and approvals.
 */
const COOKIE = "sahab_portal";
const MAX_AGE = 60 * 60 * 12;

export type PortalSession = {
  id: string;
  name: string;
  email: string;
  clientId: string;
  clientName: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function createPortalSession(session: PortalSession) {
  const token = await new SignJWT({ ...session })
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

export async function destroyPortalSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      clientId: String(payload.clientId),
      clientName: String(payload.clientName),
    };
  } catch {
    return null;
  }
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function authenticatePortalUser(email: string, password: string) {
  const user = await prisma.clientPortalUser.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!user || !user.isActive) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  await prisma.clientPortalUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    clientId: user.client.id,
    clientName: user.client.name,
  } satisfies PortalSession;
}
