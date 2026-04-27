import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db, getBuildsForProject, insertFeedbackToken } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
  };
};

type CreateTokenBody = {
  build_id?: string;
  label?: string;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(context.params.id, userId, "admin", "developer", "qa", "player");

    const tokens = db
      .prepare(
        `SELECT ft.*, COUNT(f.id) as submission_count
         FROM feedback_tokens ft
         LEFT JOIN feedback f ON f.token_id = ft.id
         WHERE ft.project_id = ?
         GROUP BY ft.id
         ORDER BY ft.created_at DESC`
      )
      .all(context.params.id);

    return NextResponse.json({ data: tokens });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(context.params.id, userId, "admin", "developer");
    const body = (await request.json()) as CreateTokenBody;

    let buildId = body.build_id;
    if (!buildId) {
      const latestBuild = getBuildsForProject(context.params.id)[0];
      buildId = latestBuild?.id;
    }

    if (!buildId) {
      return NextResponse.json({ error: "build_id is required when project has no builds" }, { status: 400 });
    }

    const exists = db
      .prepare("SELECT id FROM builds WHERE id = ? AND project_id = ?")
      .get(buildId, context.params.id);
    if (!exists) {
      return NextResponse.json({ error: "Build not found for project" }, { status: 404 });
    }

    const tokenId = randomUUID();
    const tokenValue = randomUUID();
    insertFeedbackToken({
      id: tokenId,
      project_id: context.params.id,
      build_id: buildId,
      token: tokenValue,
      label: body.label?.trim() || null,
      created_by: userId,
    });

    const token = db.prepare("SELECT * FROM feedback_tokens WHERE id = ?").get(tokenId);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    return NextResponse.json(
      {
        token,
        url: `${baseUrl}/feedback/${tokenValue}`,
      },
      { status: 201 }
    );
  } catch (error) {
    return asErrorResponse(error);
  }
}
