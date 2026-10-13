import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CLUSTER_MAP, getPreferences, type ClusterId } from "@/lib/settings";
import { useQrJoin } from "./useQrJoin";

export function useSetupWizard({
  onComplete,
  initialAccountMode = "create",
  initialCredentials,
  initialPairCode,
  initialCluster,
  initialStep,
}: {
  onComplete: () => void;
  /** « join » = arrivée via « Se connecter » : le wizard démarre directement sur
   *  l'étape du nom d'enseigne avec le compte en mode rattachement (scan QR ou
   *  saisie). La case confidentialité reste atteignable via « Retour ». */
  initialAccountMode?: "create" | "join";
  /** Identifiants recueillis par un scan QR AVANT l'ouverture du wizard (bouton
   *  « Rejoindre via code QR » de l'écran de bienvenue) : pré-remplis. */
  initialCredentials?: { phone: string; password: string } | null;
  /** Code de confirmation TEMPORAIRE transporté par le QR scanné AVANT le wizard.
   *  Le téléphone s'annonce avec lui au moment de terminer l'assistant : le principal
   *  le reconnaît et les données convergent. */
  initialPairCode?: string;
  /** Type d'activité (cluster) ressorti d'un scan QR AVANT le wizard : présélectionné
   *  à l'étape secteur, au lieu de le redemander. */
  initialCluster?: string;
  /** Étape de départ. Un scan QR pré-remplit boutique ET identifiants : on saute
   *  directement à l'étape compte (saisie du code temporaire) au lieu de redemander
   *  le nom d'enseigne. */
  initialStep?: number;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState(initialStep ?? (initialAccountMode === "join" ? 1 : 0));

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quarter, setQuarter] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<ClusterId | null>(() => {
    if (typeof initialCluster === "string" && initialCluster in CLUSTER_MAP) {
      return initialCluster as ClusterId;
    }
    return null;
  });
  // Cluster Personnalisé : domaine d'activité libre + mode de stock choisi.
  const [customDomain, setCustomDomain] = useState("");
  const [customStockChoice, setCustomStockChoice] = useState<"unit" | "weight" | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Compte marchand (v3) : un téléphone + mot de passe partagés par toutes les caisses
  // du même commerçant. « create » pour la première boutique, « join » pour rattacher
  // cet écran à un compte existant (même abonnement).
  const [accountMode] = useState<"create" | "join">(initialAccountMode);
  const [accPhone, setAccPhone] = useState(initialCredentials?.phone ?? "");
  const [accPassword, setAccPassword] = useState(initialCredentials?.password ?? "");
  // Nom du COMPTE marchand porté par le QR scanné (`data.name` = `accountName` du
  // principal). Distinct du `storeName` : c'est ce nom — pas l'enseigne — qui entre
  // dans le calcul du `shopId` du groupe P2P.
  const [accAccountName, setAccAccountName] = useState("");
  // Code de confirmation temporaire : l'utilisateur DOIT le saisir sur ce téléphone
  // (il est affiché en grand sur la caisse principale). Il devient la preuve de son
  // appairage auprès du principal à la fin de l'assistant.
  const [pairCode, setPairCode] = useState(initialPairCode ?? "");
  // QR scanné : suit que le compte/boutique provient d'un scan. Tant qu'un QR a été
  // scanné, la saisie du code temporaire est EXIGÉE avant de pouvoir continuer.
  const [qrScanned, setQrScanned] = useState(Boolean(initialCredentials));
  // Mot clé de récupération (v3) : alternative au téléphone+mot de passe pour rattacher
  // un écran au compte — utilisé quand les identifiants du compte sont perdus.
  const [accKeyword, setAccKeyword] = useState("");
  // Propriétaire : demandé avec le compte, porté par la fiche boutique et les exports.
  const [ownerName, setOwnerName] = useState("");

  const { scanPairingQr } = useQrJoin({
    phone: setAccPhone,
    password: setAccPassword,
    accountName: setAccAccountName,
    qrScanned: setQrScanned,
    storeName: setName,
    ownerName: setOwnerName,
    shopPhone: setPhone,
    quarter: setQuarter,
    cluster: setSelectedCluster,
    customDomain: setCustomDomain,
    customUnit: setCustomStockChoice,
  });

  const clusterConfig = selectedCluster ? CLUSTER_MAP[selectedCluster] : null;

  useEffect(() => {
    const prefs = getPreferences();
    setName(prefs.workspaceName);
    setPhone(prefs.phone);
    setQuarter(prefs.quarter);
    setOwnerName(prefs.ownerName);
  }, []);

  // Étapes visuelles : 0=confidentialité, 1=nom, 2=compte (create/join + identifiants),
  // 3=coordonnées du commerce, 4=secteur.
  const totalSteps = 5;

  function canNext(): boolean {
    if (step === 0) return privacyAccepted;
    if (step === 1) return name.trim().length > 0;
    if (step === 2) {
      if (accountMode === "create")
        return accPhone.trim().length > 0 && accPassword.trim().length >= 4;
      // Pour les employés (join), on vérifie le code de paire OU le qr scanné
      return (
        (pairCode.trim().length >= 6 || qrScanned) &&
        accPhone.trim().length > 0 &&
        accPassword.trim().length >= 4
      );
    }
    if (step === 3) return true; // coordonnées optionnelles
    if (step === 4) {
      if (selectedCluster === null) return false;
      if (selectedCluster === "personnalise")
        return customDomain.trim().length > 0 && customStockChoice !== null;
      return true;
    }
    return true;
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function goPrev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return {
    step,
    setStep,
    name,
    setName,
    phone,
    setPhone,
    quarter,
    setQuarter,
    selectedCluster,
    setSelectedCluster,
    customDomain,
    setCustomDomain,
    customStockChoice,
    setCustomStockChoice,
    privacyAccepted,
    setPrivacyAccepted,
    accountMode,
    accPhone,
    setAccPhone,
    accPassword,
    setAccPassword,
    accAccountName,
    setAccAccountName,
    pairCode,
    setPairCode,
    qrScanned,
    accKeyword,
    setAccKeyword,
    ownerName,
    setOwnerName,
    scanPairingQr,
    clusterConfig,
    totalSteps,
    canNext,
    goNext,
    goPrev,
    qc,
    onComplete,
  };
}

export type SetupWizardApi = ReturnType<typeof useSetupWizard>;
