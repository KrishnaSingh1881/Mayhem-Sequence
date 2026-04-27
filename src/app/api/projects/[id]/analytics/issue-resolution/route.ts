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

  try {
    requireRole(params.id, userId, "admin", "developer", "qa");

    let query = `
      SELECT 
        b.version_name as name,
        COUNT(i.id) as opened,
        SUM(CASE WHEN i.resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved
      FROM builds b
      LEFT JOIN issues i ON i.build_id = b.id
      WHERE b.project_id = ?
    `;
    const queryParams: any[] = [params.id];

    if (from) {
      query += ` AND i.created_at >= ?`;
      queryParams.push(from);
    }
    if (to) {
      query += ` AND i.created_at <= ?`;
      queryParams.push(to);
    }

    query += ` GROUP BY b.id ORDER BY b.created_at ASC`;

    const data = db.prepare(query).all(...queryParams);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
