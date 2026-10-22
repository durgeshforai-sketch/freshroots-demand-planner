// Shared-password gate. NOT real authentication: one password for everyone, no user accounts.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "fr_session";
const MAX_AGE_S = 60 * 60 * 12; // 12 hours

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueToken(): { value: string; maxAge: number } {
  const secret = process.env.APP_PASSWORD!;
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE_S);
  return { value: `${exp}.${sign(exp, secret)}`, maxAge: MAX_AGE_S };
}

export function verifyToken(token: string | undefined): boolean {
  const secret = process.env.APP_PASSWORD;
  if (!secret || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp, secret));
  return a.length === b.length && timingSafeEqual(a, b);
}
