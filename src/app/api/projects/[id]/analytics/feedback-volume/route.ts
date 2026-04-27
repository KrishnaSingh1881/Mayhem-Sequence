import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdFromRequest(req);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "date('now', '-30 days')";
  const to = searchParams.get("to") || "date('now')";
  const buildId = searchParams.get("build_id");

  try {
    requireRole(params.id, userId, "admin", "developer", "qa");

    let query = `
      SELECT 
        date(created_at) as date,
        COUNT(*) as count
      FROM feedback
      WHERE project_id = ?
    `;
    const queryParams: any[] = [params.id];

    if (from.includes('date')) {
        query += ` AND created_at >= ${from}`;
    } else {
        query += ` AND created_at >= ?`;
        queryParams.push(from);
    }

    if (to.includes('date')) {
        query += ` AND created_at <= ${to}`;
    } else {
        query += ` AND created_at <= ?`;
        queryParams.push(to);
    }

    if (buildId && buildId !== "all") {
      query += ` AND build_id = ?`;
      queryParams.push(buildId);
    }

    query += ` GROUP BY date(created_at) ORDER BY date ASC`;

    const data = db.prepare(query).all(...queryParams);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
