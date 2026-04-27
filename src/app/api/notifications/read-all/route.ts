import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
