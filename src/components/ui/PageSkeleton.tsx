import { Skeleton } from "@/components/ui/primitives";

export type SkeletonVariant = "dashboard" | "grid" | "list" | "detail" | "form";

/**
 * Route-level loading surface. Rendered instantly on navigation so every panel
 * feels native — content streams in underneath without a blank frame.
 */
export function PageSkeleton({ variant = "list" }: { variant?: SkeletonVariant }) {
  if (variant === "dashboard") {
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-[146px]" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <Skeleton className="h-60 xl:col-span-2" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-11 w-40" />
        </div>
        <Skeleton className="h-24" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <Skeleton key={index} className="h-[212px]" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-56" />
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-10 w-24 rounded-pill" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[320px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-11 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[136px]" />
        ))}
      </div>
      <Skeleton className="h-20" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-[84px]" />
        ))}
      </div>
    </div>
  );
}
