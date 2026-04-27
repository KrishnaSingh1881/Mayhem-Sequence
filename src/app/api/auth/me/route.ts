import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    const user = getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
