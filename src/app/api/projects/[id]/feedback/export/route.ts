import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
  };
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const normalized = value === null || value === undefined ? "" : String(value);
    if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ];
  return lines.join("\n");
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(context.params.id, userId, "admin");

    const rows = db
      .prepare(
        `SELECT
          f.id,
          f.project_id,
          f.build_id,
          f.token_id,
          ft.label AS token_label,
          f.submitted_by,
          f.rating,
          f.text_enjoy,
          f.text_broken,
          f.category_tag,
          f.platform_played,
          f.sentiment,
          f.source,
          f.created_at
         FROM feedback f
         LEFT JOIN feedback_tokens ft ON ft.id = f.token_id
         WHERE f.project_id = ?
         ORDER BY f.created_at DESC`
      )
      .all(context.params.id) as Record<string, unknown>[];

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="feedback-${context.params.id}.csv"`,
      },
    });
  } catch (error) {
    return asErrorResponse(error);
  }
}
