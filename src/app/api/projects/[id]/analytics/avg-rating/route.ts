import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdFromRequest(req);

  try {
    requireRole(params.id, userId, "admin", "developer", "qa");

    const builds = db.prepare(`
      SELECT 
        b.id,
        b.version_name,
        AVG(f.rating) as avg_rating,
        COUNT(f.id) as feedback_count
      FROM builds b
      LEFT JOIN feedback f ON f.build_id = b.id
      WHERE b.project_id = ?
      GROUP BY b.id
      ORDER BY b.created_at ASC
    `).all(params.id) as any[];

    const result = builds.map((b, idx) => {
      const prevRating = idx > 0 ? builds[idx - 1].avg_rating : null;
      const delta = (prevRating !== null && b.avg_rating !== null) 
        ? b.avg_rating - prevRating 
        : 0;

      return {
        version_name: b.version_name,
        avg_rating: b.avg_rating ? b.avg_rating.toFixed(1) : "0.0",
        feedback_count: b.feedback_count,
        delta: delta.toFixed(2),
        direction: delta >= 0 ? "up" : "down"
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
