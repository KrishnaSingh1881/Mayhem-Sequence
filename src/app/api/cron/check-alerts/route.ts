import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db, insertAlert } from "@/lib/db";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    await getUserIdFromRequest(request);

    // Check for build_without_feedback (7 days, 0 feedback)
    const candidatesStale = db
      .prepare(
        `SELECT b.id, b.project_id
         FROM builds b
         LEFT JOIN feedback f ON f.build_id = b.id
         WHERE b.label = 'main'
           AND datetime(b.created_at) <= datetime('now', '-7 days')
         GROUP BY b.id, b.project_id
         HAVING COUNT(f.id) = 0`
      )
      .all() as Array<{ id: string; project_id: string }>;

    // Check for feedback_dropoff (48 hours, < 3 feedbacks)
    const candidatesDropoff = db
      .prepare(
        `SELECT b.id, b.project_id
         FROM builds b
         LEFT JOIN feedback f ON f.build_id = b.id
         WHERE b.label = 'main'
           AND datetime(b.created_at) <= datetime('now', '-2 days')
           AND datetime(b.created_at) > datetime('now', '-7 days')
         GROUP BY b.id, b.project_id
         HAVING COUNT(f.id) < 3`
      )
      .all() as Array<{ id: string; project_id: string }>;

    let inserted = 0;
    db.transaction(() => {
      for (const build of candidatesStale) {
        const existing = db
          .prepare(
            `SELECT id FROM alerts
             WHERE project_id = ?
               AND build_id = ?
               AND type = 'build_without_feedback'
             LIMIT 1`
          )
          .get(build.project_id, build.id);
        if (existing) continue;
        insertAlert({
          id: randomUUID(),
          project_id: build.project_id,
          build_id: build.id,
          type: "build_without_feedback",
          message: "Main build has no feedback after 7 days.",
        });
        inserted += 1;
      }

      for (const build of candidatesDropoff) {
        const existing = db
          .prepare(
            `SELECT id FROM alerts
             WHERE project_id = ?
               AND build_id = ?
               AND type = 'feedback_dropoff'
             LIMIT 1`
          )
          .get(build.project_id, build.id);
        if (existing) continue;
        insertAlert({
          id: randomUUID(),
          project_id: build.project_id,
          build_id: build.id,
          type: "feedback_dropoff",
          message: "Latest main build has received fewer than 3 feedback submissions in 48h after creation.",
        });
        inserted += 1;
      }
    })();

    return NextResponse.json({ ok: true, inserted, scanned: candidatesStale.length + candidatesDropoff.length });
  } catch (error) {
    return asErrorResponse(error);
  }
}
