import { r as e } from "./rolldown-runtime-QTnfLwEv.js";
import { M as t, P as n, a as r } from "./utils-7o9Ncrmj.js";
import {
  a as i,
  b as a,
  f as o,
  g as s,
  l as c,
  n as l,
  s as u,
  t as d,
  w as f,
} from "./card-izC2g9JZ.js";
import { i as p, n as m, r as h, t as g } from "./label-CWF-dgEY.js";
import { t as _ } from "./chevron-up-BOu0KSCt.js";
import {
  C as v,
  M as y,
  O as b,
  a as x,
  i as S,
  n as C,
  o as w,
  r as T,
  s as E,
} from "./index-BJAoqMkh.js";
import { t as D } from "./badge-Bwm_fD3b.js";
import { n as O } from "./pin-DZXMeoF4.js";
var k = e(n()),
  A = t();
function j() {
  let { data: e = [] } = f({ queryKey: [`sales`, `all`], queryFn: () => a() }),
    t = e.reduce((e, t) => e + t.total, 0),
    n = (0, k.useMemo)(() => {
      let t = new Map();
      for (let n of e) {
        let e = new Date(n.timestamp).setHours(0, 0, 0, 0),
          r = t.get(e);
        r ? r.push(n) : t.set(e, [n]);
      }
      return Array.from(t.entries());
    }, [e]);
  return (0, A.jsxs)(`div`, {
    className: `mx-auto max-w-4xl px-4 py-6 space-y-4`,
    children: [
      (0, A.jsxs)(`div`, {
        children: [
          (0, A.jsxs)(`h1`, {
            className: `text-2xl font-bold flex items-center gap-2`,
            children: [(0, A.jsx)(y, { className: `h-6 w-6` }), ` Historique des ventes`],
          }),
          (0, A.jsxs)(`p`, {
            className: `text-sm text-muted-foreground`,
            children: [
              e.length,
              ` vente`,
              e.length > 1 ? `s` : ``,
              ` · Total encaissé`,
              ` `,
              (0, A.jsx)(`span`, { className: `font-semibold text-foreground`, children: u(t) }),
            ],
          }),
        ],
      }),
      e.length === 0
        ? (0, A.jsx)(d, {
            children: (0, A.jsx)(l, {
              className: `p-10 text-center text-muted-foreground`,
              children: `Aucune vente enregistrée.`,
            }),
          })
        : n.map(([e, t]) =>
            (0, A.jsxs)(
              `section`,
              {
                className: `space-y-2`,
                children: [
                  (0, A.jsxs)(`div`, {
                    className: `flex items-baseline justify-between gap-2 pt-2`,
                    children: [
                      (0, A.jsx)(`h2`, {
                        className: `font-semibold first-letter:uppercase`,
                        children: i(e),
                      }),
                      (0, A.jsxs)(`span`, {
                        className: `text-sm text-muted-foreground`,
                        children: [
                          t.length,
                          ` vente`,
                          t.length > 1 ? `s` : ``,
                          ` ·`,
                          ` `,
                          (0, A.jsx)(`span`, {
                            className: `font-semibold text-foreground`,
                            children: u(t.reduce((e, t) => e + t.total, 0)),
                          }),
                        ],
                      }),
                    ],
                  }),
                  t.map((e) => (0, A.jsx)(M, { sale: e }, e.id)),
                ],
              },
              e,
            ),
          ),
    ],
  });
}
function M({ sale: e }) {
  let [t, n] = (0, k.useState)(!1),
    [i, a] = (0, k.useState)(!1),
    [y, j] = (0, k.useState)(``),
    M = r(),
    N = f({ queryKey: [`sale_items`, e.id], queryFn: () => s(e.id), enabled: t }),
    P = p({
      mutationFn: () => o(e.id),
      onSuccess: () => {
        (M.invalidateQueries({ queryKey: [`sales`] }),
          M.invalidateQueries({ queryKey: [`products`] }),
          C.success(`Vente annulée, stock restauré`),
          a(!1),
          j(``));
      },
      onError: (e) => C.error(e.message),
    });
  return (0, A.jsxs)(d, {
    children: [
      (0, A.jsxs)(l, {
        className: `p-4`,
        children: [
          (0, A.jsxs)(`div`, {
            className: `flex items-center gap-3`,
            children: [
              (0, A.jsxs)(`div`, {
                className: `flex-1`,
                children: [
                  (0, A.jsx)(`div`, { className: `font-semibold`, children: c(e.timestamp) }),
                  (0, A.jsxs)(`div`, {
                    className: `text-sm text-muted-foreground`,
                    children: [`Donné `, u(e.cash_given), ` · Rendu `, u(e.change_due)],
                  }),
                ],
              }),
              (0, A.jsx)(`div`, {
                className: `text-xl font-bold text-primary`,
                children: u(e.total),
              }),
              e.day_closed && (0, A.jsx)(D, { variant: `secondary`, children: `clôturée` }),
              (0, A.jsx)(v, {
                variant: `ghost`,
                size: `icon`,
                onClick: () => n((e) => !e),
                children: t
                  ? (0, A.jsx)(_, { className: `h-4 w-4` })
                  : (0, A.jsx)(h, { className: `h-4 w-4` }),
              }),
              (0, A.jsx)(v, {
                variant: `ghost`,
                size: `icon`,
                onClick: () => a(!0),
                disabled: e.day_closed,
                children: (0, A.jsx)(b, { className: `h-4 w-4 text-destructive` }),
              }),
            ],
          }),
          t &&
            (0, A.jsx)(`div`, {
              className: `mt-3 border-t pt-3 space-y-1 text-sm`,
              children: N.data?.map((e) =>
                (0, A.jsxs)(
                  `div`,
                  {
                    className: `flex justify-between`,
                    children: [
                      (0, A.jsxs)(`span`, { children: [e.quantity, ` × `, e.name] }),
                      (0, A.jsx)(`span`, {
                        className: `font-medium`,
                        children: u(e.price_at_sale * e.quantity),
                      }),
                    ],
                  },
                  e.id,
                ),
              ),
            }),
        ],
      }),
      (0, A.jsx)(T, {
        open: i,
        onOpenChange: a,
        children: (0, A.jsxs)(S, {
          children: [
            (0, A.jsx)(w, { children: (0, A.jsx)(E, { children: `Annuler cette vente ?` }) }),
            (0, A.jsxs)(`div`, {
              className: `space-y-3`,
              children: [
                (0, A.jsx)(`p`, {
                  className: `text-sm text-muted-foreground`,
                  children: `Entrez le code PIN pour confirmer l'annulation. Le stock sera restauré.`,
                }),
                (0, A.jsxs)(`div`, {
                  children: [
                    (0, A.jsx)(g, { htmlFor: `pin`, children: `Code PIN` }),
                    (0, A.jsx)(m, {
                      id: `pin`,
                      type: `password`,
                      inputMode: `numeric`,
                      value: y,
                      onChange: (e) => j(e.target.value),
                      autoFocus: !0,
                    }),
                  ],
                }),
              ],
            }),
            (0, A.jsxs)(x, {
              children: [
                (0, A.jsx)(v, { variant: `ghost`, onClick: () => a(!1), children: `Annuler` }),
                (0, A.jsx)(v, {
                  variant: `destructive`,
                  onClick: () => {
                    if (!O(y)) {
                      C.error(`Code PIN incorrect`);
                      return;
                    }
                    P.mutate();
                  },
                  children: `Confirmer l'annulation`,
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
export { j as component };
