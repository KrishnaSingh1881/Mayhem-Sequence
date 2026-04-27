import { NextResponse } from "next/server";
import { db, getProjectById, getBuildById, insertSessionDebrief } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import { callAI } from "@/lib/ai";
import { randomUUID } from "crypto";

type RouteContext = { params: { id: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer", "qa");

    const body = await request.json();
    const { build_id, session_start, session_end, session_label } = body;

    if (!build_id || !session_start || !session_end) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const project = getProjectById(params.id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const build = getBuildById(build_id);
    if (!build) return NextResponse.json({ error: "Build not found" }, { status: 404 });

    const feedbacks = db
      .prepare(
        `SELECT * FROM feedback
         WHERE build_id = ?
           AND datetime(created_at) BETWEEN datetime(?) AND datetime(?)`
      )
      .all(build_id, session_start, session_end) as any[];

    if (feedbacks.length < 3) {
      return NextResponse.json(
        { error: "Not enough feedback in this window (minimum 3)" },
        { status: 400 }
      );
    }

    const sentimentCounts = {
      positive: feedbacks.filter((f) => f.sentiment === "positive").length,
      neutral: feedbacks.filter((f) => f.sentiment === "neutral").length,
      negative: feedbacks.filter((f) => f.sentiment === "negative").length,
    };

    const categories: Record<string, number> = {};
    feedbacks.forEach((f) => {
      categories[f.category_tag] = (categories[f.category_tag] || 0) + 1;
    });

    const avgRating = feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length;
    const testerCount = new Set(feedbacks.map((f) => f.token_id || f.submitted_by)).size;
    const channelCount = new Set(feedbacks.map((f) => f.source)).size;

    const issues = db
      .prepare(
        `SELECT title, priority, status FROM issues
         WHERE build_id = ?
           AND datetime(created_at) BETWEEN datetime(?) AND datetime(?)
         LIMIT 3`
      )
      .all(build_id, session_start, session_end) as any[];

    const feedbackTexts = feedbacks
      .map((f) => `[${f.sentiment.toUpperCase()}] ${f.text_enjoy || ""} ${f.text_broken || ""}`)
      .join("\n");

    const systemPrompt =
      "You are a QA lead writing a post-playtest debrief for a game development team.";
    const userPrompt = `
Session: ${session_label || "Unnamed Session"}, Build: ${build.version_name}
Data:
- Feedback Count: ${feedbacks.length}
- Sentiment: Positive: ${sentimentCounts.positive}, Neutral: ${sentimentCounts.neutral}, Negative: ${sentimentCounts.negative}
- Categories: ${JSON.stringify(categories)}
- Avg Rating: ${avgRating.toFixed(1)}/5
- Issues: ${issues.map((i) => `${i.title} (${i.priority})`).join(", ") || "None"}

Feedback:
${feedbackTexts}

Write a structured debrief:
1. Session Overview
2. Top Complaints (max 4)
3. Top Praise (max 3)
4. Bugs Surfaced
5. Recommended Actions (max 3)
6. Overall Sentiment with one sentence reason
`;

    const outputText = await callAI(systemPrompt, userPrompt);

    const debriefId = randomUUID();
    insertSessionDebrief({
      id: debriefId,
      project_id: params.id,
      build_id,
      session_label: session_label || null,
      session_start,
      session_end,
      feedback_count: feedbacks.length,
      output_text: outputText,
      created_by: userId,
    });

    return NextResponse.json({
      id: debriefId,
      output_text: outputText,
      metadata: {
        feedback_count: feedbacks.length,
        tester_count: testerCount,
        channel_count: channelCount,
        sentiment: sentimentCounts,
        avg_rating: avgRating,
      },
    });
  } catch (error) {
    return asErrorResponse(error);
  }
}
