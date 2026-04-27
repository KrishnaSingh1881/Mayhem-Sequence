import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    cid: string;
  };
};

type CommentPatchBody = {
  content?: string;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

function getComment(cid: string) {
  return db
    .prepare(
      `SELECT ic.*, i.project_id
       FROM issue_comments ic
       JOIN issues i ON i.id = ic.issue_id
       WHERE ic.id = ?`
    )
    .get(cid) as
    | { id: string; issue_id: string; author_id: string; project_id: string }
    | undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const comment = getComment(context.params.cid);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    requireRole(comment.project_id, userId, "admin", "developer", "qa");
    if (comment.author_id !== userId) {
      return NextResponse.json({ error: "You can edit only your own comments" }, { status: 403 });
    }

    const body = (await request.json()) as CommentPatchBody;
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    db.prepare("UPDATE issue_comments SET content = ? WHERE id = ?").run(content, comment.id);
    const updated = getComment(comment.id);
    return NextResponse.json({ comment: updated });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const comment = getComment(context.params.cid);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    const role = requireRole(comment.project_id, userId, "admin", "developer", "qa");
    if (comment.author_id !== userId && role !== "admin") {
      return NextResponse.json(
        { error: "Only the author or an admin can delete this comment" },
        { status: 403 }
      );
    }

    db.prepare("DELETE FROM issue_comments WHERE id = ?").run(comment.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
