import { NextResponse } from "next/server";
import { db, updateProject } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

function parsePlatforms(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[projects/[id]]", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);

    const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(params.id) as any;
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const member = db
      .prepare(`SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`)
      .get(params.id, userId) as { role: string } | undefined;
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({
      project: { ...project, platforms: parsePlatforms(project.platforms) },
      role: member.role,
    });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin");

    const body = await request.json();
    const { name, description, genre, platforms: rawPlatforms, status } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (genre !== undefined) updates.genre = genre;
    if (rawPlatforms !== undefined)
      updates.platforms = Array.isArray(rawPlatforms)
        ? JSON.stringify(rawPlatforms)
        : rawPlatforms;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length > 0) {
      updateProject(params.id, updates as any);
    }

    const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(params.id) as any;
    return NextResponse.json({
      project: { ...project, platforms: parsePlatforms(project.platforms) },
    });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin");

    db.transaction(() => {
      db.prepare(`DELETE FROM issue_comments WHERE issue_id IN (SELECT id FROM issues WHERE project_id = ?)`).run(params.id);
      db.prepare(`DELETE FROM issues WHERE project_id = ?`).run(params.id);
      db.prepare(`DELETE FROM feedback WHERE project_id = ?`).run(params.id);
      db.prepare(`DELETE FROM feedback_tokens WHERE project_id = ?`).run(params.id);
      db.prepare(`DELETE FROM builds WHERE project_id = ?`).run(params.id);
      db.prepare(`DELETE FROM alerts WHERE project_id = ?`).run(params.id);
      db.prepare(`DELETE FROM changelogs WHERE project_id = ?`).run(params.id);
      db.prepare(`DELETE FROM project_members WHERE project_id = ?`).run(params.id);
      db.prepare(`DELETE FROM project_config WHERE project_id = ?`).run(params.id);
      db.prepare(`DELETE FROM projects WHERE id = ?`).run(params.id);
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
