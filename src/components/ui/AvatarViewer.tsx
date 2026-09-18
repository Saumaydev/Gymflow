"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { RotateCcw, X } from "lucide-react";

export type AvatarPreview = {
  src: string;
  name: string;
  subtitle?: string;
};

type ViewerContextValue = {
  open: (preview: AvatarPreview) => void;
};

const AvatarViewerContext = createContext<ViewerContextValue | null>(null);

const HOLD_MS = 170;
const PEEK_RELEASE_MS = 420;
const MAX_SCALE = 5;

export function useAvatarViewer(): ViewerContextValue {
  const context = useContext(AvatarViewerContext);
  return context ?? { open: () => undefined };
}

/**
 * Global press-and-hold avatar preview. Mirrors the Instagram profile-picture gesture:
 * hold to enlarge over a blurred backdrop, pinch / wheel / double-tap to zoom, drag to pan,
 * drag down or tap the backdrop to dismiss.
 */
export function AvatarViewerProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<AvatarPreview | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ratio, setRatio] = useState(0);
  const [dragging, setDragging] = useState(false);

  const openedAtRef = useRef(0);
  const zoomedRef = useRef(false);
  const gestureRef = useRef<{
    mode: "none" | "pan" | "pinch" | "dismiss";
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    startDistance: number;
    startScale: number;
    startCentre: { x: number; y: number };
    startTime: number;
  }>({
    mode: "none",
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    startDistance: 0,
    startScale: 1,
    startCentre: { x: 0, y: 0 },
    startTime: 0,
  });

  const open = useCallback((next: AvatarPreview) => {
    openedAtRef.current = Date.now();
    zoomedRef.current = false;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setPreview(next);
  }, []);

  const close = useCallback(() => {
    setDragging(false);
    setPreview(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    zoomedRef.current = false;
  }, []);

  const clampOffset = useCallback(
    (next: { x: number; y: number }, activeScale: number) => {
      const limit = 140 * activeScale;
      return {
        x: Math.max(-limit, Math.min(limit, next.x)),
        y: Math.max(-limit, Math.min(limit, next.y)),
      };
    },
    [],
  );

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [preview, close]);

  /* Instagram "peek": a quick hold-then-release closes the preview unless you zoomed. */
  useEffect(() => {
    if (!preview) return;
    const onPointerUp = () => {
      const heldFor = Date.now() - openedAtRef.current;
      if (!zoomedRef.current && heldFor < PEEK_RELEASE_MS) close();
    };
    window.addEventListener("pointerup", onPointerUp, { once: true });
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [preview, close]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!preview) return;
    setDragging(true);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    gestureRef.current = {
      mode: "pan",
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
      startDistance: 0,
      startScale: scale,
      startCentre: { x: 0, y: 0 },
      startTime: Date.now(),
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (gesture.mode === "none") return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (gesture.mode === "pan" && scale === 1 && dy > 90 && Math.abs(dy) > Math.abs(dx)) {
      gesture.mode = "dismiss";
    }
    if (gesture.mode === "dismiss") {
      setOffset({ x: 0, y: Math.max(0, dy) });
      return;
    }
    if (gesture.mode === "pan") {
      setOffset(clampOffset({ x: gesture.baseX + dx, y: gesture.baseY + dy }, scale));
    }
  };

  const onPointerUp = () => {
    setDragging(false);
    const gesture = gestureRef.current;
    if (gesture.mode === "dismiss" && offset.y > 140) {
      close();
      gestureRef.current.mode = "none";
      return;
    }
    if (gesture.mode === "dismiss") setOffset({ x: 0, y: 0 });
    gestureRef.current.mode = "none";
  };

  /* Pinch zoom via two pointers (touch) — tracked on the surface. */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());

  const trackPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const handlePinch = () => {
    setDragging(true);
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return;
    const [a, b] = points;
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const gesture = gestureRef.current;
    if (gesture.mode !== "pinch") {
      gestureRef.current = {
        ...gesture,
        mode: "pinch",
        startDistance: distance,
        startScale: scale,
        startCentre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      return;
    }
    const nextScale = Math.max(1, Math.min(MAX_SCALE, gesture.startScale * (distance / Math.max(1, gesture.startDistance))));
    zoomedRef.current = nextScale > 1.02;
    setScale(nextScale);
  };

  const value = useMemo(() => ({ open }), [open]);

  return (
    <AvatarViewerContext.Provider value={value}>
      {children}
      {preview ? (
        <div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/70 backdrop-blur-2xl backdrop-saturate-150"
          role="dialog"
          aria-modal="true"
          aria-label={`${preview.name} profile picture`}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          onDoubleClick={() => {
            zoomedRef.current = scale > 1.02;
            if (scale > 1.02) {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            } else {
              setScale(2.4);
            }
          }}
          onPointerDown={(event) => {
            trackPointer(event);
            if (pointersRef.current.size >= 2) {
              handlePinch();
              return;
            }
            onPointerDown(event);
          }}
          onPointerMove={(event) => {
            trackPointer(event);
            if (pointersRef.current.size >= 2) {
              handlePinch();
              return;
            }
            onPointerMove(event);
          }}
          onPointerUp={(event) => {
            pointersRef.current.delete(event.pointerId);
            onPointerUp();
          }}
          onPointerCancel={(event) => {
            pointersRef.current.delete(event.pointerId);
            gestureRef.current.mode = "none";
          }}
          onWheel={(event) => {
            const next = Math.max(1, Math.min(MAX_SCALE, scale - event.deltaY * 0.0022));
            zoomedRef.current = next > 1.02;
            setScale(next);
            if (next === 1) setOffset({ x: 0, y: 0 });
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-6">
            <div className="pointer-events-none rounded-card border border-white/10 bg-panel/70 px-4 py-2.5 backdrop-blur-xl">
              <p className="text-[14px] font-semibold text-ghost">{preview.name}</p>
              {preview.subtitle ? <p className="text-[11.5px] text-ghost-dim">{preview.subtitle}</p> : null}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setScale(1);
                  setOffset({ x: 0, y: 0 });
                  zoomedRef.current = false;
                }}
                aria-label="Reset zoom"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-panel/70 text-ghost backdrop-blur-xl transition hover:bg-white/15"
              >
                <RotateCcw size={17} />
              </button>
              <button
                onClick={close}
                aria-label="Close preview"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-panel/70 text-ghost backdrop-blur-xl transition hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            className="flex max-h-[76vh] max-w-[92vw] touch-none select-none items-center justify-center overflow-hidden rounded-hero border border-white/12 shadow-lift"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              transition: dragging ? "none" : "transform 220ms cubic-bezier(.22,1,.36,1)",
              willChange: "transform",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.src}
              alt={preview.name}
              draggable={false}
              onLoad={(event) => {
                const image = event.currentTarget;
                setRatio(image.naturalWidth / Math.max(1, image.naturalHeight));
              }}
              className="max-h-[70vh] max-w-[88vw] rounded-hero object-contain"
              style={ratio ? { aspectRatio: ratio, width: ratio >= 1 ? "min(70vh, 88vw)" : "auto" } : undefined}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 p-6 text-center">
            <p className="text-[11.5px] text-ghost-muted">
              Pinch, scroll or double-tap to zoom · drag to move · drag down or tap outside to close
            </p>
          </div>
        </div>
      ) : null}
    </AvatarViewerContext.Provider>
  );
}

/**
 * Wraps any avatar markup with the press-and-hold gesture.
 * Server components can pass their own children through.
 */
export function AvatarTrigger({
  src,
  name,
  subtitle,
  children,
  className = "",
  disabled = false,
}: {
  src: string | null | undefined;
  name: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { open } = useAvatarViewer();
  const timerRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  if (!src || disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={`relative inline-flex cursor-zoom-in select-none ${className}`}
      role="button"
      tabIndex={0}
      aria-label={`View ${name} profile picture`}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        startRef.current = { x: event.clientX, y: event.clientY };
        firedRef.current = false;
        cancel();
        timerRef.current = window.setTimeout(() => {
          firedRef.current = true;
          open({ src, name, subtitle });
        }, HOLD_MS);
      }}
      onPointerMove={(event) => {
        if (timerRef.current && Math.hypot(event.clientX - startRef.current.x, event.clientY - startRef.current.y) > 12) {
          cancel();
        }
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open({ src, name, subtitle });
        }
      }}
    >
      {children}
    </span>
  );
}
