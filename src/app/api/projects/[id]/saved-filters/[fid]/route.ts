import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
    fid: string;
  };
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(context.params.id, userId, "admin", "developer", "qa", "player");

    const result = db
      .prepare("DELETE FROM saved_filters WHERE id = ? AND user_id = ? AND project_id = ?")
      .run(context.params.fid, userId, context.params.id);
    if (result.changes === 0) {
      return NextResponse.json({ error: "Saved filter not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
