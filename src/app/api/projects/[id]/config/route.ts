import { NextResponse } from "next/server";
import { getOrCreateProjectConfig, updateProjectConfig } from "@/lib/db";
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

    const config = getOrCreateProjectConfig(params.id);
    return NextResponse.json({ config });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin");

    const body = await request.json();
    const { show_leaderboard, negative_feedback_threshold, bug_volume_threshold, feedback_stale_days } = body;

    const updates: Record<string, unknown> = {};
    if (show_leaderboard !== undefined) updates.show_leaderboard = show_leaderboard ? 1 : 0;
    if (negative_feedback_threshold !== undefined) updates.negative_feedback_threshold = negative_feedback_threshold;
    if (bug_volume_threshold !== undefined) updates.bug_volume_threshold = bug_volume_threshold;
    if (feedback_stale_days !== undefined) updates.feedback_stale_days = feedback_stale_days;

    updateProjectConfig(params.id, updates as any);
    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
