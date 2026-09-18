import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

/**
 * Serves locally stored uploads when Supabase Storage is not configured.
 * Object names are timestamp + uuid based, so responses cache for a year.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const relative = (key ?? [])
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, ""))
    .filter(Boolean)
    .join("/");
  if (!relative) return new Response("Not found", { status: 404 });

  const absolute = path.resolve(LOCAL_DIR, relative);
  if (!absolute.startsWith(LOCAL_DIR)) return new Response("Not found", { status: 404 });

  try {
    const stat = statSync(absolute);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    const extension = relative.split(".").pop()?.toLowerCase() ?? "jpg";
    const stream = Readable.toWeb(createReadStream(absolute)) as unknown as NodeReadableStream;
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": TYPES[extension] ?? "application/octet-stream",
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
