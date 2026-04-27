import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "developer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { raw_notes, version_name, project_genre } = await req.json();

    if (!raw_notes) {
      return NextResponse.json({ error: "No notes provided" }, { status: 400 });
    }

    const systemPrompt = "You are a game developer writing internal build notes.";
    const userPrompt = `Expand these rough notes into structured, readable build documentation.
Keep it factual and technical. Do not invent details not implied by the input.
Format as plain text with sections: What Changed, Known Issues (if mentioned), Notes for QA.
Raw input: '${raw_notes}'
Game version: ${version_name}, Genre: ${project_genre}`;

    const expanded = await callAI(systemPrompt, userPrompt);

    return NextResponse.json({ expanded });
  } catch (error) {
    console.error("Expand notes error:", error);
    return NextResponse.json({ error: "Failed to expand notes" }, { status: 500 });
  }
}
