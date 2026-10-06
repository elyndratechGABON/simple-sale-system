// computeAssetAgenda : ce qui décide qu'un jour porte une pastille sur le
// calendrier et qu'une ligne apparaît dans le rapport des Rapports.
//
// Les cas qui comptent ne sont pas les cas nominaux. Ils sont :
//   — un produit SANS `is_asset` ne doit jamais être une échéance, même avec une
//     date : sinon une note posée sur une perceuse deviendrait un « retour » ;
//   — un produit SANS date ne doit rien produire (une Map vide pour un produit
//     neuf ne doit pas créer de case fantôme) ;
//   — un produit AVEC les deux dates produit DEUX événements, à deux jours
//     possibles ; c'est ce qui distingue un rappel d'un retour ;
//   — un retard ne doit JAMAIS être filtré par l'horizon, même vieux ;
//   — la clé est le JOUR LOCAL, donc deux timestamps du même jour tombent dans
//     la même case.
import { describe, expect, it } from "vitest";
import type { Product } from "./db";
import { computeAssetAgenda, dayKey } from "./analytics";

const TODAY = new Date(2026, 2, 10, 9, 30).getTime(); // 10 mars 2026, 09:30 locale

const asset = (over: Partial<Product>): Product =>
  ({
    id: "p1",
    name: "Perceuse",
    is_asset: true,
    price: 5000,
    cost: 0,
    stock: 1,
    ...over,
  }) as Product;

describe("computeAssetAgenda", () => {
  it("ignore un produit qui n'est pas un actif", () => {
    const { byDay, agenda } = computeAssetAgenda(
      [asset({ is_asset: false, expected_return_date: TODAY + 86400000 })],
      TODAY,
    );
    expect(agenda).toHaveLength(0);
    expect(byDay.size).toBe(0);
  });

  it("ignore un actif sans date", () => {
    const { byDay, agenda } = computeAssetAgenda([asset({})], TODAY);
    expect(agenda).toHaveLength(0);
    expect(byDay.size).toBe(0);
  });

  it("classe un retour attendu", () => {
    const { agenda } = computeAssetAgenda(
      [asset({ expected_return_date: TODAY + 86400000 })],
      TODAY,
    );
    expect(agenda).toHaveLength(1);
    expect(agenda[0].kind).toBe("retour");
    expect(agenda[0].product.name).toBe("Perceuse");
  });

  it("distingue rappel et retour sur un même produit", () => {
    const { byDay } = computeAssetAgenda(
      [asset({ expected_return_date: TODAY + 86400000, reminderDate: TODAY + 5 * 86400000 })],
      TODAY,
    );
    const kinds = [...byDay.values()]
      .flat()
      .map((r) => r.kind)
      .sort();
    expect(kinds).toEqual(["rappel", "retour"]);
  });

  it("regroupe sur le jour local, pas sur les millisecondes", () => {
    // 08h et 23h le même jour : deux timestamps, une seule case.
    const matMs = new Date(2026, 2, 12, 8, 0, 0).getTime();
    const soirMs = new Date(2026, 2, 12, 23, 0, 0).getTime();
    const { byDay } = computeAssetAgenda(
      [asset({ id: "a", expected_return_date: matMs }), asset({ id: "b", reminderDate: soirMs })],
      TODAY,
    );
    expect(byDay.size).toBe(1);
    expect([...byDay.keys()][0]).toBe(dayKey(matMs));
  });

  it("conserve un retard, même très ancien", () => {
    const vieux = TODAY - 400 * 86400000;
    const { agenda } = computeAssetAgenda([asset({ expected_return_date: vieux })], TODAY, 30);
    expect(agenda).toHaveLength(1);
    expect(agenda[0].at).toBe(dayKey(vieux));
  });

  it("écarte une échéance au-delà de l'horizon, mais la garde au calendrier", () => {
    const loin = TODAY + 90 * 86400000;
    const { agenda, byDay } = computeAssetAgenda(
      [asset({ expected_return_date: loin })],
      TODAY,
      30,
    );
    expect(agenda).toHaveLength(0);
    expect(byDay.has(dayKey(loin))).toBe(true); // la pastille reste sur la case
  });

  it("trie par date croissante", () => {
    const { agenda } = computeAssetAgenda(
      [
        asset({ id: "c", expected_return_date: TODAY + 10 * 86400000 }),
        asset({ id: "a", expected_return_date: TODAY + 86400000 }),
        asset({ id: "b", expected_return_date: TODAY + 5 * 86400000 }),
      ],
      TODAY,
    );
    expect(agenda.map((r) => r.product.id)).toEqual(["a", "b", "c"]);
  });
});
