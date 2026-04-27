import { NextResponse } from "next/server";
import { db, getBuildById, getAICache, insertAICache, markAICacheStale } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

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

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const build = getBuildById(context.params.bid);
    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    requireRole(build.project_id, userId, "admin", "developer");

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // 1. Gather Data
    const openIssues = db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM issues 
      WHERE build_id = ? AND status != 'resolved' 
      GROUP BY priority
    `).all(context.params.bid) as { priority: string; count: number }[];

    const regressionFlags = db.prepare(`
      SELECT COUNT(*) as count 
      FROM regression_flags 
      WHERE build_id = ? AND dismissed = 0
    `).get(context.params.bid) as { count: number };

    const sentimentData = db.prepare(`
      SELECT sentiment, COUNT(*) as count 
      FROM feedback 
      WHERE build_id = ? 
      GROUP BY sentiment
    `).all(context.params.bid) as { sentiment: string; count: number }[];

    const resolvedCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM issues 
      WHERE build_id = ? AND status = 'resolved'
    `).get(context.params.bid) as { count: number };

    const previousMainBuild = db.prepare(`
      SELECT b.* 
      FROM builds b
      JOIN promotion_logs l ON l.build_id = b.id
      WHERE b.project_id = ? AND l.to_label = 'main' AND b.id != ?
      ORDER BY b.created_at DESC
      LIMIT 1
    `).get(build.project_id, build.id) as any;

    const daysInTesting = Math.max(0, Math.floor((Date.now() - new Date(build.created_at).getTime()) / (1000 * 60 * 60 * 24)));

    const counts: Record<string, number> = { blocker: 0, critical: 0, high: 0, medium: 0, low: 0 };
    openIssues.forEach(i => counts[i.priority] = i.count);

    const sCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    sentimentData.forEach(s => sCounts[s.sentiment] = s.count);
    const totalFeedback = sCounts.positive + sCounts.neutral + sCounts.negative;
    const negativeRatio = totalFeedback > 0 ? sCounts.negative / totalFeedback : 0;

    // 2. Compute Base Confidence Score
    let score = 100;
    score -= (counts.blocker * 25);
    score -= (counts.critical * 15);
    score -= (counts.high * 8);
    score -= (negativeRatio * 30);
    score -= (regressionFlags.count * 10);
    score += Math.min(20, resolvedCount.count * 5);
    score = Math.max(0, Math.min(100, score));

    const reportData = {
      open_issues: counts,
      regression_flags: regressionFlags.count,
      feedback_sentiment: sCounts,
      negative_ratio: negativeRatio,
      resolved_count: resolvedCount.count,
      previous_main_build: previousMainBuild?.version_name || "None",
      days_in_testing: daysInTesting,
      computed_score: score
    };

    const inputHash = require("crypto").createHash("md5").update(JSON.stringify(reportData)).digest("hex");

    let report: any;

    if (!force) {
      const cached = getAICache(build.project_id, context.params.bid, "readiness_report", inputHash);
      if (cached && !cached.is_stale) {
        report = JSON.parse(cached.output_text);
      }
    }

    if (!report) {
      // 3. Call Gemma
      const prompt = `You are a QA lead reviewing a game build for release.
Build data: ${JSON.stringify(reportData, null, 2)}.
Write a release readiness report with these sections:
1. GO / NO-GO recommendation (one word + one sentence reason)
2. Critical blockers (bullet list, only if score < 60)
3. Risks to monitor (bullet list)
4. What went well (bullet list)
5. Recommended next steps (bullet list, max 3)
Keep it concise, developer-focused, no fluff.
Return JSON ONLY in this format:
{
  "recommendation": { "decision": "GO" | "NO-GO", "reason": "string" },
  "blockers": ["string"],
  "risks": ["string"],
  "wins": ["string"],
  "next_steps": ["string"]
}`;

      const aiRes = await fetch(process.env.GEMMA_API_URL || "http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GEMMA_MODEL || "gemma2",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          format: "json"
        }),
      });

      if (!aiRes.ok) throw new Error("AI call failed");
      const aiData = await aiRes.json();
      report = JSON.parse(aiData.message.content);

      // 4. Cache
      insertAICache({
        id: `cache_${require("crypto").randomUUID()}`,
        project_id: build.project_id,
        build_id: build.id,
        feature_type: "readiness_report",
        input_hash: inputHash,
        output_text: JSON.stringify(report),
        is_stale: 0
      });
    }

    const regressionFlagsList = db.prepare(`
      SELECT * 
      FROM regression_flags 
      WHERE build_id = ? AND dismissed = 0
    `).all(context.params.bid) as any[];

    // 5. Final Response Structure
    const confidence = score >= 80 ? "high" : score >= 50 ? "medium" : "low";

    return NextResponse.json({
      score,
      confidence,
      report: {
        recommendation: report.recommendation.decision,
        reason: report.recommendation.reason,
        blockers: report.blockers,
        risks: report.risks,
        wins: report.wins,
        next_steps: report.next_steps,
      },
      regression_flags: regressionFlagsList,
      resolved_count: resolvedCount.count,
    });
  } catch (error) {
    console.error("Readiness Report Error:", error);
    return asErrorResponse(error);
  }
}
