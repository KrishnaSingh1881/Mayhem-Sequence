import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";

type RouteContext = { params: { sfid: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(req);

    const filter = db
      .prepare(`SELECT user_id FROM saved_filters WHERE id = ?`)
      .get(params.sfid) as { user_id: string } | undefined;

    if (!filter) return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    if (filter.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    db.prepare(`DELETE FROM saved_filters WHERE id = ?`).run(params.sfid);
    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
