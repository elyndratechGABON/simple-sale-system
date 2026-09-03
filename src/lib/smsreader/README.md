# Lecture native du SMS de confirmation — état de l'art honnête

Ce dossier documente la **possibilité réelle** de lire automatiquement le SMS de
confirmation Mobile Money sur téléphone, pour alimenter le déverrouillage offline
(`src/lib/offline-unlock.ts`). Le chemin « coller le SMS » (déjà implémenté) fonctionne
**partout** ; la lecture native est un bonus de confort, contrainte par l'OS.

## Rappel du flux visé

1. Le client paie → l'opérateur (Airtel Money / Moov / MTN) envoie un SMS à SON téléphone :
   `Recu 10000F du 076505254,Client. Nouveau solde … TID: PP260818.1345.D05428.`
2. Le marchand revient dans la caisse. La caisse veut déverrouiller **sans serveur**
   (l'orchestrateur tourne sur le PC du marchand, pas dans le cloud).
3. Le parse est déjà portable : `parsePaymentSms()` + `unlockFromPaymentSms()`.

La seule question restante : **comment l'app obtient le texte du SMS sans le faire coller ?**

## Vérité technique (à ne pas survendre)

| Plateforme | Lecture auto du SMS entrant | Verdict |
| ---------- | --------------------------- | ------- |
| **Web / PWA** | Impossible — le navigateur n'a aucun accès SMS | ❌ |
| **iOS** | **Interdit.** Apple ne fournit AUCUNE API de lecture de la boîte de réception SMS à une app tierce. Les SMS Retriever API (OTP) ont été retirées aux apps standards. Aucun contournement respectueux des règles de la plateforme. | ❌ |
| **Android (Capacitor)** | Possible MAIS fortement contraint (voir ci-dessous) | ⚠️ |

## Android : la voie possible, et ses garde-fous

Une app Android peut lire la boîte SMS via une permission **réservée**
(`android.permission.READ_SMS` — famille SMS, aux côtés de SEND_SMS / RECEIVE_SMS).
Les contraintes réelles :

- **Revue du magasin** : Google (et Pure Android / App Store) ne délivrent la permission
  « SMS » qu'aux applications à finalité de gestion de messages / OTP — un POS de caisse
  peut tout à fait se qualifier (reçu de paiement), mais le dossier de revue doit le
  justifier explicitement, avec la politique de confidentialité qui le déclare.
- **Déclaration** : il faut `android.permission.READ_SMS` dans le manifest ET le code
  natif qui lit la boîte.
- **Consentement** : à la première demande, Android affiche l'écran système de
  consentement ; l'app ne lit rien avant accord explicite.

### Squelette natif (Capacitor, `*.java`)

La caisse est une app Capacitor (`android/app`). Un pont natif ajouterait, dans
`MainActivity.java` (ou un plugin), une méthode exposée au JS :

```java
// android/app/src/main/java/ga/elyndra/caisse/SmsReader.java (squelette — NON câblé)
package ga.elyndra.caisse;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorMethod;

import java.util.ArrayList;
import java.util.List;

public final class SmsReader extends Plugin {
    @CapacitorMethod(returnType = "Object[]")
    public JSObject readRecent(Object input) {
        // 1. Vérifier AndroidSettings.System().hasUserGrantedPermission("android.permission.READ_SMS").
        //    Sinon lever une PermissionDeniedException propre (→ message actionnable côté JS).
        // 2. Interroger le stockage SMS du système :
        //      SmsMessageContext.retrieveSmsMessageList(...)
        //    ... filtrer les N derniers, renvoyer { body, sender, received_at }.
        // 3. NE JAMAIS renvoyer vers le réseau : le parse se fait côté JS, tout reste local.
        return new JSObject();
    }
}

// Dans MainActivity.java :
//   registerPlugin(SmsReader.class);
```

Côté JS, le flux serait :
1. `SmsReader.readRecent()` → dernier SMS.
2. `parsePaymentSms(body)` (déjà en place).
3. `unlockFromPaymentSms(body)` (déjà en place) → déverrouillage offline.

La **présence** du plugin se teste : `typeof SmsReader !== "undefined"`. S'il est absent
(PWA, iOS, Android sans permission), on retombe sur le champ « Coller le SMS » — déjà
fourni et fonctionnel.

## Recommandation (la plus sobre)

**Ne PAS câbler le plugin natif tout de suite.** Le chemin actuel — coller le SMS —
couvre 100 % des plateformes, 0 friction de revue, 0 permission. Il satisfait déjà le
critère métier (« débloquer sans serveur »). La lecture native Android serait un confort
supplémentaire, à activer seulement si le coût de la revue store est acceptable. iOS
restera toujours sur le collage — Apple l'interdit structurellement.

S'il faut néanmoins le lire de bout en bout sans collage : un compromis multi-plateforme
est le **partage d'écran du SMS** (l'utilisateur reçoit le SMS et le partage vers l'app)
qui reste, lui aussi, un geste manuel — le collage est donc le strict optimum actuel.