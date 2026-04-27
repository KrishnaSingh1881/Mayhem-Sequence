import { NextResponse } from "next/server";
import { db, getBuildById } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import { callAI } from "@/lib/ai";

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("AI Compare Error:", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
}

async function getBuildSummaryData(buildId: string) {
  const build = getBuildById(buildId);
  if (!build) return null;

  const resolvedIssues = db
    .prepare("SELECT title FROM issues WHERE build_id = ? AND status = 'resolved'")
    .all(build.id);
  const openIssues = db
    .prepare("SELECT title FROM issues WHERE build_id = ? AND status != 'resolved'")
    .all(build.id);
  const feedback = db
    .prepare(
      `SELECT 
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) AS positive,
        SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) AS neutral,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negative
       FROM feedback WHERE build_id = ?`
    )
    .get(build.id) as { positive: number; neutral: number; negative: number };

  return {
    version: build.version_name,
    notes: build.notes,
    resolvedIssues,
    openIssues,
    feedback,
  };
}

export async function POST(request: Request) {
  try {
    const { build_id_a, build_id_b } = await request.json();
    if (!build_id_a || !build_id_b) {
      return NextResponse.json({ error: "build_id_a and build_id_b are required" }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(request);
    const buildA = getBuildById(build_id_a);
    const buildB = getBuildById(build_id_b);

    if (!buildA || !buildB) {
      return NextResponse.json({ error: "One or both builds not found" }, { status: 404 });
    }

    // Checking project_id for first build (they should be in same project for comparison usually)
    requireRole(buildA.project_id, userId, "admin", "developer");
    if (buildB.project_id !== buildA.project_id) {
       requireRole(buildB.project_id, userId, "admin", "developer");
    }

    const dataA = await getBuildSummaryData(build_id_a);
    const dataB = await getBuildSummaryData(build_id_b);

    const systemPrompt = "Compare these two game builds in one paragraph. Focus on: issue resolution, sentiment change, and notable regressions or improvements.";
    const userContent = `Build A: ${JSON.stringify(dataA)}
Build B: ${JSON.stringify(dataB)}`;

    const comparisonText = await callAI(systemPrompt, userContent);

    return NextResponse.json({ data: comparisonText });
  } catch (error) {
    return asErrorResponse(error);
  }
}
