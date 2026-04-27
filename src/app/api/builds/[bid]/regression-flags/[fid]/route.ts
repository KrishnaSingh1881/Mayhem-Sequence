import { NextResponse } from "next/server";
import { db, getBuildById } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    bid: string;
    fid: string;
  };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const build = getBuildById(context.params.bid);
    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    requireRole(build.project_id, userId, "admin", "developer");

    const body = await request.json();
    const dismissed = body.dismissed === true ? 1 : 0;

    const result = db.prepare(`
      UPDATE regression_flags 
      SET dismissed = ? 
      WHERE id = ? AND build_id = ?
    `).run(dismissed, context.params.fid, context.params.bid);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
