import { NextRequest } from "next/server";
import { getMemberRole, getProjectById } from "./db";
import { logToFile } from "./logger";
import { verifyToken } from "./auth";

export type ProjectRole = "admin" | "developer" | "qa" | "player";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Extract userId from a cookie header string.
 * Returns null if no valid ms_token cookie is found.
 */
async function userIdFromCookieHeader(cookieHeader: string | null): Promise<string | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)ms_token=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * Reliable user ID extraction for Next.js 14 route handlers.
 * 1. Checks x-user-id header injected by middleware (fast path).
 * 2. Falls back to parsing the ms_token cookie directly.
 */
export async function getUserIdFromRequest(request: NextRequest | Request): Promise<string> {
  const headerId = request.headers.get("x-user-id");
  if (headerId) return headerId;

  const cookieHeader = request.headers.get("cookie");
  const userId = await userIdFromCookieHeader(cookieHeader);
  if (userId) return userId;

  logToFile("[PERMISSIONS] getUserIdFromRequest: no x-user-id header and no valid ms_token cookie.");
  throw new HttpError(401, "Unauthorized");
}

/**
 * Synchronous version — only works when middleware header propagation succeeds.
 * Kept for backward compatibility. Prefer getUserIdFromRequest in new code.
 */
export function getUserIdFromHeaders(headers: Headers): string {
  const userId = headers.get("x-user-id");
  if (userId) return userId;
  logToFile("[PERMISSIONS] getUserIdFromHeaders: no x-user-id header found.");
  throw new HttpError(401, "Unauthorized");
}

export function getUserRole(projectId: string, userId: string): ProjectRole | null {
  const project = getProjectById(projectId);
  if (!project) throw new HttpError(404, "Project not found");
  if (project.owner_id === userId) return "admin";
  const memberRole = getMemberRole(projectId, userId);
  return memberRole ? (memberRole as ProjectRole) : null;
}

export function requireRole(
  projectId: string,
  userId: string,
  ...allowedRoles: ProjectRole[]
): ProjectRole {
  const role = getUserRole(projectId, userId);
  if (!role || !allowedRoles.includes(role)) throw new HttpError(403, "Forbidden");
  return role;
}
