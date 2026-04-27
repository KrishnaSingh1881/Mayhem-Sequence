import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(context.params.id, userId, "admin", "developer", "qa");

    const url = new URL(request.url);
    const buildIds = url.searchParams.get("build_ids")?.split(",") || [];
    
    // If no build_ids provided, get the last 3 builds for comparison
    let targetBuilds;
    if (buildIds.length === 0) {
      targetBuilds = db.prepare(
        `SELECT id, version_name, created_at FROM builds 
         WHERE project_id = ? 
         ORDER BY created_at DESC 
         LIMIT 3`
      ).all(context.params.id) as any[];
    } else {
      const placeholders = buildIds.map(() => "?").join(",");
      targetBuilds = db.prepare(
        `SELECT id, version_name, created_at FROM builds 
         WHERE id IN (${placeholders})`
      ).all(...buildIds) as any[];
    }

    if (targetBuilds.length === 0) {
      return NextResponse.json([]);
    }

    // Buckets: 0-6h, 6-12h, 12-24h, 24-48h, 48-72h, 72h+
    const buckets = ["0-6h", "6-12h", "12-24h", "24-48h", "48-72h", "72h+"];
    const results = buckets.map(b => ({ bucket: b }));

    for (const build of targetBuilds) {
      const feedbacks = db.prepare(
        `SELECT created_at FROM feedback WHERE build_id = ?`
      ).all(build.id) as any[];

      const buildTime = new Date(build.created_at).getTime();
      const counts = {
        "0-6h": 0,
        "6-12h": 0,
        "12-24h": 0,
        "24-48h": 0,
        "48-72h": 0,
        "72h+": 0
      };

      feedbacks.forEach(f => {
        const feedbackTime = new Date(f.created_at).getTime();
        const diffHours = (feedbackTime - buildTime) / (1000 * 60 * 60);

        if (diffHours < 6) counts["0-6h"]++;
        else if (diffHours < 12) counts["6-12h"]++;
        else if (diffHours < 24) counts["12-24h"]++;
        else if (diffHours < 48) counts["24-48h"]++;
        else if (diffHours < 72) counts["48-72h"]++;
        else counts["72h+"]++;
      });

      // Add to results
      results[0][build.version_name] = counts["0-6h"];
      results[1][build.version_name] = counts["6-12h"];
      results[2][build.version_name] = counts["12-24h"];
      results[3][build.version_name] = counts["24-48h"];
      results[4][build.version_name] = counts["48-72h"];
      results[5][build.version_name] = counts["72h+"];
    }

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
