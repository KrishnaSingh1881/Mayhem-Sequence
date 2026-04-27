import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await getUserIdFromRequest(request);
    db.prepare(`UPDATE alerts SET is_read = 1 WHERE project_id = ?`).run(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
