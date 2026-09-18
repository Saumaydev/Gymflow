"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/overlay";
import { Avatar, GlassButton } from "@/components/ui/primitives";

type Target = { kind: "member" | "trainer"; id: number };

/**
 * Photo picker used during registration and on detail pages. Uploads to Supabase
 * Storage (or the local fallback) and returns the stored URL to the parent form.
 */
export function AvatarUploader({
  name,
  initialUrl,
  scope,
  onUploaded,
  persistTo,
  size = 88,
  label = "Profile photo",
  hint = "JPG, PNG or WEBP up to 5 MB. Press and hold the photo to preview it.",
}: {
  name: string;
  initialUrl?: string | null;
  scope: string;
  onUploaded?: (url: string | null) => void;
  /** When provided, the upload is saved to this member/trainer immediately. */
  persistTo?: Target;
  size?: number;
  label?: string;
  hint?: string;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  async function upload(file: File) {
    setPending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("scope", scope);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Upload failed");

      setUrl(data.url);
      onUploaded?.(data.url);

      if (persistTo) {
        const patch = await fetch(`/api/${persistTo.kind === "member" ? "members" : "trainers"}/${persistTo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "avatar", url: data.url }),
        });
        const result = (await patch.json().catch(() => ({}))) as { error?: string };
        if (!patch.ok) throw new Error(result.error ?? "Could not save the photo");
        router.refresh();
      }

      toast({ title: "Photo updated", message: "Press and hold it anywhere to preview.", tone: "success" });
    } catch (error) {
      toast({ title: "Upload failed", message: (error as Error).message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setUrl(null);
    onUploaded?.(null);
    if (persistTo) {
      await fetch(`/api/${persistTo.kind === "member" ? "members" : "trainers"}/${persistTo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "avatar", url: "" }),
      }).catch(() => undefined);
      router.refresh();
    }
    toast({ title: "Photo removed", tone: "info" });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || "New user"} size={size} src={url} subtitle={label} />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-ghost">{label}</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ghost-muted">{hint}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <GlassButton size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : url ? <Camera size={14} /> : <ImageUp size={14} />}
            {pending ? "Uploading…" : url ? "Replace" : "Upload photo"}
          </GlassButton>
          {url ? (
            <GlassButton size="sm" onClick={remove} disabled={pending}>
              <Trash2 size={14} /> Remove
            </GlassButton>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
