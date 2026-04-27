import { db, insertRegressionFlag, deleteRegressionFlagsForIssue, Issue, Build } from "./db";
import { v4 as uuidv4 } from "uuid";
import { calculateSimilarity } from "./utils";

export type RegressionFlagResult = {
  open_issue_id: string;
  open_issue_title: string;
  matched_resolved_issue_id: string;
  matched_resolved_title: string;
  resolved_in_build_version: string;
  similarity_score: number;
};

/**
 * Checks all open issues for a given build against all resolved issues in the project.
 */
export async function checkRegressions(newBuildId: string): Promise<RegressionFlagResult[]> {
  const build = db.prepare("SELECT * FROM builds WHERE id = ?").get(newBuildId) as Build | undefined;
  if (!build) return [];

  const projectId = build.project_id;

  // Open issues for this build
  const openIssues = db.prepare("SELECT * FROM issues WHERE build_id = ? AND status != 'resolved'").all(newBuildId) as Issue[];
  
  // Resolved issues for this project across all builds
  const resolvedIssues = db.prepare(`
    SELECT i.*, b.version_name as build_version 
    FROM issues i
    JOIN builds b ON i.build_id = b.id
    WHERE i.project_id = ? AND i.status = 'resolved'
  `).all(projectId) as (Issue & { build_version: string })[];

  const results: RegressionFlagResult[] = [];

  for (const openIssue of openIssues) {
    const issueResults = compareIssueAgainstResolved(openIssue, resolvedIssues, projectId, newBuildId);
    results.push(...issueResults);
  }

  return results;
}

/**
 * Checks a single issue against all resolved issues in the project.
 */
export async function checkRegressionsForIssue(issueId: string): Promise<RegressionFlagResult[]> {
  const openIssue = db.prepare("SELECT * FROM issues WHERE id = ?").get(issueId) as Issue | undefined;
  if (!openIssue || !openIssue.build_id || openIssue.status === "resolved") return [];

  const projectId = openIssue.project_id;

  // Resolved issues for this project across all builds
  const resolvedIssues = db.prepare(`
    SELECT i.*, b.version_name as build_version 
    FROM issues i
    JOIN builds b ON i.build_id = b.id
    WHERE i.project_id = ? AND i.status = 'resolved'
  `).all(projectId) as (Issue & { build_version: string })[];

  return compareIssueAgainstResolved(openIssue, resolvedIssues, projectId, openIssue.build_id);
}

function compareIssueAgainstResolved(
  openIssue: Issue, 
  resolvedIssues: (Issue & { build_version: string })[], 
  projectId: string, 
  buildId: string
): RegressionFlagResult[] {
  const results: RegressionFlagResult[] = [];
  
  // Clear old flags for this issue
  deleteRegressionFlagsForIssue(openIssue.id);

  for (const resolvedIssue of resolvedIssues) {
    // Avoid comparing an issue to itself if it was resolved in a previous build but reopened in this one
    if (openIssue.id === resolvedIssue.id) continue;

    if (openIssue.category_tag === resolvedIssue.category_tag && openIssue.category_tag) {
      const score = calculateSimilarity(openIssue.title, resolvedIssue.title);
      if (score > 0.4) {
        const result = {
          open_issue_id: openIssue.id,
          open_issue_title: openIssue.title,
          matched_resolved_issue_id: resolvedIssue.id,
          matched_resolved_title: resolvedIssue.title,
          resolved_in_build_version: resolvedIssue.build_version,
          similarity_score: score,
        };
        results.push(result);

        insertRegressionFlag({
          id: `reg_${uuidv4()}`,
          project_id: projectId,
          build_id: buildId,
          open_issue_id: openIssue.id,
          matched_issue_id: resolvedIssue.id,
          matched_build_version: resolvedIssue.build_version,
          similarity_score: score,
        });
      }
    }
  }

  return results;
}

