import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateSimilarity } from "@/lib/utils";
import { getUserIdFromRequest, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireRole(context.params.id, userId, "admin", "developer", "qa", "player");

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ issues: [] });
    }

    // Get all open issues for this project
    const openIssues = db.prepare(`
      SELECT id, title, priority, status 
      FROM issues 
      WHERE project_id = ? AND status != 'resolved'
    `).all(context.params.id) as any[];

    const matches = openIssues
      .map(issue => ({
        ...issue,
        similarity_score: calculateSimilarity(query, issue.title)
      }))
      .filter(issue => issue.similarity_score > 0.35)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 3);

    return NextResponse.json({ issues: matches });
  } catch (error) {
    console.error("Similar issues error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
