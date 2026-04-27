import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const build = db.prepare(
      `SELECT b.id as build_id, b.version_name as version, ft.is_active as is_active_feedback, p.name as project_name, p.id as project_id
       FROM feedback_tokens ft
       JOIN builds b ON ft.build_id = b.id
       JOIN projects p ON b.project_id = p.id
       WHERE ft.token = ?`
    ).get(params.token) as any;

    if (!build) {
      return NextResponse.json({ error: "Invalid feedback token" }, { status: 404 });
    }

    if (build.is_active_feedback === 0) {
      return NextResponse.json({ 
        error: "Feedback closed", 
        project_name: build.project_name,
        closed: true 
      }, { status: 400 });
    }

    return NextResponse.json(build);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load public info" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const body = await req.json();
  const { rating, details, category, platform } = body;

  try {
    const build = db.prepare(
      `SELECT b.id, b.project_id, ft.is_active FROM feedback_tokens ft JOIN builds b ON ft.build_id = b.id WHERE ft.token = ?`
    ).get(params.token) as any;

    if (!build || build.is_active === 0) {
      return NextResponse.json({ error: "Feedback session unavailable" }, { status: 400 });
    }

    const feedbackId = uuidv4();
    db.prepare(
      `INSERT INTO feedback (id, project_id, build_id, rating, text_enjoy, text_broken, category_tag, platform_played, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      feedbackId, 
      build.project_id, 
      build.id, 
      rating, 
      details.enjoyed, 
      details.broken, 
      category, 
      platform,
      "public_link"
    );

    // Invalidate readiness report
    db.prepare("UPDATE ai_cache SET is_stale = 1 WHERE build_id = ? AND feature_type = 'readiness_report'").run(build.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
