import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(req);
    const { searchParams } = new URL(req.url);
    const screen = searchParams.get("screen");

    const filters = db
      .prepare(`SELECT * FROM saved_filters WHERE project_id = ? AND screen = ? AND user_id = ?`)
      .all(params.id, screen, userId);

    return NextResponse.json({ data: filters });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(req);
    const body = await req.json();
    const { screen, name, filter_config } = body;

    if (!screen || !name || !filter_config) {
      return NextResponse.json({ error: "screen, name, and filter_config are required" }, { status: 400 });
    }

    const id = uuidv4();
    db.prepare(
      `INSERT INTO saved_filters (id, user_id, project_id, screen, name, filter_config) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, userId, params.id, screen, name, filter_config);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return asErrorResponse(error);
  }
}
