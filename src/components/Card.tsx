import { cn } from "@/lib/utils";
import type { ReactNode, ComponentPropsWithoutRef } from "react";

export const VARIANT = {
  DEFAULT: "default",
  PRIMARY: "primary",
  SOFT: "soft",
  OUTLINED: "outlined",
  INTERACTIVE: "interactive",
} as const;

export type Variant = (typeof VARIANT)[keyof typeof VARIANT];

export type CardProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function Card({ variant = "default", children, className, onClick, ...rest }: CardProps & ComponentPropsWithoutRef<"div">) {
  const isInteractive = variant === "interactive" || Boolean(onClick);
  return (
    <div
      {...rest}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) onClick?.();
      }}
      className={cn(
        "rounded-[24px] overflow-hidden transition-all duration-200",
        "shadow-[0_2px_12px_rgba(0,0,0,0.05)]",
        "p-[20px] w-full",
        variant === "primary" && "bg-[#009B63] text-white shadow-none",
        variant === "soft" && "bg-[#E7F5EF]",
        variant === "outlined" && "bg-white border border-[#E5E8E7] shadow-none",
        isInteractive && "hover:-translate-y-px active:translate-y-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#009B63]/50",
        className,
      )}
      style={{
        // Tokens CSS centralisés
        borderRadius: "var(--card-radius, 24px)",
        padding: "var(--card-padding, 20px)",
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-4 pt-3 border-t border-white/10", className)}>{children}</div>;
}
