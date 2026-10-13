export const TOP_PRODUCTS = 8;

export const STATUS = {
  ok: {
    emoji: "🟢",
    label: "Bénéfice",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  warn: {
    emoji: "🟠",
    label: "Perte légère",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  bad: {
    emoji: "🔴",
    label: "Alarme",
    cls: "border-destructive/30 bg-destructive/10 text-red-700 dark:text-red-400",
  },
} as const;
