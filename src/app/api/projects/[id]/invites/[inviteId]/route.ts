import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = { params: { id: string; inviteId: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireRole(params.id, userId, "admin");

    db.prepare(`DELETE FROM project_invites WHERE id = ? AND project_id = ?`).run(
      params.inviteId,
      params.id
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
