import { cn } from "@/lib/utils";

/** Bloc de chargement : la forme de ce qui va arriver, l'état transparent. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-busy="true"
      {...props}
    />
  );
}

export { Skeleton };
