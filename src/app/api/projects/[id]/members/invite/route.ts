import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db, getUserByEmail, insertProjectMember } from "@/lib/db";
import { getUserIdFromRequest, HttpError, ProjectRole, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
  };
};

type InviteBody = {
  email?: string;
  role?: ProjectRole;
};

const ALLOWED_ROLES: ProjectRole[] = ["admin", "developer", "qa", "player"];

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(context.params.id, userId, "admin");

    const body = (await request.json()) as InviteBody;
    const email = body.email?.trim().toLowerCase();
    const role = body.role ?? "player";

    if (!email || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid email or role" }, { status: 400 });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = db
      .prepare("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?")
      .get(context.params.id, user.id);
    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    insertProjectMember({
      id: randomUUID(),
      project_id: context.params.id,
      user_id: user.id,
      role,
      accepted_at: null,
    });

    const member = db
      .prepare("SELECT * FROM project_members WHERE project_id = ? AND user_id = ?")
      .get(context.params.id, user.id);
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}
