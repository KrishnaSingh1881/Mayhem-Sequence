import { NextResponse } from "next/server";
import { getLeaderboardStats, getProjectById } from "@/lib/db";
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

    const project = getProjectById(params.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const stats = getLeaderboardStats(params.id);

    const leaderboard = stats
      .map((s) => ({
        ...s,
        score:
          s.issues_filed * 3 +
          s.issues_resolved * 5 +
          s.feedback_submitted * 2 +
          s.comments_made * 1,
      }))
      .sort((a, b) => b.score - a.score);

    return NextResponse.json(leaderboard);
  } catch (error) {
    return asErrorResponse(error);
  }
}
