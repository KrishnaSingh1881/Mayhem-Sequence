import { NextResponse } from "next/server";
import { db, getBuildById } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import { callAI } from "@/lib/ai";

type RouteContext = {
  params: {
    bid: string;
  };
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("AI Changelog Error:", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const build = getBuildById(context.params.bid);
    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    requireRole(build.project_id, userId, "admin", "developer");

    // 1. Fetch resolved issues, notes, and clustered themes
    const resolvedIssues = db
      .prepare("SELECT title, priority FROM issues WHERE build_id = ? AND status = 'resolved'")
      .all(build.id);
    
    const cachedCluster = db
      .prepare(`SELECT output_text FROM ai_cache WHERE build_id = ? AND feature_type = 'cluster' ORDER BY generated_at DESC LIMIT 1`)
      .get(build.id) as { output_text: string } | undefined;
    
    const clusterThemes = cachedCluster ? JSON.parse(cachedCluster.output_text) : [];

    // 2. Prompt
    const systemPrompt = "Generate player-facing release notes for this game build. Use friendly language, avoid technical jargon. Return JSON only.";
    const userContent = `Structure as JSON: { bugFixes: string[], improvements: string[], features: string[] }
Source data:
resolved issues: ${JSON.stringify(resolvedIssues)}
notes: ${build.notes || "No notes"}
player feedback themes: ${JSON.stringify(clusterThemes)}`;

    // 3. Call AI
    const rawOutput = await callAI(systemPrompt, userContent);
    
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI returned invalid JSON format");
    }
    const changelogData = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ data: changelogData });
  } catch (error) {
    return asErrorResponse(error);
  }
}
