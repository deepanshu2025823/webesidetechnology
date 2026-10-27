import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

/**
 * Password reset links and one-time sign-in codes for the admin panel.
 *
 * Both are stateless — signed tokens rather than rows — so neither needs a
 * table. Each purpose signs with its own derived key, which means a reset
 * token can never be replayed as a session cookie or the other way round.
 */

const RESET_TTL = 30 * 60; // 30 minutes
const OTP_TTL = 10 * 60; // 10 minutes
export const OTP_COOKIE = "sahab_admin_otp";

function rawSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

function keyFor(purpose: "reset" | "otp") {
  return new TextEncoder().encode(`${rawSecret()}:${purpose}`);
}

function hmac(value: string) {
  return createHmac("sha256", rawSecret()).update(value).digest("hex");
}

function sameHex(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function findActiveUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  return user?.isActive ? user : null;
}

// ---------------------------------------------------------------- reset

/**
 * A link that works once.
 *
 * The token carries a fingerprint of the password hash it was issued against.
 * Setting a new password changes the hash, so the same link stops verifying
 * the moment it has been used — and so does every older link.
 */
export async function createResetToken(user: { id: string; passwordHash: string }) {
  return new SignJWT({ fp: hmac(user.passwordHash).slice(0, 32) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${RESET_TTL}s`)
    .sign(keyFor("reset"));
}

/** The user the link was issued to, or null if it is expired, used or tampered with. */
export async function verifyResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, keyFor("reset"));
    if (!payload.sub || typeof payload.fp !== "string") return null;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.isActive) return null;
    if (!sameHex(hmac(user.passwordHash).slice(0, 32), payload.fp)) return null;
    return user;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ otp

/**
 * Issues a six-digit code and remembers it in an httpOnly cookie.
 *
 * Only an HMAC of the code goes into the cookie: a JWT's payload is readable,
 * and a bare hash of a six-digit number is a million guesses from reversed.
 */
export async function issueOtp(user: { id: string; email: string }) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  const token = await new SignJWT({ email: user.email, h: hmac(`${user.id}:${code}`) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL}s`)
    .sign(keyFor("otp"));

  const store = await cookies();
  store.set(OTP_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: OTP_TTL,
  });

  return { code, minutes: OTP_TTL / 60 };
}

/** The pending sign-in, if a code has been sent and has not expired. */
export async function pendingOtp() {
  const store = await cookies();
  const token = store.get(OTP_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, keyFor("otp"));
    if (!payload.sub || typeof payload.h !== "string") return null;
    return { userId: payload.sub, email: String(payload.email ?? ""), hash: payload.h };
  } catch {
    return null;
  }
}

export function otpMatches(pending: { userId: string; hash: string }, code: string) {
  return sameHex(hmac(`${pending.userId}:${code}`), pending.hash);
}

export async function clearOtp() {
  const store = await cookies();
  store.delete({ name: OTP_COOKIE, path: "/admin" });
}
