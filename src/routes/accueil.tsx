import { useEffect, useState } from "react";
import { ensureIdentity, getIdentity } from "@/lib/syncengine/identity";
import { usePreferences } from "@/hooks/use-preferences";
import { Button } from "@/components/ui/button";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { buildClosingPayload, parseRestitutionRequest } from "@/lib/restitution";
// QR code generation via dynamic import (like DevicePairingDialog)

export default function Accueil() {
  const { workspaceName } = usePreferences();
  const [employeeName, setEmployeeName] = useState("");
  const [closingQrDataUrl, setClosingQrDataUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { startScan, scanning } = useBarcodeScanner();

  useEffect(() => {
    let active = true;
    void ensureIdentity().then((id) => {
      if (active) setEmployeeName(id.employeeName ?? "");
    });
    return () => {
      active = false;
    };
  }, []);

  void workspaceName;

  const handleScan = async () => {
    setError(null);
    const text = await startScan();
    if (!text) return; // annulé
    try {
      const request = parseRestitutionRequest(text);
      if (!request) {
        setError("QR de restitution invalide.");
        return;
      }
      const identity = await getIdentity();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const from = startOfToday.getTime();
      const to = from + 24 * 60 * 60 * 1000;

      const closing = await buildClosingPayload(
        request,
        from,
        to,
        employeeName ?? "",
        identity.deviceId,
      );
      const { default: QRCodeLib } = await import("qrcode");
      const qrDataUrl = await QRCodeLib.toDataURL(JSON.stringify(closing));
      setClosingQrDataUrl(qrDataUrl);
      setSummary(
        `${closing.sales} vente(s) · ${closing.revenue} F CFA · bénéfice ${closing.profit} F CFA`,
      );
    } catch (err) {
      console.error(err);
      setError("Erreur lors du traitement du QR.");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Accueil employé</h1>
      <p className="text-muted-foreground">
        Bienvenue {employeeName || "Employé"} ! Scannez le QR de restitution du propriétaire pour
        générer votre QR de clôture du jour.
      </p>

      {closingQrDataUrl && (
        <div className="text-center">
          <p className="mb-1 text-sm font-medium">{summary}</p>
          <p className="mb-2 text-muted-foreground">
            Présentez ce QR au propriétaire pour transférer vos ventes :
          </p>
          <img src={closingQrDataUrl} alt="QR de clôture" className="mx-auto h-48 w-48 border" />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              setClosingQrDataUrl(null);
              setSummary(null);
            }}
          >
            Effacer
          </Button>
        </div>
      )}

      {!closingQrDataUrl && (
        <Button variant="outline" disabled={scanning} onClick={handleScan} className="w-full">
          {scanning ? "Scan en cours…" : "Scanner le QR de restitution"}
        </Button>
      )}

      {error && <div className="p-3 rounded bg-red-50 text-red-700">{error}</div>}
    </div>
  );
}
