/* ── Carte d'entrée de l'écran de bienvenue ──────────────────────────────── */
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WelcomeCard({
  tone,
  icon,
  role,
  title,
  description,
  onClick,
}: {
  tone: "primary" | "neutral";
  icon: ReactNode;
  role: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const primary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors transition-shadow transition-transform hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          primary ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {role && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                primary ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {role}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
