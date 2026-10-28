import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Trash2, Upload, UserRound } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { savePreferences } from "@/lib/settings";
import { getSetting, setSetting } from "@/lib/db";
import { ImageCropper } from "@/components/ImageCropper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Identité : nom de la boutique, photo de profil (en-tête, à côté des réglages) et
 * logo (icône affichée au-dessus du nom). Nom et images réduits/recadrés et stockés
 * localement : une image de plusieurs mégaoctets ne doit ni gonfler la base,
 * ni ralentir l'en-tête.
 */
const SETTING_SHOP_LOGO = "shop_logo";

export function AppearanceCard() {
  const qc = useQueryClient();
  const { ownerPhoto, workspaceName } = usePreferences();
  const { data: shopLogo } = useQuery({
    queryKey: ["shop_logo"],
    queryFn: async () => (await getSetting<string>(SETTING_SHOP_LOGO)) ?? null,
  });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [photoCropOpen, setPhotoCropOpen] = useState(false);
  const [photoCropSource, setPhotoCropSource] = useState("");
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSource, setLogoCropSource] = useState("");

  function handlePhotoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    // Le recadrage, pas un simple rétrécissement : un avatar carré choisi à la main
    // plutôt que le centre aveugle d'une photo d'identité mal cadrée.
    if (photoCropSource) URL.revokeObjectURL(photoCropSource);
    setPhotoCropSource(URL.createObjectURL(file));
    setPhotoCropOpen(true);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function applyPhotoCropped(dataUrl: string) {
    // 128 px suffit pour un avatar de 40 px dans l'en-tête, même en écran retina ×3.
    savePreferences({ ownerPhoto: dataUrl });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    toast.success("Photo de profil mise à jour");
    setPhotoCropOpen(false);
    if (photoCropSource) URL.revokeObjectURL(photoCropSource);
    setPhotoCropSource("");
  }

  function removePhoto() {
    savePreferences({ ownerPhoto: "" });
    qc.invalidateQueries({ queryKey: ["preferences"] });
  }

  function commitName(name: string) {
    const next = name.trim();
    if (!next || next === workspaceName) return;
    savePreferences({ workspaceName: next });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    toast.success("Nom de la boutique mis à jour");
  }

  function handleLogoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    // Recadrage carré choisi à la main, pas un simple rétrécissement : un logo
    // horizontal perdrait ce qui dépasse du cadre sans qu'on ait son mot à dire.
    if (logoCropSource) URL.revokeObjectURL(logoCropSource);
    setLogoCropSource(URL.createObjectURL(file));
    setLogoCropOpen(true);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  async function applyLogoCropped(dataUrl: string) {
    await setSetting(SETTING_SHOP_LOGO, dataUrl);
    qc.invalidateQueries({ queryKey: ["shop_logo"] });
    // Le logo illustre la boutique, il ne teinte PAS l'interface : l'identité couleur
    // reste celle de la marque (émeraude/or), quel que soit le fichier envoyé.
    toast.success("Logo de la boutique mis à jour");
    setLogoCropOpen(false);
    if (logoCropSource) URL.revokeObjectURL(logoCropSource);
    setLogoCropSource("");
  }

  async function removeLogo() {
    await setSetting(SETTING_SHOP_LOGO, null);
    qc.invalidateQueries({ queryKey: ["shop_logo"] });
    toast.success("Logo retiré — icône de l'application restaurée");
  }

  return (
    <div className="flat-card space-y-4">
      <header className="space-y-1">
        <h2 className="text-title flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Identité
        </h2>
        <p className="text-small text-muted-foreground">
          Nom, photo de profil et logo affichés dans l'en-tête.
        </p>
      </header>

      <div>
        <Label htmlFor="shop-name" className="text-body font-medium">
          Nom de la boutique
        </Label>
        <Input
          id="shop-name"
          defaultValue={workspaceName}
          onBlur={(e) => commitName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Nom de la boutique"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {ownerPhoto ? (
              <img
                src={ownerPhoto}
                alt=""
                className="h-full w-full object-cover"
                width={48}
                height={48}
              />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium">Photo de profil</p>
            <p className="text-small text-muted-foreground truncate">
              Affichée dans l'en-tête, à côté des réglages.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            Changer
          </Button>
          {ownerPhoto && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Retirer la photo de profil"
              onClick={removePhoto}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handlePhotoFile(e)}
          />
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-card p-1">
            {shopLogo ? (
              <img
                src={shopLogo}
                alt="Logo actuel"
                className="h-full w-full object-contain"
                width={64}
                height={64}
              />
            ) : (
              <img
                src="/logo-header.png"
                alt="Logo par défaut"
                className="h-full w-full object-contain"
                width={64}
                height={64}
              />
            )}
          </span>
          <div className="flex flex-col items-start gap-1.5">
            <p className="text-body font-medium">Logo de la boutique</p>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" />
                {shopLogo ? "Changer" : "Choisir"}
              </Button>
              {shopLogo && (
                <Button variant="ghost" size="sm" onClick={removeLogo} aria-label="Retirer le logo">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleLogoFile(e)}
            />
          </div>
        </div>
      </div>
      <p className="text-small text-muted-foreground">
        Images réduites au recadrage et stockées sur cet appareil.
      </p>

      <ImageCropper
        open={photoCropOpen}
        onOpenChange={setPhotoCropOpen}
        source={photoCropSource}
        outputSize={128}
        title="Recadrer la photo de profil"
        onCrop={applyPhotoCropped}
      />
      <ImageCropper
        open={logoCropOpen}
        onOpenChange={setLogoCropOpen}
        source={logoCropSource}
        outputSize={256}
        title="Recadrer le logo"
        onCrop={(d) => void applyLogoCropped(d)}
      />
    </div>
  );
}
