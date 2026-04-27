import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  try {
    const invite = db.prepare(`
      SELECT pi.*, p.name as project_name 
      FROM project_invites pi
      JOIN projects p ON pi.project_id = p.id
      WHERE pi.token = ?
    `).get(token) as any;

    if (!invite) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });

    return NextResponse.json({ invite });
  } catch (err) {
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
