import { NextResponse } from "next/server";
import { db, getProjectById } from "@/lib/db";
import { getUserIdFromRequest, HttpError, ProjectRole, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
    userId: string;
  };
};

type UpdateRoleBody = {
  role?: ProjectRole;
};

const ALLOWED_ROLES: ProjectRole[] = ["admin", "developer", "qa", "player"];

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actorId = await getUserIdFromRequest(request);
    requireRole(context.params.id, actorId, "admin");
    
    const project = getProjectById(context.params.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Cannot modify project owner
    if (project.owner_id === context.params.userId) {
      return NextResponse.json({ error: "Cannot modify owner role" }, { status: 400 });
    }

    const body = (await request.json()) as UpdateRoleBody;
    if (!body.role || !ALLOWED_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Safety: Cannot demote the only admin
    if (body.role !== "admin") {
      const targetMember = db.prepare("SELECT role FROM project_members WHERE project_id = ? AND user_id = ?").get(context.params.id, context.params.userId) as { role: string } | undefined;
      if (targetMember?.role === "admin") {
        const otherAdmins = db.prepare("SELECT count(*) as count FROM project_members WHERE project_id = ? AND role = 'admin' AND user_id != ?").get(context.params.id, context.params.userId) as { count: number };
        if (otherAdmins.count === 0) {
          return NextResponse.json({ error: "Cannot demote the only admin" }, { status: 400 });
        }
      }
    }

    const result = db
      .prepare("UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?")
      .run(body.role, context.params.id, context.params.userId);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const member = db
      .prepare("SELECT * FROM project_members WHERE project_id = ? AND user_id = ?")
      .get(context.params.id, context.params.userId);
      
    return NextResponse.json({ member });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actorId = await getUserIdFromRequest(request);
    requireRole(context.params.id, actorId, "admin");
    
    const project = getProjectById(context.params.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Cannot remove project owner
    if (project.owner_id === context.params.userId) {
      return NextResponse.json({ error: "Cannot remove project owner" }, { status: 400 });
    }

    // Safety: Cannot remove the only admin
    const targetMember = db.prepare("SELECT role FROM project_members WHERE project_id = ? AND user_id = ?").get(context.params.id, context.params.userId) as { role: string } | undefined;
    if (targetMember?.role === "admin") {
       const otherAdmins = db.prepare("SELECT count(*) as count FROM project_members WHERE project_id = ? AND role = 'admin' AND user_id != ?").get(context.params.id, context.params.userId) as { count: number };
       if (otherAdmins.count === 0) {
         return NextResponse.json({ error: "Cannot remove the only admin" }, { status: 400 });
       }
    }

    const result = db
      .prepare("DELETE FROM project_members WHERE project_id = ? AND user_id = ?")
      .run(context.params.id, context.params.userId);
      
    if (result.changes === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return asErrorResponse(error);
  }
}
