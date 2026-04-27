import path from "path";
import { NextResponse } from "next/server";
import { getBuildById } from "@/lib/db";
import { getUserIdFromRequest, HttpError, requireRole } from "@/lib/permissions";
import storage, { GDriveProvider } from "@/lib/storage";

type RouteContext = {
  params: {
    bid: string;
  };
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await getUserIdFromRequest(request);
    const build = getBuildById(context.params.bid);
    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }
    requireRole(build.project_id, userId, "admin", "developer");

    if (!build.file_path) {
      return NextResponse.json({ error: "Build has no downloadable file" }, { status: 400 });
    }

    if (storage instanceof GDriveProvider) {
      const url = await storage.getDownloadUrl(build.file_path);
      return NextResponse.redirect(url);
    }

    const stream = storage.getStream(build.file_path);
    const filename = path.basename(build.file_path);

    return new NextResponse(stream as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
