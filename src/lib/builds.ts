import { db } from "@/lib/db";

export const UNIQUE_BUILD_LABELS = new Set(["main", "testing"]);
export const ALL_BUILD_LABELS = new Set(["main", "testing", "experimental", "archived"]);

export function findConflictingBuild(projectId: string, label: string, excludeBuildId?: string) {
  if (!UNIQUE_BUILD_LABELS.has(label)) {
    return null;
  }

  if (excludeBuildId) {
    return db
      .prepare(
        "SELECT * FROM builds WHERE project_id = ? AND label = ? AND id != ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(projectId, label, excludeBuildId);
  }

  return db
    .prepare("SELECT * FROM builds WHERE project_id = ? AND label = ? ORDER BY created_at DESC LIMIT 1")
    .get(projectId, label);
}
