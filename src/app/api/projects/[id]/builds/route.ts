import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { findConflictingBuild, ALL_BUILD_LABELS } from "@/lib/builds";
import { getBuildById, getBuildsForProject, insertBuild } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import { checkRegressions } from "@/lib/regressionCheck";

type RouteContext = { params: { id: string } };

type CreateBuildBody = {
  version_name?: string;
  label?: string;
  upload_type?: "file" | "folder" | "link";
  file_path?: string | null;
  external_link?: string | null;
  file_size?: number | null;
  notes?: string | null;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer", "qa", "player");

    const { searchParams } = new URL(request.url);
    const label = searchParams.get("label");
    const limitParam = Number(searchParams.get("limit") || "0");
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null;

    const builds = getBuildsForProject(params.id);
    const filtered = label ? builds.filter((b) => b.label === label) : builds;

    return NextResponse.json({ data: limit ? filtered.slice(0, limit) : filtered });
  } catch (error) {
    return asErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    requireRole(params.id, userId, "admin", "developer");

    const body = (await request.json()) as CreateBuildBody;
    const versionName = body.version_name?.trim();
    const label = (body.label || "experimental").trim().toLowerCase();
    const uploadType = body.upload_type || "link";

    if (!versionName) {
      return NextResponse.json({ error: "version_name is required" }, { status: 400 });
    }
    if (!ALL_BUILD_LABELS.has(label)) {
      return NextResponse.json({ error: "Invalid label" }, { status: 400 });
    }

    const conflict = findConflictingBuild(params.id, label);
    if (conflict) {
      return NextResponse.json({ conflict: true, conflicting_build: conflict }, { status: 409 });
    }

    if (uploadType === "link" && !body.external_link) {
      return NextResponse.json(
        { error: "external_link is required for link upload_type" },
        { status: 400 }
      );
    }

    const buildId = randomUUID();
    insertBuild({
      id: buildId,
      project_id: params.id,
      version_name: versionName,
      label,
      upload_type: uploadType,
      file_path: body.file_path ?? null,
      external_link: body.external_link ?? null,
      file_size: body.file_size ?? null,
      notes: body.notes ?? null,
      created_by: userId,
    });

    checkRegressions(buildId).catch((err) => {
      console.error("Regression check failed:", err);
    });

    const build = getBuildById(buildId);
    return NextResponse.json({ build }, { status: 201 });
  } catch (error) {
    return asErrorResponse(error);
  }
}
