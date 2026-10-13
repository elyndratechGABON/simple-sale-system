import { Info, MessageCircle } from "lucide-react";
import { LEGAL_COMPANY } from "@/components/legal/LegalPage";
import { usePreferences } from "@/hooks/use-preferences";
import { savePreferences } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutCard() {
  const prefs = usePreferences();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4" /> À propos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="ECAISSE" className="h-10 w-10" />
          <div>
            <p className="font-semibold text-foreground">ELYNDRA CAISSE</p>
            <p>La caisse qui marche sans réseau.</p>
          </div>
        </div>
        <p>Développé par {LEGAL_COMPANY}.</p>
        <p>
          Vos données sont stockées localement sur cet appareil. Aucune donnée n'est envoyée sans
          votre accord.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs">
          <a
            href="https://wa.me/241076505254"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Support WhatsApp
          </a>
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Confidentialité
          </a>
          <a
            href="/legal/terms"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Conditions
          </a>
          <a
            href="/legal/refund"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Remboursements
          </a>
        </div>
        <p className="text-xs">
          © {new Date().getFullYear()} {LEGAL_COMPANY}
        </p>
        <div className="border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => savePreferences({ use_gradient_bg: !prefs.use_gradient_bg })}
          >
            {prefs.use_gradient_bg ? "Fond classique" : "Fond dégradé"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
