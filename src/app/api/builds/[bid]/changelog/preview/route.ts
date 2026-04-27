import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { bid: string } }
) {
  try {
    // 1. Fetch resolved issues for this build
    const issues = db.prepare(
      `SELECT title, category_tag as type FROM issues 
       WHERE build_id = ? AND status = 'resolved'`
    ).all(params.bid) as { title: string, type: string }[];

    // 2. Group into sections
    const preview = {
      bug_fixes: issues.filter(i => i.type === "bug").map(i => i.title),
      improvements: issues.filter(i => i.type === "improvement").map(i => i.title),
      new_features: issues.filter(i => i.type === "feature").map(i => i.title)
    };

    return NextResponse.json(preview);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load issues preview" }, { status: 500 });
  }
}
