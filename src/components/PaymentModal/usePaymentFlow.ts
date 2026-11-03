import { useState } from "react";
import { toast } from "sonner";
import { submitSubscriptionRequest } from "@/lib/requests";
import { PAYMENT_WHATSAPP_NUMBER, setPaymentConfirmationPending } from "@/lib/payment-confirmation";
import { queuePaymentSms } from "@/lib/payments/proof";
import { unlockFromPaymentSms } from "@/lib/offline-unlock";
import type { PlanInfo } from "@/lib/pricing";

const SUPPORT_WHATSAPP = `https://wa.me/${PAYMENT_WHATSAPP_NUMBER}`;
/** Numéro du service pour la DOUBLE VÉRIFICATION (mission tunnel de paiement) :
 *  indicatif Gabon +241, numéro sans le 0, format international `wa.me`. */
const DOUBLE_VERIFY_WHATSAPP = "https://wa.me/2415565145";

// 1 = USSD, 2 = choix du chemin, 3 = admin, 4 = SMS offline.
export type Step = 1 | 2 | 3 | 4;

export function usePaymentFlow({
  onOpenChange,
  storeName,
  ownerName,
  selectedPlan,
}: {
  onOpenChange: (open: boolean) => void;
  storeName: string;
  ownerName: string;
  selectedPlan?: PlanInfo | null;
}) {
  const [step, setStep] = useState<Step>(1);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockedPlan, setUnlockedPlan] = useState<string | null>(null);

  async function handleSendRequest() {
    if (!reference.trim() || sending) return;
    setSending(true);
    try {
      const result = await submitSubscriptionRequest({
        planName: selectedPlan?.name ?? "",
        planPrice: selectedPlan?.price ?? 0,
        planDevices: selectedPlan?.devices ?? 0,
        reference,
      });
      if (result.ok) {
        // La demande part au serveur : on pose le drapeau de confirmation WhatsApp.
        // Il ne sera consommé qu'à la VALIDATION serveur (`approved`) — jamais avant.
        if (selectedPlan) {
          setPaymentConfirmationPending({
            planName: selectedPlan.name,
            planPrice: selectedPlan.price,
            planDevices: selectedPlan.devices,
            planPeriod: selectedPlan.period,
            reference: reference.trim(),
            requestedAt: Date.now(),
          });
        }
        setSent(true);
        toast.success("Demande envoyée — l'administrateur la valide depuis son tableau de bord.");
      } else {
        toast.error(result.error ?? "Impossible d'envoyer la demande.");
      }
    } finally {
      setSending(false);
    }
  }

  /** Déblocage OFFLINE : colle le SMS de confirmation de l'opérateur → déverrouille sur place. */
  async function handleOfflineUnlock() {
    if (!smsText.trim() || unlocking) return;
    setUnlocking(true);
    try {
      const result = await unlockFromPaymentSms(smsText.trim());
      if (result.ok && result.receipt) {
        setUnlockedPlan(result.receipt.planName);
        toast.success(`Abonnement ${result.receipt.planName} débloqué hors ligne`, {
          description: `Reçu ${result.receipt.amount.toLocaleString("fr-FR")} F — le prochain contact serveur confirmera.`,
        });
      } else {
        const reason = result.reason ?? "unknown";
        const messages: Record<string, string> = {
          not_a_payment_sms: "Ce texte ne ressemble pas à un SMS de confirmation de paiement.",
          no_matching_tier: "Le montant ne correspond à aucun palier (10 000 / 25 000 / 50 000 F).",
          phone_mismatch: "Le numéro du payeur ne correspond pas à la demande en cours.",
        };
        toast.error(messages[reason] ?? "Impossible de déverrouiller à partir de ce SMS.");
      }
    } finally {
      setUnlocking(false);
    }
  }

  function handleClose() {
    setStep(1);
    setReference("");
    setCopied(false);
    setSending(false);
    setSent(false);
    setSmsText("");
    setUnlocking(false);
    setUnlockedPlan(null);
    onOpenChange(false);
  }

  /**
   * DOUBLE VÉRIFIER (mission tunnel de paiement, après avoir collé le SMS) :
   *   action 1 — le SMS part à l'orchestrateur (preuve signée de l'appareil) pour
   *   qu'une trace serveur existe sans attendre le prochain cycle ;
   *   action 2 — WhatsApp s'ouvre prérempli vers le service.
   *
   * WhatsApp est ouvert SYNCHRONEMENT (avant tout `await`) : un navigateur
   * bloque une popup ouverte après un await — la preuve, elle, part en tâche de fond
   * et reprend d'elle-même au cycle suivant si le réseau manque.
   */
  async function handleDoubleVerify() {
    const sms = smsText.trim();
    if (!sms || unlocking) return;
    const waUrl = buildDoubleVerifyWhatsappUrl();
    const proofPromise = queuePaymentSms(sms, "");
    window.open(waUrl, "_blank");
    setUnlocking(true);
    try {
      const envoye = await proofPromise;
      toast.success(
        envoye
          ? "SMS transmis à l'administrateur — WhatsApp ouvert."
          : "WhatsApp ouvert. Le SMS sera transmis à la synchronisation suivante (hors ligne).",
      );
      handleClose();
    } finally {
      setUnlocking(false);
    }
  }

  function buildDoubleVerifyWhatsappUrl(): string {
    const planLine = selectedPlan
      ? `Abonnement : ${selectedPlan.name} — ${selectedPlan.price.toLocaleString("fr-FR")} FCFA / ${selectedPlan.period}`
      : "";
    const msg = [
      "Paiement d'abonnement — double vérification.",
      planLine,
      "",
      `Boutique : ${storeName}`,
      `Propriétaire : ${ownerName}`,
      "",
      "SMS de confirmation opérateur :",
      smsText.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    return `${DOUBLE_VERIFY_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  function buildWhatsappUrl(): string {
    const planLine = selectedPlan
      ? `Plan : ${selectedPlan.name} — ${selectedPlan.price.toLocaleString("fr-FR")} FCFA / ${selectedPlan.period}`
      : "";
    const msg = [
      `Salut, je souhaite ${selectedPlan ? "souscrire à" : "renouveler"} mon abonnement.`,
      planLine,
      ``,
      `Boutique : ${storeName}`,
      `Propriétaire : ${ownerName}`,
      reference ? `Référence Airtel Money : ${reference}` : ``,
      ``,
      `Merci de confirmer.`,
    ]
      .filter(Boolean)
      .join("\n");
    return `${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  function handleCopyReference() {
    if (!reference) return;
    void navigator.clipboard.writeText(reference).then(() => {
      setCopied(true);
      toast.success("Référence copiée");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return {
    step,
    setStep,
    reference,
    setReference,
    copied,
    sending,
    sent,
    smsText,
    setSmsText,
    unlocking,
    unlockedPlan,
    handleSendRequest,
    handleOfflineUnlock,
    handleDoubleVerify,
    handleClose,
    buildWhatsappUrl,
    handleCopyReference,
  };
}

export type PaymentFlow = ReturnType<typeof usePaymentFlow>;
