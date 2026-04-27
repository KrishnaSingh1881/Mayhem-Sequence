import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

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

    const changelogs = db
      .prepare(
        `SELECT c.*, b.version_name, u.name as author_name
         FROM changelogs c
         JOIN builds b ON c.build_id = b.id
         JOIN users u ON c.created_by = u.id
         WHERE c.project_id = ?
         ORDER BY c.created_at DESC`
      )
      .all(params.id);

    return NextResponse.json({ data: changelogs });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer");

    const body = await request.json();
    const { buildId, content, aiGenerated, published } = body;

    if (!buildId || !content) {
      return NextResponse.json({ error: "buildId and content are required" }, { status: 400 });
    }

    const id = uuid();
    db.prepare(
      `INSERT INTO changelogs (id, project_id, build_id, content, ai_generated, published, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, params.id, buildId, content, aiGenerated ? 1 : 0, published ? 1 : 0, userId);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return asErrorResponse(error);
  }
}
