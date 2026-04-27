import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({ builds: [], issues: [], feedback: [], changelogs: [] });
  }

  const query = `%${q}%`;

  try {
    // Search Builds
    const builds = db.prepare(
      `SELECT id, version_name as label, 'Build' as type, project_id 
       FROM builds 
       WHERE project_id = ? AND version_name LIKE ? 
       LIMIT 5`
    ).all(params.id, query);

    // Search Issues
    const issues = db.prepare(
      `SELECT i.id, i.title as label, 'Issue' as type, i.project_id, b.version_name as subtitle
       FROM issues i
       LEFT JOIN builds b ON i.build_id = b.id
       WHERE i.project_id = ? AND i.title LIKE ? 
       LIMIT 5`
    ).all(params.id, query);

    // Search Feedback
    const feedback = db.prepare(
      `SELECT f.id, 
              (CASE WHEN length(text_enjoy) > 40 THEN substr(text_enjoy, 1, 40) || '...' ELSE text_enjoy END) as label, 
              'Feedback' as type, f.project_id, b.version_name as subtitle
       FROM feedback f
       LEFT JOIN builds b ON f.build_id = b.id
       WHERE f.project_id = ? AND (text_enjoy LIKE ? OR text_broken LIKE ?) 
       LIMIT 5`
    ).all(params.id, query, query);

    // Search Changelogs
    const changelogs = db.prepare(
      `SELECT cl.id, 'Changelog' as label, 'Changelog' as type, cl.project_id, b.version_name as subtitle
       FROM changelogs cl
       JOIN builds b ON cl.build_id = b.id
       WHERE cl.project_id = ? AND cl.content LIKE ? 
       LIMIT 5`
    ).all(params.id, query);

    return NextResponse.json({ builds, issues, feedback, changelogs });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
