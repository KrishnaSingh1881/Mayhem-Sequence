import { NextResponse } from "next/server";
import { db, getBuildById } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    bid: string;
  };
};

type NotesBody = {
  notes?: string | null;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const build = getBuildById(context.params.bid);
    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    requireRole(build.project_id, userId, "admin", "developer");
    const body = (await request.json()) as NotesBody;
    db.prepare("UPDATE builds SET notes = ? WHERE id = ?").run(body.notes ?? null, build.id);
    const updated = getBuildById(build.id);
    return NextResponse.json({ build: updated });
  } catch (error) {
    return asErrorResponse(error);
  }
}
