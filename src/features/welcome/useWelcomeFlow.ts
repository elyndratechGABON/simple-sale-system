import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { getPreferences, savePreferences } from "@/lib/settings";
import { getEmployeeId, listEmployeeHistory, type EmployeeHistory } from "@/lib/db";
import { enterPairingCode, normPairCode } from "@/lib/syncengine/pairing";
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
  const [employeePhoneInput, setEmployeePhoneInput] = useState("");
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [scannedPairCode, setScannedPairCode] = useState<string | undefined>();

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
      // 5. Se souvient du code du QR (ou du relais) pour valider la saisie de l'employé.
      setScannedPairCode(outcome.pairCode);
      // 6. Ouvre un modal : nom + mot de passe temporaire (le code affiché sous le QR).
      setEmployeeNameInput("");
      setEmployeePhoneInput("");
      setPairCodeInput("");
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

  async function submitEmployeeName() {
    const name = employeeNameInput.trim();
    const code = normPairCode(pairCodeInput);
    if (!name) return;
    if (code.length !== 6) {
      toast.error("Saisissez le mot de passe temporaire (6 caractères, sous le QR).");
      return;
    }
    if (scannedPairCode && normPairCode(scannedPairCode) !== code) {
      toast.error("Ce code ne correspond pas à celui affiché par le propriétaire.");
      return;
    }
    // L'identité est posée AVANT l'annonce : sinon la première annonce — celle qui porte
    // le code de paire, donc celle qui proves l'appairage — partait avec un nom et un
    // numéro vides, et le patron devait attendre un second cycle pour les savoir.
    await setIdentityEmployeeName(name);
    // Facultatif : le patron voit ce numéro dans « Activité du personnel ». Absent, il
    // affiche « Numéro non déclaré » plutôt qu'un numéro deviné.
    if (employeePhoneInput.trim()) await setIdentityEmployeePhone(employeePhoneInput.trim());

    const result = await enterPairingCode(code);
    if (result === "invalid") {
      toast.error("Code invalide — vérifiez-le auprès du propriétaire.");
      return;
    }
    toast.success(`Bienvenue ${name} — boutique synchronisée.`);
    savePreferences({ onboarded: true, onboardingCompleted: true });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    setShowEmployeeNameModal(false);
    navigate({ to: "/pos" });
  }

  /** Depuis le carnet, repart vers un nouveau business : la machine d'onboarding en
   *  mode « join » (scan du QR d'une caisse déjà abonnée). */
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
    employeePhoneInput,
    setEmployeePhoneInput,
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
