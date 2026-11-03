import { useQuery } from "@tanstack/react-query";
import { getShopProfile } from "@/lib/db";
import { CodeCard } from "./CodeCard";

/** Le code de RÉCUPÉRATION : le mot clé généré PAR LE SERVEUR à la création du compte
 *  (format `XXXX-XXXX`), stocké dans `shop_profiles.me.accountKeyword` depuis l'écran
 *  créateur. C'est la clé qui rattache une caisse NEUVE (téléphone perdu) au compte —
 *  présentée ici en carte premium pour ne jamais la perdre de vue. */
export function RecoveryKeywordCard() {
  const { data: profile } = useQuery({ queryKey: ["shop_profile"], queryFn: getShopProfile });
  const keyword = profile?.accountKeyword?.trim() ?? "";

  return (
    <CodeCard
      title="Code de récupération"
      description={
        <>
          Généré à la création du compte, il reconnecte vos futures caisses — même après un
          téléphone perdu.
        </>
      }
      warning="Conservez ce code précieusement — c'est la clé du compte."
      code={keyword || null}
      unavailableMessage="Aucun code sur cet appareil — il a été remis UNE fois à l'écran qui a créé le compte."
      copyable
    />
  );
}
