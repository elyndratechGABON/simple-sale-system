import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { getPreferences, savePreferences } from "@/lib/settings";
import { getEmployeeId, listEmployeeHistory, type EmployeeHistory } from "@/lib/db";
import { enterPairingCode, normPairCode, reannounceProfile } from "@/lib/syncengine/pairing";
import { setIdentityEmployeeName, setIdentityEmployeePhone } from "@/lib/syncengine/identity";
import { runJoinScan } from "./join-scan";

export type Phase = "welcome" | "wizard" | "tutorial" | "experience";
export type EntryMode = "create" | "join";

/** Machine à états du parcours d'entrée indépendant `/welcome`. */
export function useWelcomeFlow() {
  const { startScan } = useBarcodeScanner();
  const qc = useQueryClient();
  const navigate = useNavigate();
  // Reprendre AU BON ENDROIT : installé mais tutoriel non vu → tutoriel direct
  // (cas d'un onboarding interrompu après l'assistant).
  const [phase, setPhase] = useState<Phase>(() => {
    const prefs = getPreferences();
    return prefs.onboarded && !prefs.onboardingCompleted ? "tutorial" : "welcome";
  });
  const [mode, setMode] = useState<EntryMode>("create");
  const [joinCreds, setJoinCreds] = useState<{ phone: string; password: string } | null>(null);
  const [joinPairCode, setJoinPairCode] = useState<string | undefined>();
  const [employeeId, setEmployeeId] = useState<string | null>(() => getEmployeeId());
  const [history, setHistory] = useState<EmployeeHistory[] | null>(null);
  const [scanningJoin, setScanningJoin] = useState(false);
  const [showEmployeeNameModal, setShowEmployeeNameModal] = useState(false);
  const [employeeNameInput, setEmployeeNameInput] = useState("");
  // Historique conservé (scan manuel sans QR) : le code saisit reste accepté au
  // replay d'un ancien bundle, mais plus AUCUN écran ne le demande après un scan v3.
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [scannedPairCode, setScannedPairCode] = useState<string | undefined>();
  async function submitEmployeeName() {
    // ÉPURATION (mission scan employé) : nom SEUL — le code vient du QR (auto-annoncé
    // au scan), pas de mot de passe, pas d'email. L'employé rejoint le groupe,
    // puis son nom part au patron à la même annonce.
    const name = employeeNameInput.trim();
    if (name.length < 2) {
      toast.error("Saisissez votre nom (au moins 2 caractères).");
      return;
    }
    await setIdentityEmployeeName(name);
    // Le patron apprend TOUT DE SUITE le nom : la ré-annonce one-shot porte le nom
    // Immédiat (cf. reannounceProfile — le chemin de l'écran d'identité employé).
    try {
      await reannounceProfile();
    } catch {
      // Hors ligne : le nom partira au prochain handshake, rien n'est perdu.
    }

    toast.success(`Bienvenue ${name} — boutique synchronisée.`);
    savePreferences({ onboarded: true, onboardingCompleted: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setShowEmployeeNameModal(false);
    navigate({ to: "/pos" });
  }
  function startCreate() {
    setJoinCreds(null);
    setJoinPairCode(undefined);
    setMode("create");
    setPhase("wizard");
  }

  async function startJoinScan() {
    setScanningJoin(true);
    try {
      const outcome = await runJoinScan(startScan, () =>
        qc.invalidateQueries({ queryKey: ["preferences"] }),
      );
      if (outcome.status === "cancelled") return;
      if (outcome.status === "bad-code") {
        toast.error("Ce code n'est pas un code d'appairage ELYNDRA.");
        return;
      }
      // ÉPURATION (mission scan employé) : PLUS de question de code après un scan
      // réussi — le jeton du QR VIENT d'être réclamé, sa preuve est valide. L'appareil
      // s'annonce TOUT SEUL avec le code qu'il a scanné ; il ne reste qu'AU NOM
      // à poser (cf. modale « Quel est votre nom ? »).
      if (outcome.pairCode) await enterPairingCode(outcome.pairCode);
      setScannedPairCode(outcome.pairCode);
      setShowEmployeeNameModal(true);
    } catch {
      toast.error("Caméra indisponible — réessayez.");
    } finally {
      setScanningJoin(false);
    }
  }

  function finishTutorial() {
    savePreferences({ onboardingCompleted: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    navigate({ to: "/pos" });
  }

  /** Ouvre le carnet « Mon expérience » : liste des business travaillés + durée. */
  async function openExperience() {
    const id = getEmployeeId();
    if (!id) return;
    setEmployeeId(id);
    setHistory(await listEmployeeHistory(id));
    setPhase("experience");
  }

  /** Ouvre le carnet « Mon expérience » : liste des business travaillés + durée. */
  async function joinNewBusiness() {
    setJoinCreds(null);
    setJoinPairCode(undefined);
    setMode("join");
    setPhase("wizard");
  }

  return {
    phase,
    setPhase,
    mode,
    joinCreds,
    joinPairCode,
    employeeId,
    history,
    scanningJoin,
    showEmployeeNameModal,
    setShowEmployeeNameModal,
    employeeNameInput,
    setEmployeeNameInput,
    pairCodeInput,
    setPairCodeInput,
    startCreate,
    startJoinScan,
    finishTutorial,
    openExperience,
    submitEmployeeName,
    joinNewBusiness,
  };
}
