/** Superposition plein écran du scan : cadre vidéo, messages et boutons Annuler /
 *  Réessayer. Renvoie les éléments pour que la passe de scan pilote leur contenu. */
export function createOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.85);" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;" +
    "font-family:system-ui,sans-serif";
  const frame = document.createElement("div");
  frame.id = `barcode-reader-${Date.now()}`;
  frame.style.cssText =
    "width:min(80vw,280px);aspect-ratio:1;border-radius:12px;overflow:hidden;background:#000";
  const hint = document.createElement("p");
  hint.style.cssText = "color:#fff;font-size:14px;margin:0;text-align:center;max-width:86vw";
  hint.textContent = "Demande d'accès à la caméra…";
  const status = document.createElement("p");
  status.style.cssText =
    "color:rgba(255,255,255,.65);font-size:12px;margin:0;text-align:center;padding:0 24px";
  status.textContent = "Si rien ne se passe, vérifiez l'autorisation caméra.";
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.style.cssText =
    "color:#fff;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.5);" +
    "border-radius:10px;padding:10px 22px;font-size:14px;cursor:pointer;display:none";
  retryBtn.textContent = "Réessayer la caméra";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.style.cssText =
    "color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.4);" +
    "border-radius:10px;padding:10px 28px;font-size:14px;cursor:pointer";
  cancelBtn.textContent = "Annuler";
  overlay.append(frame, hint, status, retryBtn, cancelBtn);
  document.body.appendChild(overlay);

  const teardown = () => overlay.remove();

  return { frame, hint, status, retryBtn, cancelBtn, teardown };
}
