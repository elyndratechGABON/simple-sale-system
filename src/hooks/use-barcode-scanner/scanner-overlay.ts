import { requestCameraActivation } from "./camera-activation";
import { setActiveStop, stopHtml5, toCameraError } from "./internal";
import { createOverlay } from "./overlay";

/**
 * Une passe entière de scan, superposition comprise. Chaque itération de la boucle
 * correspond à UNE demande d'activation : en cas de refus, l'utilisateur peut
 * « Réessayer la caméra » (nouvelle activation, peu importe le mobile) ou Annuler.
 */
export async function startScannerWithOverlay(): Promise<string | null> {
  const {
    frame,
    hint,
    status,
    retryBtn,
    cancelBtn,
    manualBtn,
    manualBox,
    manualText,
    manualOk,
    teardown,
  } = createOverlay();

  // Le qrbox doit tenir DANS le cadre, lui-même borné par le petit côté de l'écran.
  // PHASE 1 GRAND (mission scanner QR) : plus de modules par système, un code dense
  // (+600 caractéristiques) n'est correct que si chaque module est visible.
  const qrBoxSize = Math.max(
    200,
    Math.min(320, Math.floor(Math.min(window.innerWidth * 0.75, window.innerHeight * 0.5))),
  );

  let resolveDecoded!: (value: string) => void;
  const decoded = new Promise<string>((resolve) => {
    resolveDecoded = resolve;
  });

  let scanner: import("html5-qrcode").Html5Qrcode | null = null;

  // Résolvants exposés à `stop` : quelque soit l'état (flux vivant, attente du choix
  // retry/annuler, démarrage en cours), l'arrêt programmatique doit pouvoir tout
  // dénouer proprement et faire renvoyer `null`.
  let resolveCancelled: (v: null) => void = () => {};
  const cancelled = new Promise<null>((resolve) => {
    resolveCancelled = resolve;
  });
  let resolveChoice: (v: "retry" | "cancel") => void = () => {};
  cancelBtn.addEventListener("click", () => resolveCancelled(null), { once: true });

  /** Arrêt demandé par le hook (démontage) : on dénoue la passe en cours et on nettoie.
   *  `scanner` et `overlay` sont fuités volontairement — la promesse rendue finit par
   *  `finally`, qui re-localise puis détruit proprement. */
  const stop = () => {
    resolveChoice("cancel");
    resolveCancelled(null);
    void stopHtml5(scanner);
    teardown();
  };
  setActiveStop(stop);

  const waitForChoice = () =>
    new Promise<"retry" | "cancel">((resolve) => {
      resolveChoice = resolve;
      const onRetry = () => {
        cleanup();
        resolve("retry");
      };
      const onCancel = () => {
        cleanup();
        resolve("cancel");
      };
      function cleanup() {
        retryBtn.removeEventListener("click", onRetry);
        cancelBtn.removeEventListener("click", onCancel);
      }
      retryBtn.addEventListener("click", onRetry, { once: true });
      cancelBtn.addEventListener("click", onCancel, { once: true });
    });

  // ── Repli MANUEL (mission scanner QR) ─────────────────────────────────────────
  // Après 5 s de scan sans lecture, le cadre a pu refuser de déchiffrer (écran de
  // reflect, code dense) : la saisie du contenu reste disponible, la caméra vivante.
  const openManual = () => {
    manualBtn.style.display = "none";
    manualBox.style.display = "flex";
    manualText.focus();
  };
  const manualOnOk = () => {
    const text = manualText.value.trim();
    if (!text) {
      manualText.focus();
      return;
    }
    resolveDecoded(text);
  };

  const showError = (message: string) => {
    hint.style.display = "none";
    status.textContent = message;
    status.style.color = "oklch(0.75 0.12 25)"; /* --danger éclairci, cf. styles.css */
    status.style.fontSize = "13px";
    retryBtn.style.display = "";
  };

  const resetStatus = () => {
    hint.style.display = "";
    hint.textContent = "Demande d'accès à la caméra…";
    status.style.color = "rgba(255,255,255,.65)";
    status.style.fontSize = "12px";
    status.textContent = "Si rien ne se passe, vérifiez l'autorisation caméra.";
    retryBtn.style.display = "none";
  };

  try {
    // 1. Activation caméra — COURUE DANS LE GESTE DE CLIC, avant tout import dynamique.
    //    Native, le prompt OS s'ouvre donc dans la fenêtre d'activation du clic ; web,
    //    `requestCameraActivation` OUVRE réellement la caméra ici pour acquérir la
    //    permission (puis la relâche), ce qui rend impossible l'échec silencieux iOS.
    const firstAccess = await requestCameraActivation();

    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
    // BARCODEDETECTOR NATIF quand le navigateur le propose (Android : décodage
    // matériel, rapide et tolère les reflets) + QR_CODE seul : on ne cherche que des
    // QR — moins de faux négatifs par image. `useBarCodeDetectorIfSupported` est lu
    // au runtime par la lib ; le type déclaré ne le porte pas, `cast` assumé.
    scanner = new Html5Qrcode(frame.id, {
      useBarCodeDetectorIfSupported: true,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    } as import("html5-qrcode").Html5QrcodeFullConfig);

    for (let pass = 0; ; pass++) {
      resetStatus();

      // 1 bis. Aux passes suivantes (`pass > 0`, « Réessayer »), on redemande une
      // activation — chaque retry est un geste frais qui rouvre le prompt.
      const access = pass === 0 ? firstAccess : await requestCameraActivation();
      if (access.denied || !access.available) {
        showError(access.fix ?? "Accès caméra refusé.");
        const choice = await waitForChoice();
        if (choice === "cancel") return null;
        continue;
      }

      // 2. Démarrage réel du flux : caméra ARRIÈRE d'abord, puis n'importe laquelle.
      // CONTRAT runtime html5-qrcode (mission caméra) : l'argument 1 demandé par
      // `createVideoConstraints` porte UNE SEULE clé (`facingMode: string`) — les
      // résolutions n'y ont PAS leur place ('cameraIdOrConfig': exactly 1 key, found 3).
      // La HAUTE RÉSOLUTION passe dans le 2e argument, via `videoConstraints`
      // (MediaStreamConstraints complet) : quand il est valide, la lib ignore proprement
      // l'argument 1 — et le flux 640×480 par défaut (modules < 1 px pour un code dense)
      // devient un flux net 1080p.
      const attempts: Array<{ facingMode: string; videoConstraints: MediaTrackConstraints }> = [
        {
          facingMode: "environment",
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        {
          facingMode: "user",
          videoConstraints: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
        },
      ];
      let started = false;
      let lastErr: unknown = null;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        for (const camera of attempts) {
          const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(
                new Error(
                  "Impossible d'accéder à la caméra (délai dépassé). Fermez les autres applications qui l'utilisent, puis réessayez.",
                ),
              );
            }, 10_000);
          });
          try {
            await Promise.race([
              scanner.start(
                camera,
                {
                  fps: 10,
                  qrbox: { width: qrBoxSize, height: qrBoxSize },
                  videoConstraints: camera.videoConstraints,
                },
                (decodedText) => resolveDecoded(decodedText),
                () => {},
              ),
              timeout,
            ]);
            started = true;
            break;
          } catch (e) {
            lastErr = e;
            const msg = String((e as Error)?.message ?? e ?? "");
            // Contrainte injoignable uniquement → tenter la caméra suivante.
            if (/overconstrained|notfound|no ?camera|facingmode|device not found/i.test(msg)) {
              continue;
            }
            throw e;
          } finally {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
          }
        }
        if (!started) throw lastErr ?? new Error("Caméra indisponible.");
      } catch (err) {
        await stopHtml5(scanner);
        showError(toCameraError(err).message);
        const choice = await waitForChoice();
        if (choice === "cancel") return null;
        continue;
      }

      // 3. Flux vivant : on attend un code ou l'annulation.
      hint.textContent = "Cadrez le code QR dans le cadre";
      status.textContent = "Caméra active";
      // Repli manuel à 5 s (regenerated à chaque passe : réessayer = fenêtre neuve).
      manualBtn.style.display = "none";
      manualBox.style.display = "none";
      manualText.value = "";
      const manualTimer = window.setTimeout(() => {
        manualBtn.style.display = "";
      }, 5000);
      manualBtn.addEventListener("click", openManual);
      manualOk.addEventListener("click", manualOnOk);
      const result = await Promise.race([decoded, cancelled]);
      clearTimeout(manualTimer);
      manualBtn.removeEventListener("click", openManual);
      manualOk.removeEventListener("click", manualOnOk);
      return result;
    }
  } finally {
    setActiveStop(null);
    await stopHtml5(scanner);
    teardown();
  }
}
