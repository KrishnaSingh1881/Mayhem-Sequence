import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`)
      .get(userId) as { count: number };
    return NextResponse.json({ unread_count: row.count });
  } catch (error) {
    return asErrorResponse(error);
  }
}
