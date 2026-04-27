import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db, getOrCreateProjectConfig, insertAlert, insertIssue } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import { checkRegressionsForIssue } from "@/lib/regressionCheck";
import { calculateSimilarity } from "@/lib/utils";

type RouteContext = { params: { id: string } };

type CreateIssueBody = {
  build_id?: string | null;
  title?: string;
  description?: string | null;
  priority?: string;
  assignee_id?: string | null;
  platform_tag?: string | null;
  category_tag?: string | null;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer", "qa", "player");

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const where: string[] = ["i.project_id = @project_id"];
    const queryParams: Record<string, unknown> = { project_id: params.id, limit, offset };

    const filterMap: Record<string, string> = {
      priority: "i.priority = @priority",
      status: "i.status = @status",
      assignee_id: "i.assignee_id = @assignee_id",
      platform_tag: "i.platform_tag = @platform_tag",
      category_tag: "i.category_tag = @category_tag",
      build_id: "i.build_id = @build_id",
    };

    for (const [key, condition] of Object.entries(filterMap)) {
      const value = url.searchParams.get(key);
      if (value) {
        where.push(condition);
        queryParams[key] = value;
      }
    }

    const whereSql = where.join(" AND ");

    const data = db
      .prepare(
        `SELECT i.*, u.name AS assignee_name
         FROM issues i
         LEFT JOIN users u ON u.id = i.assignee_id
         WHERE ${whereSql}
         ORDER BY datetime(i.updated_at) DESC, datetime(i.created_at) DESC
         LIMIT @limit OFFSET @offset`
      )
      .all(queryParams);

    const total = (
      db
        .prepare(`SELECT COUNT(*) as count FROM issues i WHERE ${whereSql}`)
        .get(queryParams) as { count: number }
    ).count;

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer", "qa");

    const body = (await request.json()) as CreateIssueBody;
    const title = body.title?.trim();
    const priority = body.priority?.trim().toLowerCase();

    if (!title || !priority) {
      return NextResponse.json({ error: "title and priority are required" }, { status: 400 });
    }

    const issueId = randomUUID();

    db.transaction(() => {
      insertIssue({
        id: issueId,
        project_id: params.id,
        build_id: body.build_id ?? null,
        title,
        description: body.description?.trim() || null,
        priority,
        status: "open",
        assignee_id: body.assignee_id ?? null,
        platform_tag: body.platform_tag?.trim() || null,
        category_tag: body.category_tag?.trim() || null,
        created_by: userId,
        resolved_at: null,
      });

      const config = getOrCreateProjectConfig(params.id);
      const recentCount = (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM issues
             WHERE project_id = ? AND priority IN ('blocker','critical')
             AND datetime(created_at) >= datetime('now','-24 hours')`
          )
          .get(params.id) as { count: number }
      ).count;

      if (recentCount >= config.bug_volume_threshold) {
        const existingAlert = db
          .prepare(
            `SELECT id FROM alerts WHERE project_id = ? AND type = 'high_bug_volume' AND is_read = 0 LIMIT 1`
          )
          .get(params.id);
        if (!existingAlert) {
          insertAlert({
            id: randomUUID(),
            project_id: params.id,
            build_id: body.build_id ?? null,
            type: "high_bug_volume",
            message: `High bug volume detected (${recentCount} blocker/critical in 24h).`,
          });
        }
      }
    })();

    if (body.build_id) {
      db.prepare(
        `UPDATE ai_cache SET is_stale = 1 WHERE build_id = ? AND feature_type = 'readiness_report'`
      ).run(body.build_id);

      checkRegressionsForIssue(issueId).catch((err) => {
        console.error("Regression check failed:", err);
      });
    }

    const issue = db.prepare("SELECT * FROM issues WHERE id = ?").get(issueId);

    // Duplicate detection
    const openIssues = db
      .prepare(`SELECT id, title FROM issues WHERE project_id = ? AND status != 'resolved' AND id != ?`)
      .all(params.id, issueId) as { id: string; title: string }[];

    let duplicateWarning = null;
    for (const oi of openIssues) {
      if (calculateSimilarity(title, oi.title) > 0.7) {
        duplicateWarning = {
          type: "possible_duplicate",
          matched_issue_id: oi.id,
          matched_title: oi.title,
        };
        break;
      }
    }

    return NextResponse.json({ issue, warning: duplicateWarning }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}
