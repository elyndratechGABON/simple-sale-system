import { motion } from "framer-motion";
import { CloudOff, EyeOff, HardDrive, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StepShell } from "../StepShell";
import type { SetupWizardApi } from "../useSetupWizard";

export function PrivacyStep({ w }: { w: SetupWizardApi }) {
  return (
    <StepShell
      icon={Shield}
      title="Confidentialité"
      description="Vos données restent entre vos mains."
    >
      <div className="space-y-4">
        {/* Visuel « Confidentialité » de la marque (logo/CONFIDENCE.png, réduit
            en webp), à la place de l'icône bouclier seule. */}
        <motion.img
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          src="/confidence.webp"
          alt="Confidentialité"
          width={560}
          height={560}
          className="mx-auto max-h-40 w-auto rounded-xl"
        />
        <ul className="space-y-2.5 text-sm">
          {[
            { icon: HardDrive, text: "100% local — tout vit sur votre appareil" },
            { icon: CloudOff, text: "Aucun envoi vers nos serveurs sans votre accord" },
            { icon: EyeOff, text: "Pas de tracking, pas de collecte de données" },
          ].map((item) => (
            <li key={item.text} className="flex items-start gap-2.5">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 pt-3">
        <Checkbox
          id="privacy-accept"
          checked={w.privacyAccepted}
          onCheckedChange={(v) => w.setPrivacyAccepted(Boolean(v))}
        />
        <Label htmlFor="privacy-accept" className="cursor-pointer text-sm">
          J'ai lu la{" "}
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            politique de confidentialité
          </a>
          .
        </Label>
      </div>
    </StepShell>
  );
}
