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
  console.error("AI Cluster Error:", error);
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

    // 1. Fetch all feedback text
    const feedbackList = db
      .prepare(
        `SELECT id, text_enjoy, text_broken 
         FROM feedback 
         WHERE build_id = ? 
           AND (text_enjoy IS NOT NULL OR text_broken IS NOT NULL)
           AND (text_enjoy != '' OR text_broken != '')`
      )
      .all(build.id) as Array<{ id: string; text_enjoy: string; text_broken: string }>;

    // 2. Minimum check
    if (feedbackList.length < 5) {
      return NextResponse.json({ error: "Not enough feedback to cluster (minimum 5)" }, { status: 400 });
    }

    // 3. Compute hash
    const inputHash = hashInput(feedbackList);

    // 4. Check cache
    if (!forceRegenerate) {
      const cached = db
        .prepare(
          `SELECT * FROM ai_cache 
           WHERE build_id = ? AND feature_type = 'cluster' AND input_hash = ? AND is_stale = 0
           LIMIT 1`
        )
        .get(build.id, inputHash) as any;

      if (cached) {
        try {
          return NextResponse.json({ data: JSON.parse(cached.output_text), cached: true });
        } catch (e) {
          // Fallback if cached data is corrupt
        }
      }
    }

    // 5. Prompt
    const systemPrompt = "Identify 3-6 distinct themes in this player feedback. Return JSON only.";
    const userContent = `Return JSON with this structure: { clusters: [{ name: string, emoji: string, feedback_ids: string[], sentiment: 'positive'|'negative'|'mixed' }] }
Feedback data: ${JSON.stringify(feedbackList)}`;

    // 6. Call AI
    const rawOutput = await callAI(systemPrompt, userContent);
    
    // Clean JSON output (sometimes models wrap in markdown)
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI returned invalid JSON format");
    }
    const clustersData = JSON.parse(jsonMatch[0]);

    // 7. Store in cache
    db.prepare(`
      INSERT INTO ai_cache (id, project_id, build_id, feature_type, input_hash, output_text, is_stale)
      VALUES (?, ?, ?, 'cluster', ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET 
        output_text = excluded.output_text,
        input_hash = excluded.input_hash,
        is_stale = 0,
        generated_at = datetime('now')
    `).run(uuidv4(), build.project_id, build.id, inputHash, JSON.stringify(clustersData));

    return NextResponse.json({ data: clustersData, cached: false });
  } catch (error) {
    return asErrorResponse(error);
  }
}
