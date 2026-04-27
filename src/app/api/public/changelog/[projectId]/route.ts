import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    // 1. Verify project exists
    const project = db.prepare(`SELECT name as title FROM projects WHERE id = ?`).get(params.projectId) as any;
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Fetch published changelogs
    const changelogs = db.prepare(
      `SELECT cl.*, b.version_name as version 
       FROM changelogs cl
       JOIN builds b ON cl.build_id = b.id
       WHERE cl.project_id = ? AND cl.published = 1
       ORDER BY cl.created_at DESC`
    ).all(params.projectId) as any[];

    return NextResponse.json({
      project_name: project.title,
      changelogs: changelogs.map(cl => ({
        ...cl,
        content: JSON.parse(cl.content)
      }))
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load public changelogs" }, { status: 500 });
  }
}
