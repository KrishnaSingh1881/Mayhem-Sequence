import { NextResponse } from "next/server";
import { db, getBuildById } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import storage from "@/lib/storage";

type RouteContext = {
  params: {
    bid: string;
  };
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const build = getBuildById(context.params.bid);
    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    requireRole(build.project_id, userId, "admin", "developer", "qa", "player");

    const linkedIssues = db
      .prepare("SELECT * FROM issues WHERE build_id = ? ORDER BY created_at DESC")
      .all(context.params.bid);
    const feedbackSummary = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          COALESCE(AVG(rating), 0) AS avg_rating,
          SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) AS positive,
          SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) AS neutral,
          SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negative
         FROM feedback
         WHERE build_id = ?`
      )
      .get(context.params.bid);
    const promotionHistory = db
      .prepare(
        `SELECT * FROM promotion_logs
         WHERE build_id = ? OR previous_build_id = ?
         ORDER BY promoted_at DESC`
      )
      .all(context.params.bid, context.params.bid);
    const aiSummary = db
      .prepare(
        `SELECT *
         FROM ai_cache
         WHERE project_id = ?
           AND build_id = ?
           AND feature_type = 'summary'
         ORDER BY datetime(generated_at) DESC
         LIMIT 1`
      )
      .get(build.project_id, build.id);
    const aiCluster = db
      .prepare(
        `SELECT *
         FROM ai_cache
         WHERE project_id = ?
           AND build_id = ?
           AND feature_type = 'cluster'
         ORDER BY datetime(generated_at) DESC
         LIMIT 1`
      )
      .get(build.project_id, build.id);

    const regressionFlags = db
      .prepare("SELECT * FROM regression_flags WHERE build_id = ? AND dismissed = 0")
      .all(context.params.bid);

    return NextResponse.json({
      build,
      linked_issues: linkedIssues,
      feedback_summary: feedbackSummary,
      promotion_history: promotionHistory,
      ai_summary: aiSummary ?? null,
      ai_cluster: aiCluster ?? null,
      regression_flags: regressionFlags,
    });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const build = getBuildById(context.params.bid);
    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    requireRole(build.project_id, userId, "admin");

    db.transaction(() => {
      db.prepare("DELETE FROM builds WHERE id = ?").run(build.id);
    })();

    if (build.file_path) {
      await storage.delete(build.file_path).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
