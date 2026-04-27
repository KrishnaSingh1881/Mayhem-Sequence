import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    iid: string;
  };
};

type CommentBody = {
  content?: string;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const issue = db
      .prepare("SELECT project_id FROM issues WHERE id = ?")
      .get(context.params.iid) as { project_id: string } | undefined;
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }
    requireRole(issue.project_id, userId, "admin", "developer", "qa", "player");

    const comments = db
      .prepare(
        `SELECT ic.*, u.name as author_name
         FROM issue_comments ic
         JOIN users u ON u.id = ic.author_id
         WHERE ic.issue_id = ?
         ORDER BY datetime(ic.created_at) ASC`
      )
      .all(context.params.iid);

    return NextResponse.json({ data: comments });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const issue = db
      .prepare("SELECT * FROM issues WHERE id = ?")
      .get(context.params.iid) as
      | { id: string; project_id: string; created_by: string; assignee_id: string | null }
      | undefined;
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }
    requireRole(issue.project_id, userId, "admin", "developer", "qa");

    const body = (await request.json()) as CommentBody;
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const commentId = randomUUID();
    db.prepare(
      `INSERT INTO issue_comments (id, issue_id, author_id, content)
       VALUES (?, ?, ?, ?)`
    ).run(commentId, issue.id, userId, content);

    const commentedUsers = db
      .prepare("SELECT DISTINCT author_id FROM issue_comments WHERE issue_id = ?")
      .all(issue.id) as Array<{ author_id: string }>;

    const targets = new Set<string>([
      issue.created_by,
      issue.assignee_id ?? "",
      ...commentedUsers.map((row) => row.author_id),
    ]);
    targets.delete("");
    targets.delete(userId);

    for (const target of targets) {
      db.prepare(
        `INSERT INTO notifications (
          id, user_id, project_id, type, message, entity_type, entity_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        target,
        issue.project_id,
        "issue_comment",
        `New comment on issue "${issue.id}"`,
        "issue",
        issue.id
      );
    }

    const comment = db.prepare("SELECT * FROM issue_comments WHERE id = ?").get(commentId);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}
