import { useState } from "react";
import { savePreferences } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { getShopProfile } from "@/lib/db";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Crown,
  Smartphone,
  Store,
  Database,
  Zap,
  Bell,
  Megaphone,
  Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhatsAppProfilePage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { ownerName, ownerPhoto, workspaceName } = usePreferences();
  const { data: profile } = useQuery({ queryKey: ["shop_profile"], queryFn: getShopProfile });
  const displayName =
    ownerName || profile?.ownerName || profile?.storeName || workspaceName || "Propriétaire";

  const [bgType, setBgType] = useState<"classic" | "gradient">("gradient");

  const items = [
    {
      icon: Crown,
      label: "Abonnement",
      desc: "Plan, renouvellement, quota d'appareils",
      to: "/_app/settings",
    },
    {
      icon: Smartphone,
      label: "Appareil connecté",
      desc: "Écrans jumelés, synchronisation, mode employé",
      to: "/_app/settings",
    },
    {
      icon: Store,
      label: "Boutique",
      desc: "Nom, quartier, logo, type de commerce",
      to: "/_app/settings",
    },
    {
      icon: Database,
      label: "Donnée",
      desc: "Export JSON, sauvegarde, restauration, suppression",
      to: "/_app/settings",
    },
  ];

  return (
    <div
      className={`min-h-screen ${bgType === "gradient" ? "bg-gradient-to-br from-emerald-950 via-teal-950 to-amber-950" : "bg-[#0B1114]"} text-[#F1F3F4]`}
    >
      <div className="relative bg-[#0D1215]/80 backdrop-blur-md px-4 pt-6 pb-8 text-center">
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("/")}
            aria-label="Retour"
          >
            <ChevronRight className="h-5 w-5 rotate-180 text-white/70" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Rechercher">
            <Zap className="h-5 w-5 text-white/70" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="QR">
            <Zap className="h-5 w-5 text-white/70" />
          </Button>
        </div>
        <div className="relative mx-auto w-28 h-28">
          <img
            src={ownerPhoto || "/icon-192.png"}
            alt={displayName}
            className="w-28 h-28 rounded-full border-2 border-white/10 object-cover shadow-xl mx-auto"
          />
          <button
            type="button"
            className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-2 border-[#0D1215]"
            aria-label="Modifier photo"
          >
            <Zap className="h-4 w-4" />
          </button>
        </div>
        <h1 className="mt-3 text-xl font-bold tracking-tight">{displayName}</h1>
        <p className="text-xs text-[#9AA4B2]">Propriétaire • ELYNDRA TECH Gabon</p>
      </div>

      <div className="mx-auto max-w-md px-4 py-6 space-y-1">
        {items.map((it) => (
          <a
            key={it.label}
            href={it.to}
            className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5 transition-colors"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/90">
              <it.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{it.label}</p>
              <p className="text-xs text-[#9AA4B2] truncate">{it.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#9AA4B2] shrink-0" />
          </a>
        ))}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 bg-[#0B1114]/95 backdrop-blur-md px-2 py-2 text-xs text-[#9AA4B2]">
        <a href="/pos" className="flex flex-col items-center gap-0.5 hover:text-white">
          <Zap className="h-5 w-5" />
          <span className="text-[10px]">Accueil</span>
        </a>
        <a href="/pos" className="flex flex-col items-center gap-0.5 hover:text-white">
          <Zap className="h-5 w-5" />
          <span className="text-[10px]">Caisse</span>
        </a>
        <a href="/stocks" className="flex flex-col items-center gap-0.5 hover:text-white">
          <Zap className="h-5 w-5" />
          <span className="text-[10px]">Stocks</span>
        </a>
        <a href="/reports" className="flex flex-col items-center gap-0.5 hover:text-white">
          <Zap className="h-5 w-5" />
          <span className="text-[10px]">Rapports</span>
        </a>
        <a href="/_app/settings" className="flex flex-col items-center gap-0.5 text-emerald-400">
          <Zap className="h-5 w-5" />
          <span className="text-[10px]">Réglages</span>
        </a>
      </nav>
    </div>
  );
}
