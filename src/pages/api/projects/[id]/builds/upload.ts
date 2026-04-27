import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import multer from "multer";
import { createRouter } from "next-connect";
import {
  getBuildById,
  insertBuild,
} from "@/lib/db";
import { findConflictingBuild } from "@/lib/builds";
import { HttpError, requireRole } from "@/lib/permissions";
import storage from "@/lib/storage";

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".exe", ".apk", ".zip", ".rar", ".app"]);
const EXCLUSIVE_LABELS = new Set(["main", "testing"]);

type UploadRequest = NextApiRequest & {
  file?: Express.Multer.File;
  body: {
    versionName?: string;
    label?: string;
    notes?: string;
  };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, callback) => {
    const ext = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      callback(new Error("Unsupported file type"));
      return;
    }
    callback(null, true);
  },
});

const router = createRouter<UploadRequest, NextApiResponse>();

router.use(upload.single("file"));

router.post(async (req, res) => {
  const userIdHeader = req.headers["x-user-id"];
  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const projectId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!projectId) {
    return res.status(400).json({ error: "Project id is required" });
  }

  try {
    requireRole(projectId, userId, "admin", "developer");
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: "File is required" });
  }

  const versionName = (req.body.versionName || "").trim();
  const label = (req.body.label || "testing").trim().toLowerCase();
  const notes = (req.body.notes || "").trim() || null;

  if (!versionName) {
    return res.status(400).json({ error: "versionName is required" });
  }

  const conflictingBuild = EXCLUSIVE_LABELS.has(label)
    ? findConflictingBuild(projectId, label)
    : null;
  if (conflictingBuild) {
    return res.status(409).json({ error: `A ${label} build already exists` });
  }

  const buildId = randomUUID();
  const stored = await storage.save(req.file.buffer, req.file.originalname, projectId, buildId);

  insertBuild({
    id: buildId,
    project_id: projectId,
    version_name: versionName,
    label,
    upload_type: "file",
    file_path: stored.path,
    external_link: null,
    file_size: stored.size,
    notes,
    created_by: userId,
  });

  const build = getBuildById(buildId);
  return res.status(201).json({ build });
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default router.handler({
  onError(error, _req, res) {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "File exceeds 500MB limit" });
      return;
    }
    res.status(400).json({ error: error.message || "Upload failed" });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  },
});
