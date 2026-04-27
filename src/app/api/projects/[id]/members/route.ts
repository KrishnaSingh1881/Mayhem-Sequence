import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import { v4 as uuidv4 } from "uuid";

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

    const members = db
      .prepare(
        `SELECT pm.user_id, pm.role, pm.invited_at as joined_at, u.name, u.email
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = ? AND pm.accepted_at IS NOT NULL`
      )
      .all(params.id);

    return NextResponse.json({ data: members });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin");

    const body = await request.json();
    const { email, role } = body as { email?: string; role?: string };

    if (!email || !role) {
      return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    }

    const existingInvite = db
      .prepare(`SELECT id FROM project_invites WHERE project_id = ? AND email = ?`)
      .get(params.id, email);
    if (existingInvite) {
      return NextResponse.json({ error: "Already invited" }, { status: 400 });
    }

    const inviteId = uuidv4();
    const inviteToken = uuidv4();

    db.prepare(
      `INSERT INTO project_invites (id, project_id, email, role, token, invited_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(inviteId, params.id, email, role, inviteToken, userId);

    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.json({ success: true, inviteLink: `${base}/invite/${inviteToken}` });
  } catch (error) {
    return asErrorResponse(error);
  }
}
