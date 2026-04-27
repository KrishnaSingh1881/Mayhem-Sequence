import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { hashPassword, signToken } from "@/lib/auth";
import { getUserByEmail, insertUser } from "@/lib/db";

type RegisterBody = {
  email?: string;
  name?: string;
  password?: string;
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const password = body.password ?? "";

  if (!email || !name || password.length < 8) {
    return NextResponse.json(
      { error: "Email, name, and password (min 8 chars) are required" },
      { status: 400 }
    );
  }

  const existing = getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);
  insertUser({
    id: userId,
    email,
    name,
    password_hash: passwordHash,
  });

  const token = await signToken(userId);
  const response = NextResponse.json({
    user: { id: userId, name, email },
  });
  response.cookies.set("ms_token", token, COOKIE_OPTIONS);
  return response;
}
