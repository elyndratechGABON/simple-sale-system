import type { PosDatabase } from "../../db";
import type { DeviceAnnouncePayload, DeviceApprovePayload, PairedDevice, SyncOp } from "../types";
import { PAIRING_KEYS } from "../types";

export async function applyDeviceAnnounce(db: PosDatabase, op: SyncOp): Promise<void> {
  // Une caisse se présente. Elle est `paired` si son code correspond à celui affiché
  // localement (preuve par le principal), sinon elle reste `pending` — sauf appareil
  // déjà pairé (re-annonce) ou rôle de confiance (owner qui se présente).
  const pl = op.payload as DeviceAnnouncePayload;
  if (!pl?.device_id) return;
  const now = Date.now();
  const existing =
    (await db.paired_devices.get(pl.device_id)) ??
    ({ id: pl.device_id, shop_id: op.shop_id, updated_at: now } satisfies PairedDevice);
  const [activeCode, expiresAt] = await Promise.all([
    db.settings.get(PAIRING_KEYS.code),
    db.settings.get(PAIRING_KEYS.codeExpiresAt),
  ]);
  const codeOk = Boolean(
    pl.pair_code && activeCode?.value === pl.pair_code && Number(expiresAt?.value ?? 0) > now,
  );
  const wasPaired = existing.status === "paired";
  const firstSighting = !existing.role && !existing.status;

  // PREMIER CONTACT. Un groupe sans aucun appareil connu n'a rien à protéger : la
  // confiance initiale y est implicite (c'est ce que veut dire « la première caisse
  // du commerce »). Dès qu'un appareil est au registre, en revanche, une annonce
  // sans code ne doit plus pouvoir s'installer comme autorité — c'est là que
  // l'attaquant frappe.
  const groupEmpty = (await db.paired_devices.where("shop_id").equals(op.shop_id).count()) === 0;

  // QUI est le propriétaire, c'est decided ICI et nulle part ailleurs.
  //
  //  - un code de paire = le propriétaire a ouvert un poste D'EMPLOYÉ. Le rôle
  //    annoncé est ignoré : aucun scan, aucun dispositif, aucune annonce forgée ne
  //    peut produire un second compte propriétaire ;
  //  - le tout premier écran d'un groupe encore vide EST le propriétaire (c'est lui
  //    qui a créé la boutique) ;
  //  - sinon le rôle déjà connu ne bouge pas : seul le principal le change, via
  //    `device.approve`.
  //
  // Avant, `pl.role` passait dès le premier contact : un appareil inconnu pouvait
  // s'annoncer `owner` et s'afficher « Propriétaire » chez le patron.
  const role = codeOk
    ? "employee"
    : firstSighting && groupEmpty && pl.role === "owner"
      ? "owner"
      : existing.role;
  const autoPaired = codeOk || wasPaired || (role === "owner" && firstSighting && groupEmpty);

  // La clé publique n'est PINSÉE que sur une annonce PROUVÉE : le code de paire
  // correct, un appareil déjà au registre, ou le tout premier appareil d'un groupe
  // encore vide. Ni le `pending` ni l'auto-pairage de rôle ne suffisent — ce sont des
  // déclarations de l'op lui-même, alors que la signature d'une annonce d'appareil
  // inconnu ne peut pas encore être vérifiée (cf. `isTrustedOp`). Épingler sur cette
  // base laisserait un attaquant s'annoncer `owner` dans un groupe DÉJÀ peuplé, faire
  // pincer SA clé, puis faire vérifier par `verifyOpSignature` toutes les ops qu'il
  // signerait ensuite.
  const pinned = codeOk || wasPaired || groupEmpty;
  await db.paired_devices.put({
    ...existing,
    device_name: pl.employee_name || existing.device_name,
    phone: pl.employee_phone || existing.phone,
    role,
    ...(pinned && pl.public_key ? { public_key: pl.public_key } : {}),
    server_device_id: pl.server_device_id || existing.server_device_id,
    status: autoPaired ? "paired" : "pending",
    paired_at: autoPaired ? (existing.paired_at ?? now) : existing.paired_at,
    updated_at: now,
  });
}

export async function applyDeviceApprove(db: PosDatabase, op: SyncOp): Promise<void> {
  // Décision du principal : l'appareil visé est `paired` et reçoit son rôle partout
  // ailleurs dans le groupe. (Chaque écran ignore l'approbation qui le vise — pas de
  // fiche de soi-même — voir `exchangeOps`.)
  const pl = op.payload as DeviceApprovePayload;
  if (!pl?.org_device_id) return;
  const now = Date.now();
  const existing =
    (await db.paired_devices.get(pl.org_device_id)) ??
    ({ id: pl.org_device_id, shop_id: op.shop_id, updated_at: now } satisfies PairedDevice);
  await db.paired_devices.put({
    ...existing,
    role: pl.role ?? existing.role,
    // L'approbation est une décision du PRINCIPAL, dont la signature est vérifiée
    // ci-dessus : elle peut donc pincer la clé de l'appareil qu'elle approuve. La
    // clé vient de sa fiche (`pending`), pas de l'op — un attaquant ne peut pas
    // faire approuver sa propre clé.
    ...((pl.public_key ?? existing.public_key)
      ? { public_key: pl.public_key ?? existing.public_key }
      : {}),
    status: "paired",
    paired_at: existing.paired_at ?? now,
    updated_at: now,
  });
}
