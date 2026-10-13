import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, UserRound } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { savePreferences } from "@/lib/settings";
import { getSetting, setSetting } from "@/lib/db";
import { ImageCropper } from "@/components/ImageCropper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

/**
 * Apparence : photo de profil (en-tête, à côté des réglages) et logo de la boutique
 * (icône affichée au-dessus du nom). Deux images, deux usages — une seule carte.
 * Photo et logo sont réduits au recadrage et stockés localement (préférences pour la
 * photo, IndexedDB pour le logo) : une image de plusieurs mégaoctets ne doit ni gonfler
 * la base, ni ralentir l'en-tête.
 */
const SETTING_SHOP_LOGO = "shop_logo";

export function AppearanceCard() {
  const qc = useQueryClient();
  const { ownerPhoto } = usePreferences();
  const { data: shopLogo } = useQuery({
    queryKey: ["shop_logo"],
    queryFn: () => getSetting<string>(SETTING_SHOP_LOGO) ?? null,
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Apparence
        </CardTitle>
        <CardDescription>
          La photo de profil et le logo de la boutique, affichés dans l'en-tête.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-primary/10 text-sm font-semibold text-primary">
            {ownerPhoto ? (
              <img src={ownerPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Photo de profil</p>
            <p className="text-xs text-muted-foreground truncate">
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
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handlePhotoFile(e)}
        />

        <div className="flex items-center gap-3">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted/30 p-1">
            {shopLogo ? (
              <img src={shopLogo} alt="Logo actuel" className="h-full w-full object-contain" />
            ) : (
              <img
                src="/logo-header.png"
                alt="Logo par défaut"
                className="h-full w-full object-contain"
              />
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => logoInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              {shopLogo ? "Changer le logo" : "Choisir un logo"}
            </Button>
            {shopLogo && (
              <Button variant="outline" onClick={removeLogo}>
                <Trash2 className="h-4 w-4 mr-2" /> Retirer
              </Button>
            )}
          </div>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleLogoFile(e)}
        />
        <p className="text-xs text-muted-foreground">
          Images réduites au recadrage et stockées sur cet appareil.
        </p>
      </CardContent>

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
    </Card>
  );
}
