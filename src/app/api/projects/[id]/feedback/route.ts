import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitFeedback } from "@/lib/feedback";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

type InternalFeedbackBody = {
  build_id?: string;
  rating?: number;
  text_enjoy?: string;
  text_broken?: string;
  category_tag?: string;
  platform_played?: string;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer", "qa", "player");

    const body = (await request.json()) as InternalFeedbackBody;
    const rating = Number(body.rating);
    const buildId = body.build_id;
    const categoryTag = body.category_tag?.trim();

    if (!buildId || !Number.isFinite(rating) || rating < 1 || rating > 5 || !categoryTag) {
      return NextResponse.json(
        { error: "build_id, rating (1-5), and category_tag are required" },
        { status: 400 }
      );
    }

    const build = db
      .prepare("SELECT id FROM builds WHERE id = ? AND project_id = ?")
      .get(buildId, params.id);
    if (!build) {
      return NextResponse.json({ error: "Build not found for project" }, { status: 404 });
    }

    submitFeedback({
      projectId: params.id,
      buildId,
      tokenId: null,
      submittedBy: userId,
      rating,
      textEnjoy: body.text_enjoy?.trim() || null,
      textBroken: body.text_broken?.trim() || null,
      categoryTag,
      platformPlayed: body.platform_played?.trim() || null,
      source: "internal",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer", "qa", "player");

    const url = new URL(request.url);
    const sentiment = url.searchParams.get("sentiment");
    const category = url.searchParams.get("category");
    const ratingMin = url.searchParams.get("rating_min");
    const ratingMax = url.searchParams.get("rating_max");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const source = url.searchParams.get("source");
    const buildId = url.searchParams.get("build_id");
    const tokenId = url.searchParams.get("token_id");
    const q = url.searchParams.get("q");
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const where: string[] = ["project_id = @project_id"];
    const queryParams: Record<string, unknown> = { project_id: params.id, limit, offset };

    if (q) {
      where.push("(text_enjoy LIKE @q OR text_broken LIKE @q)");
      queryParams.q = `%${q}%`;
    }
    if (sentiment) { where.push("sentiment = @sentiment"); queryParams.sentiment = sentiment; }
    if (category) { where.push("category_tag = @category_tag"); queryParams.category_tag = category; }
    if (ratingMin) { where.push("rating >= @rating_min"); queryParams.rating_min = Number(ratingMin); }
    if (ratingMax) { where.push("rating <= @rating_max"); queryParams.rating_max = Number(ratingMax); }
    if (dateFrom) {
      const daysAgoMatch = /^(\d+)daysago$/i.exec(dateFrom);
      if (daysAgoMatch) {
        where.push(`datetime(created_at) >= datetime('now', '-${Number(daysAgoMatch[1])} days')`);
      } else {
        where.push("datetime(created_at) >= datetime(@date_from)");
        queryParams.date_from = dateFrom;
      }
    }
    if (dateTo) { where.push("datetime(created_at) <= datetime(@date_to)"); queryParams.date_to = dateTo; }
    if (source) { where.push("source = @source"); queryParams.source = source; }
    if (buildId) { where.push("build_id = @build_id"); queryParams.build_id = buildId; }
    if (tokenId) { where.push("token_id = @token_id"); queryParams.token_id = tokenId; }

    const whereSql = where.join(" AND ");

    const data = db
      .prepare(
        `SELECT * FROM feedback WHERE ${whereSql} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`
      )
      .all(queryParams);

    const total = (
      db.prepare(`SELECT COUNT(*) as count FROM feedback WHERE ${whereSql}`).get(queryParams) as {
        count: number;
      }
    ).count;

    const sentimentCounts = db
      .prepare(
        `SELECT
          SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) AS positive,
          SUM(CASE WHEN sentiment='neutral' THEN 1 ELSE 0 END) AS neutral,
          SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) AS negative
         FROM feedback WHERE project_id = ?`
      )
      .get(params.id) as { positive: number | null; neutral: number | null; negative: number | null };

    return NextResponse.json({
      data,
      total,
      page,
      sentiment_counts: {
        positive: sentimentCounts.positive ?? 0,
        neutral: sentimentCounts.neutral ?? 0,
        negative: sentimentCounts.negative ?? 0,
      },
    });
  } catch (error) {
    return asErrorResponse(error);
  }
}
