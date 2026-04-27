import { NextResponse } from "next/server";
import { dismissRegressionFlag, db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);

    const flag = db
      .prepare("SELECT project_id FROM regression_flags WHERE id = ?")
      .get(params.id) as { project_id: string } | undefined;

    if (!flag) {
      return NextResponse.json({ error: "Regression flag not found" }, { status: 404 });
    }

    requireRole(flag.project_id, userId, "admin", "developer", "qa");
    dismissRegressionFlag(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
