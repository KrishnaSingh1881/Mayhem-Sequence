import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";

type RouteContext = { params: { id: string } };

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    await getUserIdFromRequest(request);

    const { searchParams } = new URL(request.url);
    const isReadFilter = searchParams.get("is_read");
    const limitParam = Number(searchParams.get("limit") || "0");
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null;

    let query = `
      SELECT a.*, b.version_name
      FROM alerts a
      LEFT JOIN builds b ON a.build_id = b.id
      WHERE a.project_id = ?
    `;
    const queryParams: unknown[] = [params.id];

    if (isReadFilter !== null && isReadFilter !== "all") {
      query += ` AND a.is_read = ?`;
      queryParams.push(isReadFilter === "true" || isReadFilter === "1" ? 1 : 0);
    }

    query += ` ORDER BY a.created_at DESC`;
    if (limit) query += ` LIMIT ${limit}`;

    const alerts = db.prepare(query).all(...queryParams);
    return NextResponse.json({ data: alerts });
  } catch (error) {
    return asErrorResponse(error);
  }
}
