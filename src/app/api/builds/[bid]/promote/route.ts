import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db, getBuildById } from "@/lib/db";
import { findConflictingBuild } from "@/lib/builds";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";

type RouteContext = {
  params: {
    bid: string;
  };
};

type PromoteBody = {
  to_label?: "testing" | "main";
  confirm?: boolean;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const build = getBuildById(context.params.bid);
    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    requireRole(build.project_id, userId, "admin", "developer");
    const body = (await request.json()) as PromoteBody;
    if (!body.to_label || !["testing", "main"].includes(body.to_label)) {
      return NextResponse.json({ error: "to_label must be testing or main" }, { status: 400 });
    }

    const conflicting = findConflictingBuild(build.project_id, body.to_label, build.id);
    if (conflicting && !body.confirm) {
      return NextResponse.json({ conflict: true, conflicting_build: conflicting }, { status: 409 });
    }

    const affectedBuildIds = new Set<string>([build.id]);
    const promoted = db.transaction(() => {
      let archivedBuild: unknown = null;

      if (conflicting) {
        db.prepare("UPDATE builds SET label = 'archived' WHERE id = ?").run(
          (conflicting as { id: string }).id
        );
        db.prepare(
          `INSERT INTO promotion_logs (
            id, project_id, build_id, from_label, to_label, previous_build_id, promoted_by, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          randomUUID(),
          build.project_id,
          (conflicting as { id: string }).id,
          body.to_label,
          "archived",
          build.id,
          userId,
          "Archived due to promotion conflict resolution"
        );
        affectedBuildIds.add((conflicting as { id: string }).id);
        archivedBuild = db.prepare("SELECT * FROM builds WHERE id = ?").get(
          (conflicting as { id: string }).id
        );
      }

      db.prepare("UPDATE builds SET label = ? WHERE id = ?").run(body.to_label, build.id);
      db.prepare(
        `INSERT INTO promotion_logs (
          id, project_id, build_id, from_label, to_label, previous_build_id, promoted_by, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        build.project_id,
        build.id,
        build.label,
        body.to_label,
        conflicting ? (conflicting as { id: string }).id : null,
        userId,
        "Promoted build"
      );

      for (const affectedId of affectedBuildIds) {
        db.prepare("UPDATE ai_cache SET is_stale = 1 WHERE project_id = ? AND build_id = ?").run(
          build.project_id,
          affectedId
        );
      }

      const updated = db.prepare("SELECT * FROM builds WHERE id = ?").get(build.id);
      return { build: updated, archived_conflicting_build: archivedBuild };
    })();

    return NextResponse.json(promoted);
  } catch (error) {
    return asErrorResponse(error);
  }
}
