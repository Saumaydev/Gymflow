"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  CameraOff,
  Check,
  Expand,
  ImageUp,
  Keyboard,
  QrCode,
  TriangleAlert,
  Zap,
} from "lucide-react";
import jsQR from "jsqr";
import { Modal, toast } from "@/components/ui/overlay";
import { Field, SelectField } from "@/components/ui/form";
import { GlassButton, GlassLink, IconTile, Pill } from "@/components/ui/primitives";
import { formatTime } from "@/lib/format";

export type StationMember = { id: number; name: string; memberCode: string };
export type StationTrainer = { id: number; name: string };

type ScanStatus =
  | "idle"
  | "starting"
  | "live"
  | "blocked"
  | "unsupported";

type DecodeResult = { rawValue: string } | null;

type NativeDetector = {
  detect: (source: CanvasImageSource) => Promise<DecodeResult[] | DecodeResult>;
};

type FeedEntry = { key: string; name: string; code: string; time: string; duplicate?: boolean };

const SAME_CODE_COOLDOWN_MS = 4000;
const SUCCESS_VISIBLE_MS = 2200;

function nativeDetectorCtor(): (new (options: { formats: string[] }) => NativeDetector) | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => NativeDetector }).BarcodeDetector;
  return ctor ?? null;
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Check-in failed");
  return data;
}

function cameraErrorMessage(error: unknown): string {
  const name = (error as { name?: string })?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was blocked. Allow camera access for this site (or open the station in a new tab) and try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No usable camera was found on this device. Use “Scan from image” or type the member code.";
    case "NotReadableError":
    case "AbortError":
      return "The camera is busy in another tab or app. Close other camera apps and try again.";
    default:
      return "The camera could not be started. Use “Scan from image” or type the member code.";
  }
}


/** Decodes any rasterised image to a drawable source (Safari < 15 has no createImageBitmap). */
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (bitmap) return bitmap;
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/* ================================================================== */
/* Instant QR scanner                                                 */
/* ================================================================== */

export function CheckinStationView({
  members,
  trainers,
  title = "Check-in station",
  subtitle = "Point a member pass at the camera — attendance is marked the moment the code is read.",
  compact = false,
  backHref = "/admin/attendance",
  onRequestClose,
}: {
  members: StationMember[];
  trainers: StationTrainer[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
  backHref?: string;
  onRequestClose?: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<NativeDetector | null>(null);
  const decoderKindRef = useRef<"native" | "jsqr" | "none">("none");
  const pausedRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const busyRef = useRef(false);
  const keyBufferRef = useRef("");
  const keyTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [engineLabel, setEngineLabel] = useState("idle");
  const [success, setSuccess] = useState<FeedEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [manualCode, setManualCode] = useState("GM1024");
  const successTimerRef = useRef<number | null>(null);

  const rosterMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 400),
    [members],
  );

  const clearTimers = useCallback(() => {
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    successTimerRef.current = null;
    if (keyTimerRef.current) window.clearTimeout(keyTimerRef.current);
    keyTimerRef.current = null;
  }, []);

  const flashSuccess = useCallback(
    (entry: FeedEntry) => {
      setSuccess(entry);
      setError(null);
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
      successTimerRef.current = window.setTimeout(() => {
        setSuccess(null);
        pausedRef.current = false;
      }, SUCCESS_VISIBLE_MS);
    },
    [],
  );

  /* ---------------- instant check-in (no button press) ---------------- */

  const submit = useCallback(
    async (raw: string, options: { silentDuplicate?: boolean } = {}) => {
      const value = raw.trim();
      if (!value || busyRef.current) return;
      busyRef.current = true;
      pausedRef.current = true;
      try {
        const result = await postJson<{ name: string; code: string; time: string }>("/api/attendance", {
          mode: "qr",
          code: value,
        });
        const entry: FeedEntry = {
          key: `${result.code}-${Date.now()}`,
          name: result.name,
          code: result.code,
          time: result.time,
        };
        setFeed((prev) => [entry, ...prev].slice(0, 8));
        flashSuccess(entry);
        toast({ title: `${result.name} checked in`, message: `${result.code} · attendance marked instantly`, tone: "success" });
        router.refresh();
      } catch (err) {
        const message = (err as Error).message;
        const isDuplicate = /already checked in/i.test(message);
        if (isDuplicate) {
          const code = value.includes(":") ? value.split(":").pop() ?? value : value;
          setSuccess({
            key: `dupe-${Date.now()}`,
            name: "Already checked in today",
            code: code.toUpperCase(),
            time: new Date().toISOString(),
            duplicate: true,
          });
          if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
          successTimerRef.current = window.setTimeout(() => {
            setSuccess(null);
            pausedRef.current = false;
          }, SUCCESS_VISIBLE_MS);
          if (!options.silentDuplicate) {
            toast({ title: "Already checked in today", message: "The pass was scanned twice.", tone: "info" });
          }
        } else {
          setError(message);
          window.setTimeout(() => setError(null), 4200);
          pausedRef.current = false;
          toast({ title: "Check-in failed", message, tone: "error" });
        }
      } finally {
        busyRef.current = false;
      }
    },
    [flashSuccess, router],
  );

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  /* ---------------- decoding ---------------- */

  const decodeFrame = useCallback(async (video: HTMLVideoElement): Promise<string | null> => {
    if (video.readyState < 2 || !video.videoWidth) return null;
    const detector = detectorRef.current;
    if (detector) {
      try {
        const found = await detector.detect(video);
        const list = Array.isArray(found) ? found : found ? [found] : [];
        return list.length ? (list[0] as { rawValue: string }).rawValue : null;
      } catch {
        return null;
      }
    }
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(2, Math.floor(video.videoWidth * scale));
    canvas.height = Math.max(2, Math.floor(video.videoHeight * scale));
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
    return result?.data ?? null;
  }, []);

  const handleDecoded = useCallback(
    (raw: string | null) => {
      if (!raw) return;
      const normalised = raw.trim().toUpperCase();
      const now = Date.now();
      if (lastScanRef.current.code === normalised && now - lastScanRef.current.at < SAME_CODE_COOLDOWN_MS) return;
      lastScanRef.current = { code: normalised, at: now };
      void submitRef.current(raw);
    },
    [],
  );

  /* ---------------- camera lifecycle ---------------- */

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    pausedRef.current = false;
    setStatus((prev) => (prev === "live" ? "idle" : prev));
  }, []);

  const attachStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;
    streamRef.current = stream;
    video.srcObject = stream;
    video.muted = true;
    video.setAttribute("playsinline", "true");
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) {
        resolve();
        return;
      }
      const done = () => resolve();
      video.addEventListener("loadedmetadata", done, { once: true });
      window.setTimeout(done, 1500);
    });
    try {
      await video.play();
    } catch {
      /* autoplay rejection is non-fatal — frames still decode once playing */
    }
    setStatus("live");
  }, []);

  const startCamera = useCallback(async () => {
    setDiagnostic(null);
    if (typeof window === "undefined") return;
    if (!window.isSecureContext) {
      setStatus("unsupported");
      setDiagnostic("Camera access needs a secure (https) origin. Open the station in a new tab over https and try again.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setDiagnostic("This browser does not expose a camera API. Use “Scan from image” or type the member code.");
      return;
    }
    setStatus("starting");
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (first) {
        if ((first as { name?: string }).name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw first;
        }
      }
      await attachStream(stream);
    } catch (err) {
      setStatus("blocked");
      setDiagnostic(cameraErrorMessage(err));
    }
  }, [attachStream]);

  /* Safety net: some browsers refuse the initial autoplay until the first interaction. */
  useEffect(() => {
    if (status !== "live") return;
    const kick = () => {
      const video = videoRef.current;
      if (video?.paused) void video.play().catch(() => undefined);
    };
    kick();
    document.addEventListener("pointerdown", kick);
    document.addEventListener("keydown", kick);
    return () => {
      document.removeEventListener("pointerdown", kick);
      document.removeEventListener("keydown", kick);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "live") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch(() => undefined);
    }
    const interval = window.setInterval(async () => {
      const element = videoRef.current;
      if (!element || pausedRef.current || busyRef.current || document.visibilityState !== "visible") return;
      const decoded = await decodeFrame(element).catch(() => null);
      handleDecoded(decoded);
    }, 320);
    return () => window.clearInterval(interval);
  }, [status, decodeFrame, handleDecoded]);

  /* Camera claimed to start but produced no frames (blocked device / no hardware). */
  useEffect(() => {
    if (status !== "live") return;
    const handle = window.setTimeout(() => {
      const video = videoRef.current;
      if (video && video.videoWidth === 0) {
        setDiagnostic(
          "The camera stream started but no video frames arrived. This usually means no camera is attached to this device, or the embedded preview blocks it.",
        );
      }
    }, 2500);
    return () => window.clearTimeout(handle);
  }, [status]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    clearTimers();
  }, [clearTimers]);

  /* ---------------- decoder probe on open ---------------- */

  useEffect(() => {
    const Driver = nativeDetectorCtor();
    if (Driver) {
      detectorRef.current = new Driver({ formats: ["qr_code"] });
      decoderKindRef.current = "native";
      setEngineLabel("native decoder");
      void startCamera();
      return;
    }
    detectorRef.current = null;
    decoderKindRef.current = "jsqr";
    setEngineLabel("jsQR engine");
    void startCamera();
  }, [startCamera]);

  /* ---------------- hardware scanners (keyboard wedge) ---------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingElsewhere = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && target.dataset.scanInput !== "true";
      if (typingElsewhere) return;

      if (event.key === "Enter") {
        const buffer = keyBufferRef.current.trim();
        keyBufferRef.current = "";
        if (buffer.length >= 4) {
          event.preventDefault();
          void submitRef.current(buffer);
        }
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        keyBufferRef.current += event.key;
        if (keyTimerRef.current) window.clearTimeout(keyTimerRef.current);
        keyTimerRef.current = window.setTimeout(() => {
          const buffer = keyBufferRef.current.trim();
          keyBufferRef.current = "";
          // Wedge scanners without a trailing Enter: mark as soon as the code looks complete.
          if (buffer.length >= 8) void submitRef.current(buffer);
        }, 160);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- decode from an uploaded image ---------------- */

  const handleImage = useCallback(
    async (file: File) => {
      setError(null);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      const source = await loadImage(file);
      if (!source) {
        setError("That image could not be read. Try a clearer screenshot of the QR pass.");
        return;
      }
      const scale = Math.min(1, 900 / Math.max(source.width, source.height));
      canvas.width = Math.max(2, Math.floor(source.width * scale));
      canvas.height = Math.max(2, Math.floor(source.height * scale));
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
      if (!result) {
        setError("No QR code found in that image. Make sure the pass fills most of the frame.");
        return;
      }
      await submitRef.current(result.data);
    },
    [],
  );

  const live = status === "live";

  return (
    <div className={compact ? "space-y-5" : "space-y-5"}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {title ? <h2 className="text-[18px] font-semibold tracking-tight text-ghost">{title}</h2> : null}
          <p className="mt-1 max-w-xl text-[12.5px] text-ghost-dim">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={live ? "positive" : status === "blocked" || status === "unsupported" ? "danger" : "neutral"}>
            <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-accent-green" : "bg-ghost-muted"}`} />
            {live ? "Scanner live" : status === "starting" ? "Starting camera…" : "Camera off"}
          </Pill>
          <Pill tone="info">
            <Zap size={11} /> Instant marking
          </Pill>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* Scanner surface */}
        <div className="space-y-4">
          <div className="relative flex h-[300px] flex-col items-center justify-center gap-3 overflow-hidden rounded-hero border border-accent-cyan/25 bg-black/60 sm:h-[340px]">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${live ? "opacity-100" : "opacity-0"}`}
            />

            {/* Frame guides */}
            <span className="pointer-events-none absolute inset-6 rounded-card border border-dashed border-accent-cyan/30" aria-hidden="true" />
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-card border border-accent-cyan/50" aria-hidden="true" />
            {live ? (
              <span className="pointer-events-none absolute left-1/2 h-[2px] w-40 -translate-x-1/2 animate-[float-slow_2.6s_ease-in-out_infinite] rounded-pill bg-accent-cyan/80" style={{ top: "38%" }} aria-hidden="true" />
            ) : null}

            {!live ? (
              <div className="relative flex flex-col items-center gap-3 px-6 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-cyan/12 text-accent-cyan">
                  {status === "starting" ? <Camera size={40} strokeWidth={1.2} /> : <QrCode size={40} strokeWidth={1.2} />}
                </span>
                <p className="max-w-[280px] text-[12.5px] text-ghost-dim">
                  {status === "starting"
                    ? "Requesting camera access…"
                    : "Scanner off. Start the camera, or upload a screenshot of the member pass."}
                </p>
              </div>
            ) : null}

            {/* Instant success overlay */}
            {success ? (
              <div
                className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center backdrop-blur-sm ${
                  success.duplicate ? "bg-black/70" : "bg-[#0f1014]/78"
                }`}
                role="status"
                aria-live="assertive"
              >
                <span
                  className={`flex h-20 w-20 items-center justify-center rounded-full text-[34px] font-semibold text-pastel-ink ${
                    success.duplicate ? "bg-pastel-cream" : "animate-[pulse-ring_1.6s_ease-out_infinite] bg-accent-green"
                  }`}
                >
                  {success.duplicate ? <TriangleAlert size={30} /> : <Check size={34} />}
                </span>
                <p className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${success.duplicate ? "text-pastel-cream" : "text-accent-green"}`}>
                  {success.duplicate ? "Already marked today" : "Attendance marked"}
                </p>
                <p className="text-[24px] font-semibold leading-tight text-ghost">{success.name}</p>
                <p className="gf-num text-[13px] text-ghost-dim">
                  {formatTime(success.time)} · {success.code}
                </p>
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {live ? (
              <GlassButton onClick={stopCamera}>
                <CameraOff size={15} /> Stop camera
              </GlassButton>
            ) : (
              <GlassButton variant="pastel" onClick={startCamera} disabled={status === "starting"}>
                <Camera size={15} /> {status === "starting" ? "Starting…" : "Start camera"}
              </GlassButton>
            )}

            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[13px] font-semibold text-ghost transition hover:bg-white/10">
              <ImageUp size={15} /> Scan from image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImage(file);
                  event.target.value = "";
                }}
              />
            </label>

            {onRequestClose ? (
              <GlassButton onClick={onRequestClose}>Done</GlassButton>
            ) : (
              <GlassLink href={backHref} variant="ghost">
                Back to attendance
              </GlassLink>
            )}
          </div>

          {diagnostic ? (
            <p className="flex items-start gap-2.5 rounded-control border border-white/8 bg-white/5 px-4 py-3 text-[12px] leading-relaxed text-ghost-dim" role="alert">
              <TriangleAlert size={14} className="mt-0.5 shrink-0 text-pastel-cream" />
              <span>
                {diagnostic}{" "}
                <Link href="/admin/attendance/station" className="font-semibold text-ghost underline decoration-white/25">
                  Open full-screen station
                </Link>{" "}
                if the embedded frame blocks the camera.
              </span>
            </p>
          ) : null}

          {error ? (
            <p className="rounded-control bg-pastel-blush/90 px-4 py-3 text-[12.5px] font-semibold text-pastel-ink" role="alert">
              {error}
            </p>
          ) : null}

          <p className="text-[11.5px] leading-relaxed text-ghost-muted">
            Decoding with {engineLabel} · USB/wedge scanners and app check-ins also work — no confirmation click is ever
            required.
          </p>
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        </div>

        {/* Live feed + manual fallback */}
        <div className="space-y-4">
          <div className="rounded-card border border-white/8 bg-white/4 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-ghost">Marked in this session</p>
              <Pill tone="neutral">{feed.length}</Pill>
            </div>
            <ul className="mt-4 space-y-2.5">
              {feed.map((entry) => (
                <li key={entry.key} className="flex items-center gap-3">
                  <IconTile accent="sage" size="sm">
                    <Check size={14} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ghost">{entry.name}</p>
                    <p className="text-[11px] text-ghost-muted">
                      {entry.code} · {formatTime(entry.time)}
                    </p>
                  </div>
                  <Pill tone="positive">In</Pill>
                </li>
              ))}
              {!feed.length ? (
                <li className="text-[12px] text-ghost-muted">Scans appear here the instant they are decoded.</li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-card border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2">
              <IconTile accent="lavender" size="sm">
                <Keyboard size={14} />
              </IconTile>
              <p className="text-[13px] font-semibold text-ghost">Manual fallback</p>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ghost-muted">
              Type a member code and press Enter — attendance is marked immediately, exactly like a scan.
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                await submit(manualCode);
              }}
            >
              <Field label="Member code">
                <input
                  data-scan-input="true"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="GM1024"
                  autoComplete="off"
                  className="h-[52px] w-full rounded-control border border-white/8 bg-white/5 px-4 text-[14px] uppercase tracking-[0.08em] text-ghost placeholder:text-ghost-muted focus:border-accent-blue/60 focus:outline-none"
                />
              </Field>
              <button type="submit" className="h-11 w-full rounded-pill bg-ghost text-[13px] font-semibold text-pastel-ink">
                Mark attendance
              </button>
            </form>
          </div>

          <div className="rounded-card border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2">
              <IconTile accent="cyan" size="sm">
                <QrCode size={14} />
              </IconTile>
              <p className="text-[13px] font-semibold text-ghost">Roster override</p>
            </div>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const target = String(form.get("target") ?? "member").split(":");
                try {
                  const result = await postJson<{ name: string }>("/api/attendance", {
                    mode: "manual",
                    memberId: target[0] === "member" ? Number(target[1]) : 0,
                    trainerId: target[0] === "trainer" ? Number(target[1]) : 0,
                    status: form.get("status"),
                    method: "MANUAL",
                  });
                  const entry: FeedEntry = {
                    key: `manual-${Date.now()}`,
                    name: result.name,
                    code: target[0] === "trainer" ? "STAFF" : "MANUAL",
                    time: new Date().toISOString(),
                  };
                  setFeed((prev) => [entry, ...prev].slice(0, 8));
                  flashSuccess(entry);
                  toast({ title: `${result.name} marked present`, tone: "success" });
                  router.refresh();
                } catch (err) {
                  setError((err as Error).message);
                  toast({ title: "Could not mark attendance", message: (err as Error).message, tone: "error" });
                }
              }}
            >
              <Field label="Member or coach">
                <select name="target" className="h-[52px] w-full rounded-control border border-white/8 bg-white/5 px-4 text-[14px] text-ghost">
                  <optgroup label="Members" className="bg-panel">
                    {rosterMembers.map((member) => (
                      <option key={member.id} value={`member:${member.id}`} className="bg-panel">
                        {member.name} · {member.memberCode}
                      </option>
                    ))}
                  </optgroup>
                  {trainers.length ? (
                    <optgroup label="Coaching staff" className="bg-panel">
                      {trainers.map((trainer) => (
                        <option key={trainer.id} value={`trainer:${trainer.id}`} className="bg-panel">
                          {trainer.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </Field>
              <SelectField
                label="Status"
                name="status"
                defaultValue="PRESENT"
                options={[
                  { value: "PRESENT", label: "Present" },
                  { value: "LATE", label: "Late" },
                  { value: "ABSENT", label: "Absent" },
                ]}
              />
              <button type="submit" className="h-11 w-full rounded-pill border border-white/8 bg-white/5 text-[13px] font-semibold text-ghost hover:bg-white/10">
                Save entry
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ================================================================== */
/* Modal trigger used across admin + trainer surfaces                  */
/* ================================================================== */

export function CheckinStation({
  members,
  trainers,
  autoOpen = false,
  label = "Mark attendance",
  fullScreenHref = "/admin/attendance/station",
}: {
  members: StationMember[];
  trainers: StationTrainer[];
  autoOpen?: boolean;
  label?: string;
  fullScreenHref?: string;
}) {
  const params = useSearchParams();
  const wantsOpen = autoOpen || params.get("mark") === "1";
  const [open, setOpen] = useState(wantsOpen);
  const [lastWantsOpen, setLastWantsOpen] = useState(wantsOpen);

  // Opening from a deep link (?mark=1) during render — no effect needed.
  if (wantsOpen !== lastWantsOpen) {
    setLastWantsOpen(wantsOpen);
    if (wantsOpen) setOpen(true);
  }

  return (
    <>
      <GlassButton variant="primary" onClick={() => setOpen(true)}>
        <QrCode size={16} /> {label}
      </GlassButton>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Check-in station"
        subtitle="Scan a pass — attendance is recorded instantly, no confirmation needed"
        width="max-w-4xl"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] text-ghost-muted">
            Tip: for the entrance tablet, use the full-screen station — it keeps the camera running continuously.
          </p>
          <a
            href={fullScreenHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[12px] font-semibold text-ghost-dim hover:bg-white/10"
          >
            <Expand size={14} /> Full-screen station
          </a>
        </div>
        <CheckinStationView
          members={members}
          trainers={trainers}
          title=""
          subtitle=""
          compact
          onRequestClose={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
