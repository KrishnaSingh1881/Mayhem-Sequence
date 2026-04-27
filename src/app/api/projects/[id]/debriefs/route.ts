import { NextResponse } from "next/server";
import { getSessionDebriefsForProject } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer", "qa", "player");
    const debriefs = getSessionDebriefsForProject(params.id);
    return NextResponse.json(debriefs);
  } catch (error) {
    return asErrorResponse(error);
  }
}
