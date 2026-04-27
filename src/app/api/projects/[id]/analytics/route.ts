import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireRole(params.id, userId, "admin", "developer", "qa", "player");

    const sentimentTrends = db
      .prepare(
        `SELECT
          date(created_at) as date,
          SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) as positive,
          SUM(CASE WHEN sentiment='neutral' THEN 1 ELSE 0 END) as neutral,
          SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) as negative
         FROM feedback
         WHERE project_id = ? AND created_at >= date('now','-30 days')
         GROUP BY date(created_at) ORDER BY date ASC`
      )
      .all(params.id);

    const issueTrends = db
      .prepare(
        `SELECT
          date(created_at) as date,
          COUNT(*) as created,
          SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved
         FROM issues
         WHERE project_id = ? AND created_at >= date('now','-30 days')
         GROUP BY date(created_at) ORDER BY date ASC`
      )
      .all(params.id);

    const sentimentDist = db
      .prepare(`SELECT sentiment as name, COUNT(*) as value FROM feedback WHERE project_id = ? GROUP BY sentiment`)
      .all(params.id);

    const categoryDist = db
      .prepare(`SELECT category_tag as name, COUNT(*) as value FROM feedback WHERE project_id = ? GROUP BY category_tag`)
      .all(params.id);

    const buildPerformance = db
      .prepare(
        `SELECT b.version_name, AVG(f.rating) as avg_rating, COUNT(f.id) as feedback_count
         FROM builds b
         LEFT JOIN feedback f ON f.build_id = b.id
         WHERE b.project_id = ?
         GROUP BY b.id ORDER BY b.created_at ASC LIMIT 10`
      )
      .all(params.id);

    return NextResponse.json({ sentimentTrends, issueTrends, sentimentDist, categoryDist, buildPerformance });
  } catch (error) {
    return asErrorResponse(error);
  }
}
