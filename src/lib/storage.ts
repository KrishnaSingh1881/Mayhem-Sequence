import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { google } from "googleapis";

export interface StorageProvider {
  save(
    file: Buffer,
    filename: string,
    projectId: string,
    buildId: string
  ): Promise<{ path: string; size: number }>;
  getStream(storedPath: string): ReadableStream;
  delete(storedPath: string): Promise<void>;
}

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function sanitizeFilename(filename: string) {
  const extension = path.extname(filename);
  const baseName = path.basename(filename, extension);
  const sanitizedBase = baseName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  const safeBase = sanitizedBase || "upload";
  const safeExt = extension.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 12);
  return `${safeBase}${safeExt}`;
}

export class LocalProvider implements StorageProvider {
  async save(file: Buffer, filename: string, projectId: string, buildId: string) {
    const safeName = sanitizeFilename(filename);
    const targetDir = path.join(UPLOAD_ROOT, projectId, buildId);
    fs.mkdirSync(targetDir, { recursive: true });

    const absolutePath = path.join(targetDir, safeName);
    fs.writeFileSync(absolutePath, file);

    const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
    return { path: relativePath, size: file.length };
  }

  getStream(storedPath: string): ReadableStream {
    const absolutePath = path.join(process.cwd(), storedPath);
    const stream = fs.createReadStream(absolutePath);
    return Readable.toWeb(stream) as ReadableStream;
  }

  async delete(storedPath: string): Promise<void> {
    const absolutePath = path.join(process.cwd(), storedPath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
}

const REQUIRED_GDRIVE_ENV_KEYS = [
  "GDRIVE_CLIENT_ID",
  "GDRIVE_CLIENT_SECRET",
  "GDRIVE_REFRESH_TOKEN",
  "GDRIVE_FOLDER_ID",
] as const;

function hasGDriveEnvVars() {
  return REQUIRED_GDRIVE_ENV_KEYS.every((key) => Boolean(process.env[key]));
}

export class GDriveProvider implements StorageProvider {
  private drive = google.drive("v3");
  private auth = new google.auth.OAuth2(
    process.env.GDRIVE_CLIENT_ID!,
    process.env.GDRIVE_CLIENT_SECRET!
  );

  constructor() {
    this.auth.setCredentials({
      refresh_token: process.env.GDRIVE_REFRESH_TOKEN!,
    });
  }

  async save(file: Buffer, filename: string): Promise<{ path: string; size: number }> {
    const uploaded = await this.drive.files.create({
      auth: this.auth,
      requestBody: {
        name: sanitizeFilename(filename),
        parents: [process.env.GDRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: "application/octet-stream",
        body: Readable.from(file),
      },
      fields: "id",
    });

    if (!uploaded.data.id) {
      throw new Error("Failed to upload file to Google Drive");
    }

    return { path: uploaded.data.id, size: file.length };
  }

  getStream(): ReadableStream {
    throw new Error("Use getDownloadUrl for Google Drive downloads");
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiry = nowSeconds + 60 * 10;

    this.auth.setCredentials({
      refresh_token: process.env.GDRIVE_REFRESH_TOKEN!,
      expiry_date: expiry * 1000,
    });
    const accessToken = await this.auth.getAccessToken();
    if (!accessToken.token) {
      throw new Error("Unable to obtain Google Drive access token");
    }

    return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media&access_token=${encodeURIComponent(accessToken.token)}`;
  }

  async delete(storedPath: string): Promise<void> {
    await this.drive.files.delete({
      auth: this.auth,
      fileId: storedPath,
    });
  }
}

const storage: StorageProvider = hasGDriveEnvVars()
  ? new GDriveProvider()
  : new LocalProvider();

export default storage;
