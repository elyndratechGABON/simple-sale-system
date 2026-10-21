import { getDB, getShopProfile } from "../../db";
import { emitOp } from "../ops";
import { ensureIdentity, getDeviceKeys, isSharedGroup } from "../identity";
import { PAIRING_KEYS, ANNOUNCE_FORMAT } from "../types";
import type { DeviceRole, PairedDevice } from "../types";

/** Les deux champs de fiche que le patriarche voit dans « Activité du personnel ». */
function profileFingerprint(name: string, phone: string): string {
  return `${name}${phone}`;
}

/**
 * L'appareil se présente au groupe. Sans compte partagé, rien à dire.
 * `pairCode` est le code saisi par l'écran qui rejoint ; le principal s'annonce sans code,
 * sa présence et son rôle suffisent.
 *
 * L'annonce est one-shot PAR GROUPE (l'idempotence de l'onboarding : une seconde
 * annonce dans le MÊME groupe ferait réapparaître l'écran « à approuver » chez le
 * patron). Elle se rejoue pour autant que la FICHE change — nom ou numéro corrigé
 * plus tard : sans cela le patron resterait sur une fiche périmée, et le numéro que
 * le commerçant vient d'enregistrer n'atteindrait jamais personne. Le code, lui, ne
 * se rejoue pas : le repasser à chaque changement de nom le rendrait réutilisable
 * bien après son expiration. Le drapeau retient le `shop_id` annoncé : changer de
 * boutique (scan du QR, adoption du groupe du relais) réautorise la présentation —
 * l'écran annoncé ailleurs ne doit pas rester muet dans son nouveau monde.
 */
export async function announceDevice(pairCode?: string): Promise<void> {
  const identity = await ensureIdentity();
  if (!isSharedGroup(identity.shopId)) return;
  const db = getDB();
  const alreadyAnnounced =
    (await db.settings.get(PAIRING_KEYS.announced))?.value === identity.shopId;

  const profile = await getShopProfile();
  // Le nom d'un EMPLOYÉ est celui que la personne a saisi. Le repli sur le nom de la
  // boutique n'a de sens que pour le PROPRIÉTAIRE (son écran se nomme par la boutique) :
  // chez un employé, il affichait le nom du commerce à la place d'une personne, et le
  // patron croyait avoir autant d'employés que de boutiques.
  const employeeName =
    identity.role === "owner"
      ? identity.employeeName || profile?.storeName?.trim() || ""
      : identity.employeeName.trim();
  const employeePhone = identity.employeePhone?.trim() ?? "";
  // Le FORMAT de signature a changé : les annonces déjà émises ne sont plus
  // vérifiables par les écrans de la nouvelle version (le relais réordonne les clés du
  // payload). Sans nouvelle présentation, les deux écrans resteraient muets l'un pour
  // l'autre — pour toujours.
  const formatChanged =
    (await db.settings.get(PAIRING_KEYS.announcedFormat))?.value !== ANNOUNCE_FORMAT;
  if (alreadyAnnounced && !formatChanged) {
    // Un code est à USAGE UNIQUE : une seconde présentation avec le même code
    // n'apporterait rien (et le patron l'aurait déjà vu).
    if (pairCode) return;
    // Sans code, seule une FICHE changée justifie de repartir.
    const seen = (await db.settings.get(PAIRING_KEYS.announcedProfile))?.value as
      string | undefined;
    if (seen === profileFingerprint(employeeName, employeePhone)) return;
  }

  const payload = {
    device_id: identity.deviceId,
    server_device_id: profile?.deviceId ?? "",
    public_key: getDeviceKeys().publicKey,
    employee_name: employeeName,
    employee_phone: employeePhone,
    role: identity.role,
    ...(pairCode ? { pair_code: pairCode.toUpperCase() } : {}),
  };
  await db.transaction("rw", [db.sync_ops, db.settings], async () => {
    await emitOp(db, identity, { type: "device.announce", entity_id: identity.deviceId, payload });
    await db.settings.put({ key: PAIRING_KEYS.announced, value: identity.shopId });
    await db.settings.put({
      key: PAIRING_KEYS.announcedProfile,
      value: profileFingerprint(employeeName, employeePhone),
    });
    await db.settings.put({ key: PAIRING_KEYS.announcedFormat, value: ANNOUNCE_FORMAT });
  });
}

/**
 * Ré-annonce immédiatement après un changement de nom ou de numéro.
 * Appelé par les écrans de saisie pour ne pas attendre le prochain cycle d'échange —
 * c'est ce qui manquait pour que le numéro parvienne au patron tout de suite.
 */
export async function reannounceProfile(): Promise<void> {
  const db = getDB();
  const identity = await ensureIdentity();
  // Le one-shot doit déjà avoir été posé DANS CE GROUPE : sinon cette fonction se
  // comporterait comme une première annonce et afficherait l'écran « à approuver »
  // chez le patron.
  if ((await db.settings.get(PAIRING_KEYS.announced))?.value !== identity.shopId) return;
  await announceDevice();
}

/**
 * Approuve un appareil resté `pending` : il passe `paired` en local (le principal) et
 * l'op `device.approve` porte la décision aux autres écrans du groupe.
 */
export async function approveDevice(orgDeviceId: string, role: DeviceRole): Promise<void> {
  const identity = await ensureIdentity();
  const db = getDB();
  await db.transaction("rw", [db.paired_devices, db.sync_ops, db.settings], async () => {
    const existing =
      (await db.paired_devices.get(orgDeviceId)) ??
      ({
        id: orgDeviceId,
        shop_id: identity.shopId,
        updated_at: Date.now(),
      } satisfies PairedDevice);
    const now = Date.now();
    await db.paired_devices.put({
      ...existing,
      role,
      status: "paired",
      paired_at: existing.paired_at ?? now,
      updated_at: now,
    });
    await emitOp(db, identity, {
      type: "device.approve",
      entity_id: orgDeviceId,
      // La clé de l'appareil approuvé voyage dans l'op : c'est l'approbation, signée
      // par le principal, qui la PINSE chez les autres écrans. Une annonce `pending`
      // ne lel's fait pas (cf. `applyOp`), sans quoi n'importe quel `device_id`
      // inventé deviendrait une autorité de signature.
      payload: {
        org_device_id: orgDeviceId,
        role,
        ...(existing.public_key ? { public_key: existing.public_key } : {}),
      },
    });
  });
}
