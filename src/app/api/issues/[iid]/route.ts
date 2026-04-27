import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import { checkRegressionsForIssue } from "@/lib/regressionCheck";

type RouteContext = {
  params: {
    iid: string;
  };
};

type IssuePatchBody = {
  title?: string;
  description?: string | null;
  priority?: string;
  status?: string;
  assignee_id?: string | null;
  platform_tag?: string | null;
  category_tag?: string | null;
  build_id?: string | null;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

function getIssue(iid: string) {
  return db.prepare("SELECT * FROM issues WHERE id = ?").get(iid) as
    | {
        id: string;
        project_id: string;
        build_id: string | null;
        created_by: string;
        assignee_id: string | null;
        status: string;
      }
    | undefined;
}

function notifyIssueUsers(projectId: string, issueId: string, actorId: string, targets: string[], message: string) {
  const uniqueTargets = [...new Set(targets)].filter((id) => id && id !== actorId);
  for (const targetId of uniqueTargets) {
    db.prepare(
      `INSERT INTO notifications (
        id, user_id, project_id, type, message, entity_type, entity_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      targetId,
      projectId,
      "issue_update",
      message,
      "issue",
      issueId
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const issue = getIssue(context.params.iid);
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }
    requireRole(issue.project_id, userId, "admin", "developer", "qa", "player");

    const detail = db
      .prepare(
        `SELECT i.*, c.name as creator_name, a.name as assignee_name
         FROM issues i
         LEFT JOIN users c ON c.id = i.created_by
         LEFT JOIN users a ON a.id = i.assignee_id
         WHERE i.id = ?`
      )
      .get(context.params.iid);
    const comments = db
      .prepare(
        `SELECT ic.*, u.name as author_name
         FROM issue_comments ic
         JOIN users u ON u.id = ic.author_id
         WHERE ic.issue_id = ?
         ORDER BY datetime(ic.created_at) ASC`
      )
      .all(context.params.iid);
    const activity = db
      .prepare(
        `SELECT *
         FROM notifications
         WHERE entity_type = 'issue' AND entity_id = ?
         ORDER BY datetime(created_at) DESC`
      )
      .all(context.params.iid);

    return NextResponse.json({ issue: detail, comments, activity });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const issue = getIssue(context.params.iid);
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const role = requireRole(issue.project_id, userId, "admin", "developer", "qa");
    const body = (await request.json()) as IssuePatchBody;

    const nonStatusKeys = [
      "title",
      "description",
      "priority",
      "assignee_id",
      "platform_tag",
      "category_tag",
      "build_id",
    ] as const;
    const hasNonStatusChanges = nonStatusKeys.some((key) => Object.hasOwn(body, key));
    if (hasNonStatusChanges && role === "qa") {
      return NextResponse.json(
        { error: "QA can only update issue status" },
        { status: 403 }
      );
    }

    const updates: string[] = [];
    const params: Record<string, unknown> = { iid: issue.id };
    const push = (column: string, key: keyof IssuePatchBody) => {
      if (!Object.hasOwn(body, key)) return;
      updates.push(`${column} = @${column}`);
      const value = body[key];
      params[column] = typeof value === "string" ? value.trim() : value ?? null;
    };

    push("title", "title");
    push("description", "description");
    push("priority", "priority");
    push("status", "status");
    push("assignee_id", "assignee_id");
    push("platform_tag", "platform_tag");
    push("category_tag", "category_tag");
    push("build_id", "build_id");

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    if (body.status === "resolved") {
      updates.push("resolved_at = datetime('now')");
    } else if (Object.hasOwn(body, "status")) {
      updates.push("resolved_at = NULL");
    }

    db.prepare(`UPDATE issues SET ${updates.join(", ")} WHERE id = @iid`).run(params);

    // Invalidate readiness reports for relevant builds
    if (issue.build_id) {
      db.prepare("UPDATE ai_cache SET is_stale = 1 WHERE build_id = ? AND feature_type = 'readiness_report'").run(issue.build_id);
    }
    if (body.build_id && body.build_id !== issue.build_id) {
      db.prepare("UPDATE ai_cache SET is_stale = 1 WHERE build_id = ? AND feature_type = 'readiness_report'").run(body.build_id);
    }

    // If title, category, or build_id changed, re-run regression check
    if (body.title || body.category_tag || body.build_id) {
      checkRegressionsForIssue(context.params.iid).catch(err => {
        console.error("Issue update regression check failed:", err);
      });
    }

    const updatedIssue = getIssue(context.params.iid);
    if (updatedIssue) {
      notifyIssueUsers(
        updatedIssue.project_id,
        updatedIssue.id,
        userId,
        [updatedIssue.created_by, updatedIssue.assignee_id ?? ""],
        `Issue "${updatedIssue.id}" was updated`
      );
    }

    const detail = db.prepare("SELECT * FROM issues WHERE id = ?").get(context.params.iid);
    return NextResponse.json({ issue: detail });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const issue = getIssue(context.params.iid);
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }
    requireRole(issue.project_id, userId, "admin");
    db.prepare("DELETE FROM issues WHERE id = ?").run(issue.id);

    if (issue.build_id) {
      db.prepare("UPDATE ai_cache SET is_stale = 1 WHERE build_id = ? AND feature_type = 'readiness_report'").run(issue.build_id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
