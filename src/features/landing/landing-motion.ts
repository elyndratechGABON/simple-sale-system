// Apparition commune : montée + fondu quand la section entre dans le viewport.
export const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.55, ease: "easeOut" },
} as const;

// Ombre de diffusion teintée vers le vert du fond (jamais de noir pur).
export const glowShadow =
  "shadow-[0_24px_70px_-28px_rgba(4,41,30,0.35)] hover:shadow-[0_32px_80px_-28px_rgba(5,150,105,0.35)]";
