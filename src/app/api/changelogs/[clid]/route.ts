import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { clid: string } }
) {
  const { content, published } = await req.json();

  try {
    db.prepare(
      `UPDATE changelogs 
       SET content = COALESCE(?, content), 
           published = COALESCE(?, published)
       WHERE id = ?`
    ).run(content ? JSON.stringify(content) : null, published, params.clid);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update changelog" }, { status: 500 });
  }
}
