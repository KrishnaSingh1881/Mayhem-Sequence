import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  db,
  getOrCreateProjectConfig,
  getProjectsByUser,
  insertProject,
  insertProjectMember,
} from "@/lib/db";
import { getUserIdFromRequest, HttpError } from "@/lib/permissions";

type CreateProjectBody = {
  name?: string;
  genre?: string;
  platforms?: string[] | string;
  description?: string;
  cover_image_url?: string;
  status?: string;
};

function asErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[/api/projects] Error:", msg);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    const projects = getProjectsByUser(userId).map((project) => {
      let platforms: string[];
      try {
        const parsed = JSON.parse(project.platforms);
        platforms = Array.isArray(parsed) ? parsed : [project.platforms];
      } catch {
        // Legacy data stored as "PC, PS5" plain string
        platforms = project.platforms.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      return { ...project, platforms };
    });
    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("[/api/projects GET] ERROR:", error);
    return asErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = (await request.json()) as CreateProjectBody;
    const name = body.name?.trim();
    const genre = body.genre?.trim();
    const status = body.status?.trim() || "active";
    const description = body.description?.trim() || null;
    const coverImageUrl = body.cover_image_url?.trim() || null;

    if (!name || !genre) {
      return NextResponse.json({ error: "name and genre are required" }, { status: 400 });
    }

    const platforms =
      typeof body.platforms === "string"
        ? body.platforms
        : JSON.stringify(body.platforms ?? []);

    const projectId = randomUUID();
    const memberId = randomUUID();
    const acceptedAt = new Date().toISOString();

    const transaction = db.transaction(() => {
      insertProject({
        id: projectId,
        name,
        genre,
        platforms,
        description,
        cover_image_url: coverImageUrl,
        status,
        owner_id: userId,
      });
      insertProjectMember({
        id: memberId,
        project_id: projectId,
        user_id: userId,
        role: "admin",
        accepted_at: acceptedAt,
      });
      return getOrCreateProjectConfig(projectId);
    });

    const config = transaction();
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as {
      [key: string]: unknown;
    };

    return NextResponse.json(
      {
        project: {
          ...project,
          platforms: JSON.parse(String(project.platforms)),
        },
        config,
      },
      { status: 201 }
    );
  } catch (error) {
    return asErrorResponse(error);
  }
}
