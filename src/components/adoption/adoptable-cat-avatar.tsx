import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-10 w-10 min-h-10 min-w-10",
  md: "h-14 w-14 min-h-14 min-w-14",
  lg: "h-16 w-16 min-h-16 min-w-16",
} as const;

const SIZE_PX = {
  sm: 40,
  md: 56,
  lg: 64,
} as const;

interface AdoptableCatAvatarProps {
  src?: string | null;
  alt: string;
  size?: keyof typeof SIZE_CLASS;
  emptyLabel?: string;
  className?: string;
}

/** Fixed-size circular photo so landscape shots stay the same box as placeholders. */
export function AdoptableCatAvatar({
  src,
  alt,
  size = "md",
  emptyLabel = "—",
  className,
}: AdoptableCatAvatarProps) {
  const url = src?.trim() || null;
  return (
    <div
      className={cn(
        "relative aspect-square shrink-0 overflow-hidden rounded-full bg-muted",
        SIZE_CLASS[size],
        className
      )}
    >
      {url ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes={`${SIZE_PX[size]}px`}
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
          {emptyLabel}
        </span>
      )}
    </div>
  );
}
