import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
    tid: string;
  };
};

type TokenPatchBody = {
  is_active?: boolean;
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
    requireRole(context.params.id, userId, "admin", "developer");
    const body = (await request.json()) as TokenPatchBody;
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be boolean" }, { status: 400 });
    }

    const result = db
      .prepare("UPDATE feedback_tokens SET is_active = ? WHERE id = ? AND project_id = ?")
      .run(body.is_active ? 1 : 0, context.params.tid, context.params.id);
    if (result.changes === 0) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const token = db
      .prepare("SELECT * FROM feedback_tokens WHERE id = ?")
      .get(context.params.tid);
    return NextResponse.json({ token });
  } catch (error) {
    return asErrorResponse(error);
  }
}
