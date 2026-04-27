import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";
import { v4 as uuidv4 } from "uuid";

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    const body = await req.json();
    const { inviteToken } = body;

    if (!inviteToken) {
      return NextResponse.json({ error: "inviteToken is required" }, { status: 400 });
    }

    const invite = db
      .prepare(`SELECT * FROM project_invites WHERE token = ?`)
      .get(inviteToken) as any;
    if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });

    db.transaction(() => {
      db.prepare(
        `INSERT INTO project_members (id, project_id, user_id, role, accepted_at) VALUES (?, ?, ?, ?, datetime('now'))`
      ).run(uuidv4(), invite.project_id, userId, invite.role);
      db.prepare(`DELETE FROM project_invites WHERE id = ?`).run(invite.id);
    })();

    return NextResponse.json({ success: true, projectId: invite.project_id });
  } catch (err: any) {
    if (err?.code === "SQLITE_CONSTRAINT_PRIMARYKEY" || err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json({ error: "Already a member of this project" }, { status: 400 });
    }
    return asErrorResponse(err);
  }
}
