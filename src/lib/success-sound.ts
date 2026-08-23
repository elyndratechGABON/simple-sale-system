/**
 * Carillon de fin de vente, synthétisé en Web Audio : deux notes montantes.
 * Aucun fichier à précharger — l'app doit sonner même hors ligne, au premier geste.
 * Le son est un bonus : la moindre erreur (contexte refusé, API absente) est ignorée
 * plutôt que de bloquer l'encaissement.
 */
let ctx: AudioContext | null = null;

export function playSuccessChime(): void {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    // La5 → Mi6 : intervalle majeur, court, distinctif sans être agressif.
    const notes: [freq: number, at: number][] = [
      [880, 0],
      [1318.5, 0.12],
    ];
    for (const [freq, at] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.22, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.55);
    }
  } catch {
    // Silencieux : une caisse muette vaut mieux qu'une vente bloquée.
  }
}
