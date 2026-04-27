import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { aid: string } }
) {
  try {
    await getUserIdFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    db.prepare(`UPDATE alerts SET is_read = 1 WHERE id = ?`).run(params.aid);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to mark alert as read" }, { status: 500 });
  }
}
