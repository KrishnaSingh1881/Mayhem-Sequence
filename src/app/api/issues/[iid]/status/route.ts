import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    iid: string;
  };
};

type StatusBody = {
  status?: "open" | "in_progress" | "qa" | "resolved";
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const body = (await request.json()) as StatusBody;
    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    db.prepare(
      `UPDATE issues
       SET status = ?,
           updated_at = datetime('now'),
           resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE NULL END
       WHERE id = ?`
    ).run(body.status, body.status, issue.id);

    const targets = [issue.created_by, issue.assignee_id].filter(Boolean) as string[];
    for (const target of [...new Set(targets)].filter((id) => id !== userId)) {
      db.prepare(
        `INSERT INTO notifications (
          id, user_id, project_id, type, message, entity_type, entity_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        target,
        issue.project_id,
        "issue_status",
        `Issue "${issue.id}" status changed to ${body.status}`,
        "issue",
        issue.id
      );
    }

    const updated = db.prepare("SELECT * FROM issues WHERE id = ?").get(issue.id);
    return NextResponse.json({ issue: updated });
  } catch (error) {
    return asErrorResponse(error);
  }
}
