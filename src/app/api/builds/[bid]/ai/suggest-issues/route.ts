import { NextResponse } from "next/server";
import { db, getBuildById } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import { callAI, hashInput } from "@/lib/ai";
import { v4 as uuidv4 } from "uuid";

type RouteContext = {
  params: {
    bid: string;
  };
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("AI Suggest Issues Error:", error);
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

    const searchParams = new URL(request.url).searchParams;
    const forceRegenerate = searchParams.get("regenerate") === "true";

    // 1. Fetch clusters from ai_cache
    const clusterCache = db.prepare(`
      SELECT output_text FROM ai_cache 
      WHERE build_id = ? AND feature_type = 'cluster' AND is_stale = 0
      ORDER BY generated_at DESC LIMIT 1
    `).get(build.id) as { output_text: string } | undefined;

    if (!clusterCache) {
      return NextResponse.json({ error: "Clustering must be performed before suggesting issues." }, { status: 400 });
    }

    const clusters = JSON.parse(clusterCache.output_text).clusters;

    // 2. Fetch existing open issues titles
    const openIssues = db.prepare(`
      SELECT title FROM issues 
      WHERE project_id = ? AND status != 'closed'
    `).all(build.project_id) as Array<{ title: string }>;

    const existingTitles = openIssues.map(i => i.title);

    // 3. Compute hash for suggest_issues
    const inputHash = hashInput({ clusters, existingTitles });

    // 4. Check cache
    if (!forceRegenerate) {
      const cached = db
        .prepare(
          `SELECT * FROM ai_cache 
           WHERE build_id = ? AND feature_type = 'suggest_issues' AND input_hash = ? AND is_stale = 0
           LIMIT 1`
        )
        .get(build.id, inputHash) as any;

      if (cached) {
        try {
          return NextResponse.json({ data: JSON.parse(cached.output_text), cached: true });
        } catch (e) {
          // Fallback
        }
      }
    }

    // 5. Prompt
    const systemPrompt = `Based on these player feedback clusters, suggest bug/issue entries for a game dev tracker. 
Avoid duplicating existing issues listed.
Return JSON only:
{ suggestions: [{ title: string, description: string, priority: 'blocker'|'critical'|'high'|'medium'|'low', category_tag: string, platform_tag: string }] }
Max 5 suggestions. Be specific, use developer language not player language.`;

    const userContent = JSON.stringify({
      clusters,
      existing_open_issues: existingTitles
    });

    // 6. Call AI
    const rawOutput = await callAI(systemPrompt, userContent);
    
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI returned invalid JSON format");
    }
    const suggestionsData = JSON.parse(jsonMatch[0]);

    // 7. Store in cache
    // We'll mark previous suggest_issues as stale for this build
    db.prepare(`UPDATE ai_cache SET is_stale = 1 WHERE build_id = ? AND feature_type = 'suggest_issues'`).run(build.id);

    db.prepare(`
      INSERT INTO ai_cache (id, project_id, build_id, feature_type, input_hash, output_text, is_stale)
      VALUES (?, ?, ?, 'suggest_issues', ?, ?, 0)
    `).run(uuidv4(), build.project_id, build.id, inputHash, JSON.stringify(suggestionsData));

    return NextResponse.json({ data: suggestionsData, cached: false });
  } catch (error) {
    return asErrorResponse(error);
  }
}
