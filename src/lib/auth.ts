import * as jose from "jose";

const JWT_EXPIRY = "7d";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    return "dev-secret-change-me";
  }
  return secret;
}

export function logToFile(msg: string) {
  // Edge-compatible logging
  console.log(`[AUTH-LOG] ${msg}`);
}

type AuthPayload = {
  userId: string;
  id: string;
};

const secretKey = new TextEncoder().encode(getSecret());

export async function signToken(userId: string): Promise<string> {
  return new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    if (!payload || typeof payload.userId !== "string") {
      console.warn(`[AUTH] Token verification failed: Invalid payload structure`);
      return null;
    }
    console.log(`[AUTH] Token verified for user: ${payload.userId}`);
    return { userId: payload.userId, id: payload.userId };
  } catch (error) {
    console.error(`[AUTH] Token verification error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}
