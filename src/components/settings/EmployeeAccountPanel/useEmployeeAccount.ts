import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAccess } from "@/hooks/use-access";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import {
  ensureIdentity,
  resetDeviceIdentity,
  setIdentityEmployeeName,
  setIdentityEmployeePhone,
} from "@/lib/syncengine/identity";
import { reannounceProfile } from "@/lib/syncengine/pairing";
import { buildClosingPayload, parseRestitutionRequest } from "@/lib/restitution";
import { closeEmployeeHistory, getShopProfile, purgeAllData } from "@/lib/db";
import { deleteShopRemote, requestShopDeletion, resetGatekeeper } from "@/lib/gatekeeper";
import { savePreferences } from "@/lib/settings";
import { useOwnerCatalogImport } from "./useOwnerCatalogImport";

const DAY_MS = 86_400_000;

/**
 * État et effets du panneau employé : profil (nom/numéro), import du stock
 * propriétaire, et les trois mutations de suppression (demande, QR, immédiate).
 */
export function useEmployeeAccount() {
  // Défense en profondeur : ce panneau n'est monté que pour les employés (settings.tsx),
  // mais on ne rend rien si un autre rôle s'y retrouve (lien direct, bug de nav).
  const { role } = useAccess();
  const { scanning, startScan } = useBarcodeScanner();
  const [closingQrDataUrl, setClosingQrDataUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [immediateOpen, setImmediateOpen] = useState(false);

  // Profil : nom affiché et numéro joignable — chargés depuis l'identité, modifiables.
  // Le numéro est ce que le propriétaire compose dans « Activité du personnel ».
  const [employeeName, setEmployeeName] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [identity, setIdentity] = useState<Awaited<ReturnType<typeof ensureIdentity>> | null>(null);
  useEffect(() => {
    void ensureIdentity().then((id) => {
      setIdentity(id);
      setEmployeeName(id.employeeName ?? "");
      setEmployeePhone(id.employeePhone ?? "");
    });
  }, []);

  const { importPhase, importResult, importMut } = useOwnerCatalogImport();

  // Chemin demande : le propriétaire décide côté serveur, on ne purge rien ici.
  const requestMut = useMutation({
    mutationFn: async () => {
      const result = await requestShopDeletion();
      if (!result.submitted) {
        toast.error(result.error ?? "Impossible d'envoyer la demande.");
        return;
      }
      if (result.pending) {
        toast.success("Demande enregistrée — elle sera envoyée dès que le serveur répond.", {
          description: "Le propriétaire la tranchera depuis son tableau de bord.",
        });
      } else {
        toast.success("Demande envoyée au propriétaire.", {
          description: "Il l'acceptera ou la refusera depuis son tableau de bord.",
        });
      }
    },
    onError: (e: Error) => {
      setChoiceOpen(false);
      toast.error(e.message);
    },
  });

  // Chemin QR : suppression directe — message à l'orchestrateur puis purge locale.
  const deleteMut = useMutation({
    mutationFn: async () => {
      // Message à l'orchestrateur : la fiche de CET écran est supprimée côté serveur
      // (place libérée sur le compte du marchand). Serveur d'abord, purge locale ensuite ;
      // si le réseau manque on prévient mais on purge quand même — un employé qui veut
      // partir ne doit pas rester bloqué sur un serveur HS.
      const profile = await getShopProfile();
      if (!profile) throw new Error("Aucune boutique enregistrée sur cet appareil.");
      const remote = await deleteShopRemote(profile.deviceId, profile.storeName);
      if (!remote.ok) {
        toast.warning(`Serveur : ${remote.error ?? "injoignable"}. Purge locale quand même.`);
      }
      // La fin d'expérience se joue AVANT la purge : le `shopId` n'est lisible que dans
      // l'identité encore en place. Le carnet (identité stable + `employee_history`)
      // survit à la purge — c'est lui qui s'affichera sur « Mon expérience ».
      const identity = await ensureIdentity();
      await closeEmployeeHistory(identity.shopId);
      await purgeAllData();
      await resetDeviceIdentity();
      resetGatekeeper();
      savePreferences({ onboarded: false });
    },
    onSuccess: () => {
      toast.success("Compte supprimé — cette caisse n'est plus rattachée au compte.");
      window.location.reload();
    },
    onError: (e: Error) => {
      setConfirmOpen(false);
      toast.error(e.message);
    },
  });

  // Path QR : scan du QR de restitution du propriétaire → QR de clôture (aujourd'hui).
  // Le QR affiché est présenté au propriétaire AVANT la suppression — c'est la condition
  // pour que l'effacement soit autorisé (dernières ventes partagées).
  async function handleClosingScan() {
    setError(null);
    try {
      const text = await startScan();
      if (!text) return;
      const request = parseRestitutionRequest(text);
      if (!request) {
        setError("Ce code n'est pas un QR de restitution ELYNDRA. Suppression bloquée.");
        return;
      }
      const identity = await ensureIdentity();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const from = startOfToday.getTime();
      const to = from + DAY_MS;

      const closing = await buildClosingPayload(
        request,
        from,
        to,
        identity.employeeName ?? "",
        identity.deviceId,
      );
      const { default: QRCodeLib } = await import("qrcode");
      const qr = await QRCodeLib.toDataURL(JSON.stringify(closing));
      setClosingQrDataUrl(qr);
      setSummary(
        `${closing.sales} vente(s) · ${closing.revenue} F CFA · bénéfice ${closing.profit} F CFA`,
      );
    } catch {
      setError("Caméra indisponible ou QR illisible — réessayez.");
    }
  }

  async function saveName() {
    const name = employeeName.trim();
    await setIdentityEmployeeName(name);
    setIdentity((id) => (id ? { ...id, employeeName: name } : id));
    // Ré-annonce : le patron voit le nouveau nom sans ré-appairer l'écran.
    await reannounceProfile();
    toast.success("Nom envoyé au propriétaire.");
  }

  async function savePhone() {
    const phone = employeePhone.trim();
    await setIdentityEmployeePhone(phone);
    setIdentity((id) => (id ? { ...id, employeePhone: phone } : id));
    // Idem pour le numéro : c'est LA raison d'être du re-announcement.
    await reannounceProfile();
    toast.success("Numéro envoyé au propriétaire.");
  }

  return {
    role,
    scanning,
    closingQrDataUrl,
    setClosingQrDataUrl,
    summary,
    setSummary,
    error,
    choiceOpen,
    setChoiceOpen,
    confirmOpen,
    setConfirmOpen,
    immediateOpen,
    setImmediateOpen,
    employeeName,
    setEmployeeName,
    employeePhone,
    setEmployeePhone,
    identity,
    importPhase,
    importResult,
    importMut,
    requestMut,
    deleteMut,
    handleClosingScan,
    saveName,
    savePhone,
  };
}

export type EmployeeAccount = ReturnType<typeof useEmployeeAccount>;
