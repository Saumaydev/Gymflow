import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "gymflow";
const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");

export const storageMode: "supabase" | "local" = SUPABASE_URL && SERVICE_KEY ? "supabase" : "local";

export type UploadResult = { url: string; path: string; storage: "supabase" | "local" };

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/avif") return "avif";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export function isAllowedImage(type: string): boolean {
  return ALLOWED.has(type);
}

/**
 * Stores an avatar and returns a publicly readable URL.
 * Uses Supabase Storage when configured, otherwise a local runtime directory that is
 * served through `/api/media/...` so development works with zero cloud setup.
 */
export async function uploadImage(file: File, folder: string): Promise<UploadResult> {
  if (!isAllowedImage(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, AVIF or GIF images are supported.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Images must be 5 MB or smaller.");
  }

  const objectPath = `${folder.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${randomUUID().slice(0, 8)}.${extensionFor(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (storageMode === "supabase") {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": file.type,
        "x-upsert": "true",
        "cache-control": "public, max-age=31536000, immutable",
      },
      body: bytes,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Supabase Storage upload failed (${response.status}). Check the bucket "${BUCKET}" exists and is public. ${detail.slice(0, 160)}`,
      );
    }

    return {
      url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`,
      path: objectPath,
      storage: "supabase",
    };
  }

  const target = path.join(LOCAL_DIR, objectPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return { url: `/api/media/${objectPath}`, path: objectPath, storage: "local" };
}

/** Removes a previously uploaded object; failures are non-fatal. */
export async function deleteImage(objectPath: string | null | undefined): Promise<void> {
  if (!objectPath) return;
  if (storageMode === "supabase") {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    }).catch(() => undefined);
    return;
  }
  const { rm } = await import("node:fs/promises");
  await rm(path.join(LOCAL_DIR, objectPath), { force: true }).catch(() => undefined);
}

/** Extracts the storage path from a stored public URL (used when replacing photos). */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/api/media/")) return url.replace("/api/media/", "");
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export function isManagedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("/api/media/") || url.includes("/storage/v1/object/public/");
}
