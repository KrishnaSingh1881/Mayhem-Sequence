import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export type User = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

export type NewUser = Pick<User, "id" | "email" | "name" | "password_hash">;

export type Project = {
  id: string;
  name: string;
  genre: string;
  platforms: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  owner_id: string;
  created_at: string;
};

export type NewProject = Pick<
  Project,
  "id" | "name" | "genre" | "platforms" | "description" | "cover_image_url" | "status" | "owner_id"
>;

export type ProjectUpdate = Partial<
  Pick<Project, "name" | "genre" | "platforms" | "description" | "cover_image_url" | "status">
>;

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  invited_at: string;
  accepted_at: string | null;
};

export type NewProjectMember = Pick<
  ProjectMember,
  "id" | "project_id" | "user_id" | "role" | "accepted_at"
>;

export type ProjectConfig = {
  id: string;
  project_id: string;
  negative_feedback_threshold: number;
  bug_volume_threshold: number;
  feedback_stale_days: number;
  show_leaderboard: number;
};

export type ProjectConfigUpdate = Partial<
  Pick<
    ProjectConfig,
    | "negative_feedback_threshold"
    | "bug_volume_threshold"
    | "feedback_stale_days"
    | "show_leaderboard"
  >
>;

export type Build = {
  id: string;
  project_id: string;
  version_name: string;
  label: string;
  upload_type: string;
  file_path: string | null;
  external_link: string | null;
  file_size: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type NewBuild = Pick<
  Build,
  | "id"
  | "project_id"
  | "version_name"
  | "label"
  | "upload_type"
  | "file_path"
  | "external_link"
  | "file_size"
  | "notes"
  | "created_by"
>;

export type Issue = {
  id: string;
  project_id: string;
  build_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignee_id: string | null;
  platform_tag: string | null;
  category_tag: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type NewIssue = Pick<
  Issue,
  | "id"
  | "project_id"
  | "build_id"
  | "title"
  | "description"
  | "priority"
  | "status"
  | "assignee_id"
  | "platform_tag"
  | "category_tag"
  | "created_by"
  | "resolved_at"
>;

export type IssueUpdate = Partial<
  Pick<
    Issue,
    "build_id" | "title" | "description" | "priority" | "status" | "assignee_id" | "platform_tag" | "category_tag" | "resolved_at"
  >
>;

export type FeedbackToken = {
  id: string;
  project_id: string;
  build_id: string;
  token: string;
  label: string | null;
  created_by: string;
  created_at: string;
  is_active: number;
};

export type NewFeedbackToken = Pick<
  FeedbackToken,
  "id" | "project_id" | "build_id" | "token" | "label" | "created_by"
>;

export type Feedback = {
  id: string;
  project_id: string;
  build_id: string;
  token_id: string | null;
  submitted_by: string | null;
  rating: number;
  text_enjoy: string | null;
  text_broken: string | null;
  category_tag: string;
  platform_played: string | null;
  sentiment: string;
  source: string;
  created_at: string;
};

export type NewFeedback = Pick<
  Feedback,
  | "id"
  | "project_id"
  | "build_id"
  | "token_id"
  | "submitted_by"
  | "rating"
  | "text_enjoy"
  | "text_broken"
  | "category_tag"
  | "platform_played"
  | "sentiment"
  | "source"
>;

export type Alert = {
  id: string;
  project_id: string;
  type: string;
  message: string;
  build_id: string | null;
  is_read: number;
  created_at: string;
};

export type NewAlert = Pick<Alert, "id" | "project_id" | "type" | "message" | "build_id">;

export type AICache = {
  id: string;
  project_id: string;
  build_id: string | null;
  feature_type: string;
  input_hash: string;
  output_text: string;
  is_stale: number;
  generated_at: string;
};

export type AICacheUpsert = Pick<
  AICache,
  "id" | "project_id" | "build_id" | "feature_type" | "input_hash" | "output_text" | "is_stale"
>;

export type Notification = {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: number;
  created_at: string;
};

export type NewNotification = Pick<
  Notification,
  "id" | "user_id" | "project_id" | "type" | "message" | "entity_type" | "entity_id"
>;

export type RegressionFlag = {
  id: string;
  project_id: string;
  build_id: string;
  open_issue_id: string;
  matched_issue_id: string;
  matched_build_version: string;
  similarity_score: number;
  dismissed: number;
  created_at: string;
};

export type NewRegressionFlag = Pick<
  RegressionFlag,
  | "id"
  | "project_id"
  | "build_id"
  | "open_issue_id"
  | "matched_issue_id"
  | "matched_build_version"
  | "similarity_score"
>;

export type SessionDebrief = {
  id: string;
  project_id: string;
  build_id: string;
  session_label: string | null;
  session_start: string;
  session_end: string;
  feedback_count: number;
  output_text: string;
  created_by: string;
  created_at: string;
};

export type NewSessionDebrief = Pick<
  SessionDebrief,
  | "id"
  | "project_id"
  | "build_id"
  | "session_label"
  | "session_start"
  | "session_end"
  | "feedback_count"
  | "output_text"
  | "created_by"
>;

const dbPath =
  process.env.DB_PATH || path.join(process.cwd(), "data", "mayhem-sequence.db");

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    genre TEXT NOT NULL,
    platforms TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    invited_at TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(project_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS project_invites (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS project_config (
    id TEXT PRIMARY KEY,
    project_id TEXT UNIQUE NOT NULL,
    negative_feedback_threshold INTEGER NOT NULL DEFAULT 10,
    bug_volume_threshold INTEGER NOT NULL DEFAULT 5,
    feedback_stale_days INTEGER NOT NULL DEFAULT 7,
    show_leaderboard INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    version_name TEXT NOT NULL,
    label TEXT NOT NULL,
    upload_type TEXT NOT NULL,
    file_path TEXT,
    external_link TEXT,
    file_size INTEGER,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS promotion_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    build_id TEXT NOT NULL,
    from_label TEXT NOT NULL,
    to_label TEXT NOT NULL,
    previous_build_id TEXT,
    promoted_by TEXT NOT NULL,
    promoted_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (build_id) REFERENCES builds(id),
    FOREIGN KEY (promoted_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    build_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    assignee_id TEXT,
    platform_tag TEXT,
    category_tag TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (build_id) REFERENCES builds(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS issue_comments (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS feedback_tokens (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    build_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    label TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (build_id) REFERENCES builds(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    build_id TEXT NOT NULL,
    token_id TEXT,
    submitted_by TEXT,
    rating INTEGER NOT NULL,
    text_enjoy TEXT,
    text_broken TEXT,
    category_tag TEXT NOT NULL,
    platform_played TEXT,
    sentiment TEXT NOT NULL DEFAULT 'neutral',
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (build_id) REFERENCES builds(id),
    FOREIGN KEY (token_id) REFERENCES feedback_tokens(id),
    FOREIGN KEY (submitted_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS changelogs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    build_id TEXT NOT NULL,
    content TEXT NOT NULL,
    ai_generated INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (build_id) REFERENCES builds(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS ai_cache (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    build_id TEXT,
    feature_type TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    output_text TEXT NOT NULL,
    is_stale INTEGER NOT NULL DEFAULT 0,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    build_id TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS saved_filters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    screen TEXT NOT NULL,
    name TEXT NOT NULL,
    filter_config TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS regression_flags (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    build_id TEXT NOT NULL,
    open_issue_id TEXT NOT NULL,
    matched_issue_id TEXT NOT NULL,
    matched_build_version TEXT NOT NULL,
    similarity_score REAL NOT NULL,
    dismissed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,
    FOREIGN KEY (open_issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_issue_id) REFERENCES issues(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS session_debriefs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    build_id TEXT NOT NULL,
    session_label TEXT,
    session_start TEXT NOT NULL,
    session_end TEXT NOT NULL,
    feedback_count INTEGER NOT NULL,
    output_text TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
] as const;

function ensureDatabaseDirectory(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createDatabase() {
  ensureDatabaseDirectory(dbPath);

  const database = new Database(dbPath);
  database.pragma("foreign_keys = ON");

  for (const statement of schemaStatements) {
    database.prepare(statement).run();
  }

  // Migrations
  try {
    database.prepare("ALTER TABLE project_config ADD COLUMN show_leaderboard INTEGER NOT NULL DEFAULT 1").run();
  } catch (e) {
    // Column already exists
  }

  return database;
}

const globalForDb = globalThis as typeof globalThis & {
  __mayhemSequenceDb__?: Database.Database;
};

export const db = globalForDb.__mayhemSequenceDb__ ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mayhemSequenceDb__ = db;
}

const insertUserStatement = db.prepare(
  `INSERT INTO users (id, email, name, password_hash)
   VALUES (@id, @email, @name, @password_hash)`
);
const getUserByEmailStatement = db.prepare(
  `SELECT * FROM users WHERE email = ?`
);
const getUserByIdStatement = db.prepare(
  `SELECT * FROM users WHERE id = ?`
);

const insertProjectStatement = db.prepare(
  `INSERT INTO projects (
    id, name, genre, platforms, description, cover_image_url, status, owner_id
  ) VALUES (
    @id, @name, @genre, @platforms, @description, @cover_image_url, @status, @owner_id
  )`
);
const getProjectsByUserStatement = db.prepare(
  `SELECT DISTINCT p.*
   FROM projects p
   LEFT JOIN project_members pm ON pm.project_id = p.id
   WHERE p.owner_id = ? OR pm.user_id = ?
   ORDER BY p.created_at DESC`
);
const getProjectByIdStatement = db.prepare(
  `SELECT * FROM projects WHERE id = ?`
);
const deleteProjectStatement = db.prepare(
  `DELETE FROM projects WHERE id = ?`
);

const insertProjectMemberStatement = db.prepare(
  `INSERT INTO project_members (id, project_id, user_id, role, accepted_at)
   VALUES (@id, @project_id, @user_id, @role, @accepted_at)`
);
const getMemberRoleStatement = db.prepare(
  `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`
);
const getProjectMembersStatement = db.prepare(
  `SELECT * FROM project_members WHERE project_id = ? ORDER BY invited_at ASC`
);

const insertBuildStatement = db.prepare(
  `INSERT INTO builds (
    id, project_id, version_name, label, upload_type, file_path, external_link, file_size, notes, created_by
  ) VALUES (
    @id, @project_id, @version_name, @label, @upload_type, @file_path, @external_link, @file_size, @notes, @created_by
  )`
);
const getBuildsForProjectStatement = db.prepare(
  `SELECT * FROM builds WHERE project_id = ? ORDER BY created_at DESC`
);
const getBuildByIdStatement = db.prepare(
  `SELECT * FROM builds WHERE id = ?`
);
const updateBuildLabelStatement = db.prepare(
  `UPDATE builds SET label = ? WHERE id = ?`
);

const insertIssueStatement = db.prepare(
  `INSERT INTO issues (
    id, project_id, build_id, title, description, priority, status, assignee_id, platform_tag, category_tag, created_by, resolved_at
  ) VALUES (
    @id, @project_id, @build_id, @title, @description, @priority, @status, @assignee_id, @platform_tag, @category_tag, @created_by, @resolved_at
  )`
);
const getIssuesForProjectStatement = db.prepare(
  `SELECT * FROM issues WHERE project_id = ? ORDER BY updated_at DESC, created_at DESC`
);
const getIssueByIdStatement = db.prepare(
  `SELECT * FROM issues WHERE id = ?`
);

const insertFeedbackStatement = db.prepare(
  `INSERT INTO feedback (
    id, project_id, build_id, token_id, submitted_by, rating, text_enjoy, text_broken, category_tag, platform_played, sentiment, source
  ) VALUES (
    @id, @project_id, @build_id, @token_id, @submitted_by, @rating, @text_enjoy, @text_broken, @category_tag, @platform_played, @sentiment, @source
  )`
);
const getFeedbackForBuildStatement = db.prepare(
  `SELECT * FROM feedback WHERE build_id = ? ORDER BY created_at DESC`
);
const getFeedbackForProjectStatement = db.prepare(
  `SELECT * FROM feedback WHERE project_id = ? ORDER BY created_at DESC`
);

const insertFeedbackTokenStatement = db.prepare(
  `INSERT INTO feedback_tokens (id, project_id, build_id, token, label, created_by)
   VALUES (@id, @project_id, @build_id, @token, @label, @created_by)`
);
const getTokenByValueStatement = db.prepare(
  `SELECT * FROM feedback_tokens WHERE token = ?`
);
const deactivateTokenStatement = db.prepare(
  `UPDATE feedback_tokens SET is_active = 0 WHERE token = ?`
);

const insertAlertStatement = db.prepare(
  `INSERT INTO alerts (id, project_id, type, message, build_id)
   VALUES (@id, @project_id, @type, @message, @build_id)`
);
const getAlertsForProjectStatement = db.prepare(
  `SELECT * FROM alerts WHERE project_id = ? ORDER BY created_at DESC`
);
const markAlertReadStatement = db.prepare(
  `UPDATE alerts SET is_read = 1 WHERE id = ?`
);

const getProjectConfigStatement = db.prepare(
  `SELECT * FROM project_config WHERE project_id = ?`
);
const insertProjectConfigStatement = db.prepare(
  `INSERT INTO project_config (
    id, project_id, negative_feedback_threshold, bug_volume_threshold, feedback_stale_days
  ) VALUES (
    @id, @project_id, @negative_feedback_threshold, @bug_volume_threshold, @feedback_stale_days
  )`
);

const getAICacheStatement = db.prepare(
  `SELECT * FROM ai_cache
   WHERE project_id = @project_id
     AND input_hash = @input_hash
     AND feature_type = @feature_type
     AND (
       (@build_id IS NULL AND build_id IS NULL)
       OR build_id = @build_id
     )
   ORDER BY generated_at DESC
   LIMIT 1`
);
const insertAICacheStatement = db.prepare(
  `INSERT INTO ai_cache (
    id, project_id, build_id, feature_type, input_hash, output_text, is_stale
  ) VALUES (
    @id, @project_id, @build_id, @feature_type, @input_hash, @output_text, @is_stale
  )`
);
const updateAICacheStatement = db.prepare(
  `UPDATE ai_cache
   SET output_text = @output_text,
       is_stale = @is_stale,
       generated_at = datetime('now')
   WHERE id = @id`
);
const markAICacheStaleStatement = db.prepare(
  `UPDATE ai_cache
   SET is_stale = 1
   WHERE project_id = @project_id
     AND feature_type = @feature_type
     AND (
       (@build_id IS NULL AND build_id IS NULL)
       OR build_id = @build_id
     )`
);

const insertNotificationStatement = db.prepare(
  `INSERT INTO notifications (
    id, user_id, project_id, type, message, entity_type, entity_id
  ) VALUES (
    @id, @user_id, @project_id, @type, @message, @entity_type, @entity_id
  )`
);
const getNotificationsForUserStatement = db.prepare(
  `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`
);
const markNotificationReadStatement = db.prepare(
  `UPDATE notifications SET is_read = 1 WHERE id = ?`
);

const insertRegressionFlagStatement = db.prepare(
  `INSERT INTO regression_flags (
    id, project_id, build_id, open_issue_id, matched_issue_id, matched_build_version, similarity_score
  ) VALUES (
    @id, @project_id, @build_id, @open_issue_id, @matched_issue_id, @matched_build_version, @similarity_score
  )`
);
const getRegressionFlagsForBuildStatement = db.prepare(
  `SELECT * FROM regression_flags WHERE build_id = ? AND dismissed = 0`
);
const dismissRegressionFlagStatement = db.prepare(
  `UPDATE regression_flags SET dismissed = 1 WHERE id = ?`
);
const deleteRegressionFlagsForIssueStatement = db.prepare(
  `DELETE FROM regression_flags WHERE open_issue_id = ?`
);

function buildUpdateStatement(
  table: string,
  idColumn: string,
  idValue: string,
  values: Record<string, unknown>,
  extraAssignments: string[] = []
) {
  const definedEntries = Object.entries(values).filter(([, value]) => value !== undefined);
  if (definedEntries.length === 0 && extraAssignments.length === 0) {
    return null;
  }

  const assignments = definedEntries.map(([key]) => `${key} = @${key}`);
  const sql = `UPDATE ${table} SET ${[...assignments, ...extraAssignments].join(", ")} WHERE ${idColumn} = @__id`;

  return {
    sql,
    params: Object.fromEntries([...definedEntries, ["__id", idValue]]),
  };
}

export function insertUser(input: NewUser) {
  return insertUserStatement.run(input);
}

export function getUserByEmail(email: string) {
  return getUserByEmailStatement.get(email) as User | undefined;
}

export function getUserById(id: string) {
  return getUserByIdStatement.get(id) as User | undefined;
}

export function insertProject(input: NewProject) {
  return insertProjectStatement.run(input);
}

export function getProjectsByUser(userId: string) {
  return getProjectsByUserStatement.all(userId, userId) as Project[];
}

export function getProjectById(id: string) {
  return getProjectByIdStatement.get(id) as Project | undefined;
}

export function updateProject(id: string, updates: ProjectUpdate) {
  const statement = buildUpdateStatement("projects", "id", id, updates);
  if (!statement) {
    return { changes: 0, lastInsertRowid: BigInt(0) };
  }

  return db.prepare(statement.sql).run(statement.params);
}

export function deleteProject(id: string) {
  return deleteProjectStatement.run(id);
}

export function insertProjectMember(input: NewProjectMember) {
  return insertProjectMemberStatement.run(input);
}

export function getMemberRole(projectId: string, userId: string) {
  const row = getMemberRoleStatement.get(projectId, userId) as { role: string } | undefined;
  return row?.role;
}

export function getProjectMembers(projectId: string) {
  return getProjectMembersStatement.all(projectId) as ProjectMember[];
}

export function insertBuild(input: NewBuild) {
  return insertBuildStatement.run(input);
}

export function getBuildsForProject(projectId: string) {
  return getBuildsForProjectStatement.all(projectId) as Build[];
}

export function getBuildById(id: string) {
  return getBuildByIdStatement.get(id) as Build | undefined;
}

export function updateBuildLabel(id: string, label: string) {
  return updateBuildLabelStatement.run(label, id);
}

export function insertIssue(input: NewIssue) {
  return insertIssueStatement.run(input);
}

export function getIssuesForProject(projectId: string) {
  return getIssuesForProjectStatement.all(projectId) as Issue[];
}

export function getIssueById(id: string) {
  return getIssueByIdStatement.get(id) as Issue | undefined;
}

export function updateIssue(id: string, updates: IssueUpdate) {
  const statement = buildUpdateStatement(
    "issues",
    "id",
    id,
    updates,
    [`updated_at = datetime('now')`]
  );
  if (!statement) {
    return { changes: 0, lastInsertRowid: BigInt(0) };
  }

  return db.prepare(statement.sql).run(statement.params);
}

export function insertFeedback(input: NewFeedback) {
  return insertFeedbackStatement.run(input);
}

export function getFeedbackForBuild(buildId: string) {
  return getFeedbackForBuildStatement.all(buildId) as Feedback[];
}

export function getFeedbackForProject(projectId: string) {
  return getFeedbackForProjectStatement.all(projectId) as Feedback[];
}

export function insertFeedbackToken(input: NewFeedbackToken) {
  return insertFeedbackTokenStatement.run(input);
}

export function getTokenByValue(token: string) {
  return getTokenByValueStatement.get(token) as FeedbackToken | undefined;
}

export function deactivateToken(token: string) {
  return deactivateTokenStatement.run(token);
}

export function insertAlert(input: NewAlert) {
  return insertAlertStatement.run(input);
}

export function getAlertsForProject(projectId: string) {
  return getAlertsForProjectStatement.all(projectId) as Alert[];
}

export function markAlertRead(id: string) {
  return markAlertReadStatement.run(id);
}

export function getOrCreateProjectConfig(projectId: string, id = `cfg_${projectId}`) {
  const existing = getProjectConfigStatement.get(projectId) as ProjectConfig | undefined;
  if (existing) {
    return existing;
  }

  insertProjectConfigStatement.run({
    id,
    project_id: projectId,
    negative_feedback_threshold: 10,
    bug_volume_threshold: 5,
    feedback_stale_days: 7,
  });

  return getProjectConfigStatement.get(projectId) as ProjectConfig;
}

export function updateProjectConfig(projectId: string, updates: ProjectConfigUpdate) {
  getOrCreateProjectConfig(projectId);

  const statement = buildUpdateStatement("project_config", "project_id", projectId, updates);
  if (!statement) {
    return { changes: 0, lastInsertRowid: BigInt(0) };
  }

  return db.prepare(statement.sql).run(statement.params);
}

export function upsertAICache(input: AICacheUpsert) {
  const existing = getAICacheStatement.get({
    project_id: input.project_id,
    build_id: input.build_id,
    feature_type: input.feature_type,
    input_hash: input.input_hash,
  }) as AICache | undefined;

  if (existing) {
    updateAICacheStatement.run({
      id: existing.id,
      output_text: input.output_text,
      is_stale: input.is_stale,
    });
    return getAICacheStatement.get({
      project_id: input.project_id,
      build_id: input.build_id,
      feature_type: input.feature_type,
      input_hash: input.input_hash,
    }) as AICache;
  }

  insertAICacheStatement.run(input);
  return getAICacheStatement.get({
    project_id: input.project_id,
    build_id: input.build_id,
    feature_type: input.feature_type,
    input_hash: input.input_hash,
  }) as AICache;
}

export function getAICache(projectId: string, featureType: string, inputHash: string, buildId?: string | null) {
  return getAICacheStatement.get({
    project_id: projectId,
    build_id: buildId ?? null,
    feature_type: featureType,
    input_hash: inputHash,
  }) as AICache | undefined;
}

export function markAICacheStale(projectId: string, featureType: string, buildId?: string | null) {
  return markAICacheStaleStatement.run({
    project_id: projectId,
    build_id: buildId ?? null,
    feature_type: featureType,
  });
}

export function insertNotification(input: NewNotification) {
  return insertNotificationStatement.run(input);
}

export function getNotificationsForUser(userId: string) {
  return getNotificationsForUserStatement.all(userId) as Notification[];
}

export function markNotificationRead(id: string) {
  return markNotificationReadStatement.run(id);
}

export function insertRegressionFlag(input: NewRegressionFlag) {
  return insertRegressionFlagStatement.run(input);
}

export function getRegressionFlagsForBuild(buildId: string) {
  return getRegressionFlagsForBuildStatement.all(buildId) as RegressionFlag[];
}

export function dismissRegressionFlag(id: string) {
  return dismissRegressionFlagStatement.run(id);
}

export function deleteRegressionFlagsForIssue(issueId: string) {
  return deleteRegressionFlagsForIssueStatement.run(issueId);
}

export function getRegressionFlagsByProjectId(projectId: string) {
  return db.prepare(`SELECT * FROM regression_flags WHERE project_id = ? AND dismissed = 0`).all(projectId) as RegressionFlag[];
}

export function insertSessionDebrief(input: NewSessionDebrief) {
  return db.prepare(`
    INSERT INTO session_debriefs (
      id, project_id, build_id, session_label, session_start, session_end, feedback_count, output_text, created_by
    ) VALUES (
      @id, @project_id, @build_id, @session_label, @session_start, @session_end, @feedback_count, @output_text, @created_by
    )
  `).run(input);
}

export function getSessionDebriefsForProject(projectId: string) {
  return db.prepare(`
    SELECT sd.*, u.name as creator_name, b.version_name
    FROM session_debriefs sd
    JOIN users u ON u.id = sd.created_by
    JOIN builds b ON b.id = sd.build_id
    WHERE sd.project_id = ?
    ORDER BY sd.created_at DESC
  `).all(projectId) as (SessionDebrief & { creator_name: string; version_name: string })[];
}

export function getLeaderboardStats(projectId: string) {
  return db.prepare(`
    SELECT 
      u.id as user_id,
      u.name,
      pm.role,
      (SELECT COUNT(*) FROM issues WHERE created_by = u.id AND project_id = ?) as issues_filed,
      (SELECT COUNT(*) FROM issues WHERE assignee_id = u.id AND status = 'resolved' AND project_id = ?) as issues_resolved,
      (SELECT COUNT(*) FROM feedback WHERE submitted_by = u.id AND project_id = ?) as feedback_submitted,
      (SELECT COUNT(*) FROM issue_comments ic JOIN issues i ON i.id = ic.issue_id WHERE ic.author_id = u.id AND i.project_id = ?) as comments_made
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ? AND pm.role != 'player'
  `).all(projectId, projectId, projectId, projectId, projectId) as {
    user_id: string;
    name: string;
    role: string;
    issues_filed: number;
    issues_resolved: number;
    feedback_submitted: number;
    comments_made: number;
  }[];
}
