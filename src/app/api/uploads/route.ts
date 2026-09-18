import { getCurrentUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, storageMode, uploadImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Uploads an avatar (admin/trainer own photo). Admin may upload on behalf of anyone in the gym. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (user.role === "MEMBER") return Response.json({ error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "Images must be 5 MB or smaller." }, { status: 413 });
  }

  const scope = String(form.get("scope") ?? "misc").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
  const folder = `gym-${user.gymId}/${scope}`;

  try {
    const result = await uploadImage(file, folder);
    return Response.json({ ok: true, ...result, storage: storageMode });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
