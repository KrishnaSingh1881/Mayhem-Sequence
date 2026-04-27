import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { changelog_content, tone, build_version } = await request.json();

    let systemPrompt = "";
    if (tone === "technical") {
      systemPrompt = `You are a technical lead. Rewrite this changelog for an internal developer audience. Use technical language, reference system names, and mention specific fixes. Avoid marketing language or fluff. Return JSON ONLY with a "content" field. Version: ${build_version}`;
    } else if (tone === "player") {
      systemPrompt = `You are a community manager. Rewrite this changelog for players. Use friendly, clear language. No jargon. Focus on what the player experiences and what bugs were squashed. Return JSON ONLY with a "content" field. Version: ${build_version}`;
    } else if (tone === "marketing") {
      systemPrompt = `You are a marketing specialist. Rewrite this changelog as exciting release highlights. Focus on the value, new experiences, and "hype". No bug/crash language. Return JSON ONLY with a "content" field. Version: ${build_version}`;
    } else {
      systemPrompt = `Rewrite this changelog in a standard professional tone. Return JSON ONLY with a "content" field. Version: ${build_version}`;
    }

    const userContent = `Original Changelog Data:
${typeof changelog_content === 'string' ? changelog_content : JSON.stringify(changelog_content, null, 2)}

Return format: { "content": "..." }`;

    const rawOutput = await callAI(systemPrompt, userContent);
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI returned invalid format");
    
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Tone Shift Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tone shift failed" }, { status: 500 });
  }
}
