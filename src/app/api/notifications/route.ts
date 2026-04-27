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
    const notifications = db
      .prepare(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
      )
      .all(userId);
    return NextResponse.json({ data: notifications });
  } catch (error) {
    return asErrorResponse(error);
  }
}
