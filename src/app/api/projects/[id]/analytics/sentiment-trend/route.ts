import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdFromRequest(req);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const buildId = searchParams.get("build_id");

  try {
    requireRole(params.id, userId, "admin", "developer", "qa");

    let query = `
      SELECT 
        b.version_name as name,
        SUM(CASE WHEN f.sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN f.sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
        SUM(CASE WHEN f.sentiment = 'negative' THEN 1 ELSE 0 END) as negative
      FROM builds b
      LEFT JOIN feedback f ON f.build_id = b.id
      WHERE b.project_id = ?
    `;
    const queryParams: any[] = [params.id];

    if (from) {
      query += ` AND f.created_at >= ?`;
      queryParams.push(from);
    }
    if (to) {
      query += ` AND f.created_at <= ?`;
      queryParams.push(to);
    }
    if (buildId && buildId !== "all") {
      query += ` AND b.id = ?`;
      queryParams.push(buildId);
    }

    query += ` GROUP BY b.id ORDER BY b.created_at ASC`;

    const data = db.prepare(query).all(...queryParams);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
