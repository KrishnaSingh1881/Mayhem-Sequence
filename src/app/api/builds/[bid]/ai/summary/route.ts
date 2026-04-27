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
  console.error("AI Route Error:", error);
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

    // 1. Fetch data for input hash
    const resolvedIssues = db
      .prepare("SELECT title, priority FROM issues WHERE build_id = ? AND status = 'resolved'")
      .all(build.id);
    const openIssues = db
      .prepare("SELECT title, priority FROM issues WHERE build_id = ? AND status != 'resolved'")
      .all(build.id);
    const feedbackSentiment = db
      .prepare(
        `SELECT 
          SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) AS positive,
          SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) AS neutral,
          SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negative
         FROM feedback WHERE build_id = ?`
      )
      .get(build.id) as { positive: number; neutral: number; negative: number };

    const promptData = {
      version: build.version_name,
      notes: build.notes,
      resolved_issues: resolvedIssues,
      open_issues: openIssues,
      feedback: feedbackSentiment,
    };

    // 2. Compute inputHash
    const inputHash = hashInput(promptData);

    // 3. Check cache
    if (!forceRegenerate) {
      const cached = db
        .prepare(
          `SELECT * FROM ai_cache 
           WHERE build_id = ? AND feature_type = 'summary' AND input_hash = ? AND is_stale = 0
           LIMIT 1`
        )
        .get(build.id, inputHash) as any;

      if (cached) {
        return NextResponse.json({ data: cached.output_text, cached: true });
      }
    }

    // 4. Build prompt
    const systemPrompt = "You are a game development assistant. Summarize this build in 2-4 plain English sentences for a developer audience.";
    const userContent = `Data: ${JSON.stringify(promptData)}
Be specific about what improved, what's still broken, and overall player sentiment.`;

    // 5. Call AI
    const outputText = await callAI(systemPrompt, userContent);

    // Store in cache
    db.prepare(`
      INSERT INTO ai_cache (id, project_id, build_id, feature_type, input_hash, output_text, is_stale)
      VALUES (?, ?, ?, 'summary', ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET 
        output_text = excluded.output_text,
        input_hash = excluded.input_hash,
        is_stale = 0,
        generated_at = datetime('now')
    `).run(uuidv4(), build.project_id, build.id, inputHash, outputText);

    return NextResponse.json({ data: outputText, cached: false });
  } catch (error) {
    return asErrorResponse(error);
  }
}
