/* ── Carnet d'expérience employé ──────────────────────────────────────────── */
import { useState } from "react";
import { History, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLUSTER_MAP } from "@/lib/settings";
import { formatDateShort, formatExperienceDuration } from "@/lib/format";
import type { EmployeeHistory } from "@/lib/db";

export function ExperiencePage({
  employeeId,
  history,
  onBack,
  onJoin,
}: {
  employeeId: string;
  history: EmployeeHistory[];
  onBack: () => void;
  onJoin: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  // Durée totale du carnet : les expériences fermées portent leur durée, une expérience
  // encore ouverte est comptée jusqu'à maintenant (défense — le welcome n'y accède pas).
  const totalDays = history.reduce((sum, h) => {
    if (h.endedAt) return sum + h.durationDays;
    return sum + Math.max(1, Math.round((Date.now() - h.startedAt) / 86_400_000));
  }, 0);

  /** Un QR de profil porteur du résumé du carnet : le propriétaire d'un nouveau
   *  business peut le scanner pour vérifier l'expérience déclarée. */
  async function showQrProfile() {
    setQrError(false);
    setQrDataUrl(null);
    try {
      const payload = {
        app: "ecaisse",
        type: "exp-profile",
        employee: employeeId,
        stores: history.map((h) => ({
          name: h.storeName,
          cluster: h.cluster,
          days: h.endedAt
            ? h.durationDays
            : Math.max(1, Math.round((Date.now() - h.startedAt) / 86_400_000)),
        })),
      };
      const { default: QRCodeLib } = await import("qrcode");
      setQrDataUrl(await QRCodeLib.toDataURL(JSON.stringify(payload)));
    } catch {
      setQrError(true);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border bg-card p-5 text-left shadow-sm sm:p-6">
      <h1 className="sr-only">Mon expérience</h1>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Mon expérience</h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Retour
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Les business où vous avez travaillé, 100 % enregistré sur votre téléphone.
      </p>

      {history.length > 0 ? (
        <>
          <div className="mt-4 space-y-3">
            {history.map((h) => {
              const endDay = h.endedAt
                ? h.durationDays
                : Math.max(1, Math.round((Date.now() - h.startedAt) / 86_400_000));
              return (
                <div key={h.id} className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{h.storeName}</p>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {formatExperienceDuration(endDay)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {CLUSTER_MAP[h.cluster]?.label ?? "Activité"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateShort(h.startedAt)} →{" "}
                    {h.endedAt ? formatDateShort(h.endedAt) : "aujourd'hui"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border bg-accent/40 p-3 text-sm">
            <span className="font-medium">
              {history.length} business {history.length > 1 ? "travaillés" : "travaillé"} ·{" "}
              {formatExperienceDuration(totalDays)} au total
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <Button size="lg" className="w-full gap-2" onClick={onJoin}>
              <ScanLine className="h-4 w-4" /> Scanner un QR pour rejoindre un nouveau business
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => void showQrProfile()}>
              <History className="h-4 w-4" /> Afficher mon QR profil
            </Button>
          </div>

          {qrError && (
            <p className="mt-2 text-center text-xs text-destructive">
              Impossible de générer le QR — réessayez.
            </p>
          )}
          {qrDataUrl && (
            <div className="mt-3 text-center space-y-1">
              <img
                src={qrDataUrl}
                alt="QR profil expérience"
                className="mx-auto h-44 w-44 rounded-lg border"
              />
              <p className="text-xs text-muted-foreground">
                Présentez ce QR à un propriétaire pour prouver votre expérience.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune expérience pour le moment. Rejoignez un business pour commencer.
          </p>
          <Button size="lg" className="w-full gap-2" onClick={onJoin}>
            <ScanLine className="h-4 w-4" /> Scanner un QR pour rejoindre un business
          </Button>
        </div>
      )}
    </div>
  );
}
