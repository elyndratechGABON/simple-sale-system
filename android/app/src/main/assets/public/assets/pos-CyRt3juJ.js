import { r as e } from "./rolldown-runtime-QTnfLwEv.js";
import { M as t, P as n, a as r, r as i, t as a } from "./utils-7o9Ncrmj.js";
import { m as o, n as s, s as c, t as l, u, w as d, y as f } from "./card-izC2g9JZ.js";
import { i as p, n as m, t as h } from "./label-CWF-dgEY.js";
import { a as g, c as _, i as v, n as y, r as b, s as x, t as S } from "./select-7_heDHPZ.js";
import {
  C,
  I as w,
  O as T,
  a as E,
  i as D,
  k as O,
  n as k,
  o as A,
  r as j,
  s as M,
} from "./index-BJAoqMkh.js";
var N = i(`circle-check`, [
    [`circle`, { cx: `12`, cy: `12`, r: `10`, key: `1mglay` }],
    [`path`, { d: `m9 12 2 2 4-4`, key: `dzmm74` }],
  ]),
  P = i(`minus`, [[`path`, { d: `M5 12h14`, key: `1ays0h` }]]),
  F = e(n()),
  I = t(),
  L = [500, 1e3, 2e3, 5e3, 1e4];
function R() {
  let e = r(),
    { data: t = [] } = d({ queryKey: [`products`], queryFn: f }),
    [n, i] = (0, F.useState)(!1),
    [u, h] = (0, F.useState)({}),
    [g, v] = (0, F.useState)([]),
    [y, b] = (0, F.useState)(!1),
    [S, E] = (0, F.useState)(``),
    [D, A] = (0, F.useState)(`Tous`),
    j = (0, F.useMemo)(() => {
      let e = new Set();
      return (t.forEach((t) => e.add(t.category)), Array.from(e));
    }, [t]),
    M = (0, F.useMemo)(
      () => [
        ...Object.entries(u)
          .map(([e, n]) => {
            let r = t.find((t) => t.id === e);
            return !r || n <= 0
              ? null
              : {
                  key: r.id,
                  product_id: r.id,
                  name: r.name,
                  price: r.price,
                  cost: r.cost,
                  category: r.category,
                  quantity: n,
                };
          })
          .filter((e) => !!e),
        ...g,
      ],
      [u, t, g],
    ),
    R = M.reduce((e, t) => e + t.price * t.quantity, 0),
    V = Number(S) || 0,
    H = V - R,
    U = V > 0 && H < 0,
    W = M.length > 0 && V >= R && R > 0,
    G = D === `Tous` ? t : t.filter((e) => e.category === D),
    K = p({
      mutationFn: () => o({ lines: M.map(({ key: e, ...t }) => t), cash_given: V }),
      onSuccess: (t) => {
        (e.invalidateQueries({ queryKey: [`products`] }),
          e.invalidateQueries({ queryKey: [`sales`] }),
          k.success(`Vente enregistrée`, {
            description: `Total ${c(t.total)} · Rendu ${c(t.change_due)}`,
          }),
          q());
      },
      onError: (e) => k.error(e.message),
    });
  function q() {
    (h({}), v([]), E(``), i(!1));
  }
  function J(e) {
    h((t) => {
      let n = (t[e.id] ?? 0) + 1;
      return Number.isFinite(e.stock) && n > e.stock
        ? (k.warning(`Stock insuffisant pour ${e.name}`), t)
        : { ...t, [e.id]: n };
    });
  }
  function Y(e) {
    if (e.product_id) {
      let n = t.find((t) => t.id === e.product_id);
      n && J(n);
      return;
    }
    v((t) => t.map((t) => (t.key === e.key ? { ...t, quantity: t.quantity + 1 } : t)));
  }
  function X(e) {
    if (e.product_id) {
      let t = e.product_id;
      h((e) => {
        let n = (e[t] ?? 0) - 1,
          r = { ...e };
        return (n <= 0 ? delete r[t] : (r[t] = n), r);
      });
      return;
    }
    v((t) =>
      t
        .map((t) => (t.key === e.key ? { ...t, quantity: t.quantity - 1 } : t))
        .filter((e) => e.quantity > 0),
    );
  }
  function Z(e) {
    if (e.product_id) {
      let t = e.product_id;
      h((e) => {
        let n = { ...e };
        return (delete n[t], n);
      });
      return;
    }
    v((t) => t.filter((t) => t.key !== e.key));
  }
  return n
    ? (0, I.jsxs)(`div`, {
        className: `mx-auto max-w-7xl px-4 py-4 grid gap-4 lg:grid-cols-[1fr_400px]`,
        children: [
          (0, I.jsxs)(`div`, {
            className: `space-y-3`,
            children: [
              (0, I.jsxs)(`div`, {
                className: `flex items-center justify-between gap-2 flex-wrap`,
                children: [
                  (0, I.jsx)(`h2`, { className: `text-xl font-bold`, children: `Articles` }),
                  (0, I.jsxs)(`div`, {
                    className: `flex gap-1 flex-wrap`,
                    children: [
                      (0, I.jsx)(B, {
                        active: D === `Tous`,
                        onClick: () => A(`Tous`),
                        children: `Tous`,
                      }),
                      j.map((e) =>
                        (0, I.jsx)(B, { active: D === e, onClick: () => A(e), children: e }, e),
                      ),
                    ],
                  }),
                ],
              }),
              (0, I.jsx)(`div`, {
                className: `grid grid-cols-2 sm:grid-cols-3 gap-3`,
                children: G.map((e) => {
                  let t = u[e.id] ?? 0,
                    n = Number.isFinite(e.stock) && e.stock - t <= 0;
                  return (0, I.jsxs)(
                    `button`,
                    {
                      onClick: () => J(e),
                      disabled: n,
                      className: a(
                        `relative rounded-xl border bg-card p-4 text-left min-h-[100px] transition-all`,
                        `hover:border-primary hover:shadow-md active:scale-[0.98]`,
                        n && `opacity-50 cursor-not-allowed`,
                      ),
                      children: [
                        (0, I.jsx)(`div`, {
                          className: `font-semibold leading-tight`,
                          children: e.name,
                        }),
                        (0, I.jsx)(`div`, {
                          className: `mt-1 text-lg font-bold text-primary`,
                          children: c(e.price),
                        }),
                        (0, I.jsxs)(`div`, {
                          className: `mt-1 text-xs text-muted-foreground`,
                          children: [`Stock : `, Number.isFinite(e.stock) ? e.stock - t : `∞`],
                        }),
                        t > 0 &&
                          (0, I.jsx)(`span`, {
                            className: `absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow`,
                            children: t,
                          }),
                      ],
                    },
                    e.id,
                  );
                }),
              }),
              t.length === 0 &&
                (0, I.jsx)(`p`, {
                  className: `text-sm text-muted-foreground`,
                  children: `Aucun produit au catalogue. Utilisez « Article manuel » dans le panier pour saisir la vente à la main.`,
                }),
            ],
          }),
          (0, I.jsx)(l, {
            className: `lg:sticky lg:top-20 h-fit`,
            children: (0, I.jsxs)(s, {
              className: `p-4 space-y-4`,
              children: [
                (0, I.jsxs)(`div`, {
                  className: `flex items-center justify-between`,
                  children: [
                    (0, I.jsxs)(`h2`, {
                      className: `text-lg font-bold flex items-center gap-2`,
                      children: [(0, I.jsx)(O, { className: `h-5 w-5` }), ` Panier`],
                    }),
                    (0, I.jsxs)(C, {
                      size: `sm`,
                      variant: `ghost`,
                      onClick: q,
                      children: [(0, I.jsx)(T, { className: `h-4 w-4 mr-1` }), ` Annuler`],
                    }),
                  ],
                }),
                (0, I.jsxs)(C, {
                  variant: `outline`,
                  size: `sm`,
                  className: `w-full`,
                  onClick: () => b(!0),
                  children: [(0, I.jsx)(_, { className: `h-4 w-4 mr-1` }), ` Article manuel`],
                }),
                M.length === 0
                  ? (0, I.jsx)(`p`, {
                      className: `text-sm text-muted-foreground py-6 text-center`,
                      children: `Ajoutez des articles depuis la grille ou saisissez-les à la main.`,
                    })
                  : (0, I.jsx)(`div`, {
                      className: `space-y-2 max-h-64 overflow-auto`,
                      children: M.map((e) =>
                        (0, I.jsxs)(
                          `div`,
                          {
                            className: `flex items-center gap-2`,
                            children: [
                              (0, I.jsxs)(`div`, {
                                className: `flex-1 min-w-0`,
                                children: [
                                  (0, I.jsx)(`div`, {
                                    className: `font-medium truncate`,
                                    children: e.name,
                                  }),
                                  (0, I.jsxs)(`div`, {
                                    className: `text-xs text-muted-foreground`,
                                    children: [c(e.price), ` × `, e.quantity],
                                  }),
                                ],
                              }),
                              (0, I.jsxs)(`div`, {
                                className: `flex items-center gap-1`,
                                children: [
                                  (0, I.jsx)(C, {
                                    size: `icon`,
                                    variant: `outline`,
                                    className: `h-8 w-8`,
                                    onClick: () => X(e),
                                    children: (0, I.jsx)(P, { className: `h-3 w-3` }),
                                  }),
                                  (0, I.jsx)(`span`, {
                                    className: `w-6 text-center font-semibold`,
                                    children: e.quantity,
                                  }),
                                  (0, I.jsx)(C, {
                                    size: `icon`,
                                    variant: `outline`,
                                    className: `h-8 w-8`,
                                    onClick: () => Y(e),
                                    children: (0, I.jsx)(_, { className: `h-3 w-3` }),
                                  }),
                                  (0, I.jsx)(C, {
                                    size: `icon`,
                                    variant: `ghost`,
                                    className: `h-8 w-8`,
                                    onClick: () => Z(e),
                                    children: (0, I.jsx)(x, {
                                      className: `h-3 w-3 text-destructive`,
                                    }),
                                  }),
                                ],
                              }),
                              (0, I.jsx)(`div`, {
                                className: `w-20 text-right font-semibold`,
                                children: c(e.price * e.quantity),
                              }),
                            ],
                          },
                          e.key,
                        ),
                      ),
                    }),
                (0, I.jsxs)(`div`, {
                  className: `border-t pt-3 flex items-center justify-between`,
                  children: [
                    (0, I.jsx)(`span`, { className: `text-lg font-semibold`, children: `Total` }),
                    (0, I.jsx)(`span`, {
                      className: `text-3xl font-bold text-primary`,
                      children: c(R),
                    }),
                  ],
                }),
                (0, I.jsxs)(`div`, {
                  className: `space-y-2`,
                  children: [
                    (0, I.jsx)(`label`, {
                      className: `text-sm font-medium`,
                      children: `Argent donné`,
                    }),
                    (0, I.jsx)(m, {
                      inputMode: `numeric`,
                      value: S,
                      onChange: (e) => E(e.target.value.replace(/\D/g, ``)),
                      placeholder: `0`,
                      className: `h-14 text-2xl text-right font-bold`,
                    }),
                    (0, I.jsxs)(`div`, {
                      className: `flex flex-wrap gap-1`,
                      children: [
                        L.map((e) =>
                          (0, I.jsxs)(
                            C,
                            {
                              variant: `secondary`,
                              size: `sm`,
                              onClick: () => E(String((Number(S) || 0) + e)),
                              children: [`+`, c(e)],
                            },
                            e,
                          ),
                        ),
                        (0, I.jsx)(C, {
                          variant: `ghost`,
                          size: `sm`,
                          onClick: () => E(``),
                          children: `Vider`,
                        }),
                      ],
                    }),
                  ],
                }),
                (0, I.jsxs)(`div`, {
                  className: a(
                    `rounded-lg p-4 flex items-center justify-between`,
                    U ? `bg-destructive/10` : `bg-accent`,
                  ),
                  children: [
                    (0, I.jsx)(`span`, {
                      className: `font-semibold`,
                      children: U ? `Manque` : `Monnaie à rendre`,
                    }),
                    (0, I.jsx)(`span`, {
                      className: a(`text-3xl font-bold`, U ? `text-destructive` : `text-primary`),
                      children: c(Math.abs(H)),
                    }),
                  ],
                }),
                U &&
                  (0, I.jsxs)(`p`, {
                    className: `text-sm text-destructive`,
                    children: [`Montant insuffisant. Demander au moins `, c(R), `.`],
                  }),
                (0, I.jsxs)(C, {
                  size: `lg`,
                  className: `w-full h-16 text-lg gap-2`,
                  disabled: !W || K.isPending,
                  onClick: () => K.mutate(),
                  children: [(0, I.jsx)(N, { className: `h-5 w-5` }), `Valider la vente`],
                }),
              ],
            }),
          }),
          (0, I.jsx)(z, { open: y, onOpenChange: b, onAdd: (e) => v((t) => [...t, e]) }),
        ],
      })
    : (0, I.jsxs)(`div`, {
        className: `mx-auto max-w-3xl px-4 py-16 flex flex-col items-center gap-8`,
        children: [
          (0, I.jsxs)(`div`, {
            className: `text-center space-y-2`,
            children: [
              (0, I.jsx)(`h1`, { className: `text-3xl font-bold`, children: `Caisse` }),
              (0, I.jsx)(`p`, {
                className: `text-muted-foreground`,
                children: `Démarrez une commande pour encaisser un client.`,
              }),
            ],
          }),
          (0, I.jsxs)(C, {
            size: `lg`,
            className: `h-24 w-full max-w-md text-2xl gap-3 shadow-lg`,
            onClick: () => i(!0),
            children: [(0, I.jsx)(_, { className: `h-8 w-8` }), `Nouvelle commande`],
          }),
          t.length === 0 &&
            (0, I.jsxs)(`div`, {
              className: `text-center text-sm text-muted-foreground`,
              children: [
                `Aucun produit enregistré — vous pouvez quand même encaisser en saisissant les articles à la main.`,
                ` `,
                (0, I.jsx)(w, {
                  to: `/stocks`,
                  className: `text-primary underline`,
                  children: `Ajouter des produits`,
                }),
              ],
            }),
        ],
      });
}
function z({ open: e, onOpenChange: t, onAdd: n }) {
  let [r, i] = (0, F.useState)(``),
    [a, o] = (0, F.useState)(``),
    [s, c] = (0, F.useState)(``),
    [l, d] = (0, F.useState)(`1`),
    [f, p] = (0, F.useState)(`Boisson`);
  function _() {
    (i(``), o(``), c(``), d(`1`), p(`Boisson`));
  }
  function x() {
    let e = r.trim();
    if (!e) {
      k.error(`Libellé requis`);
      return;
    }
    if ((Number(s) || 0) <= 0) {
      k.error(`Prix de vente invalide`);
      return;
    }
    (n({
      key: `libre_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: e,
      cost: Number(a) || 0,
      price: Number(s),
      category: f,
      quantity: Math.max(1, Number(l) || 1),
    }),
      _(),
      t(!1));
  }
  return (0, I.jsx)(j, {
    open: e,
    onOpenChange: (e) => {
      (e || _(), t(e));
    },
    children: (0, I.jsxs)(D, {
      children: [
        (0, I.jsx)(A, { children: (0, I.jsx)(M, { children: `Article manuel` }) }),
        (0, I.jsxs)(`div`, {
          className: `space-y-4`,
          children: [
            (0, I.jsxs)(`div`, {
              children: [
                (0, I.jsx)(h, { htmlFor: `free-name`, children: `Libellé` }),
                (0, I.jsx)(m, {
                  id: `free-name`,
                  value: r,
                  onChange: (e) => i(e.target.value),
                  placeholder: `Ex : Regab`,
                  autoFocus: !0,
                }),
              ],
            }),
            (0, I.jsxs)(`div`, {
              className: `grid grid-cols-3 gap-3`,
              children: [
                (0, I.jsxs)(`div`, {
                  children: [
                    (0, I.jsx)(h, { htmlFor: `free-cost`, children: `Prix d'achat` }),
                    (0, I.jsx)(m, {
                      id: `free-cost`,
                      inputMode: `numeric`,
                      value: a,
                      onChange: (e) => o(e.target.value.replace(/\D/g, ``)),
                      placeholder: `200`,
                    }),
                  ],
                }),
                (0, I.jsxs)(`div`, {
                  children: [
                    (0, I.jsx)(h, { htmlFor: `free-price`, children: `Prix de vente` }),
                    (0, I.jsx)(m, {
                      id: `free-price`,
                      inputMode: `numeric`,
                      value: s,
                      onChange: (e) => c(e.target.value.replace(/\D/g, ``)),
                      placeholder: `300`,
                    }),
                  ],
                }),
                (0, I.jsxs)(`div`, {
                  children: [
                    (0, I.jsx)(h, { htmlFor: `free-qty`, children: `Quantité` }),
                    (0, I.jsx)(m, {
                      id: `free-qty`,
                      inputMode: `numeric`,
                      value: l,
                      onChange: (e) => d(e.target.value.replace(/\D/g, ``)),
                      placeholder: `1`,
                    }),
                  ],
                }),
              ],
            }),
            (0, I.jsxs)(`div`, {
              children: [
                (0, I.jsx)(h, { children: `Catégorie` }),
                (0, I.jsxs)(S, {
                  value: f,
                  onValueChange: (e) => p(e),
                  children: [
                    (0, I.jsx)(v, { children: (0, I.jsx)(g, {}) }),
                    (0, I.jsx)(y, {
                      children: u.map((e) => (0, I.jsx)(b, { value: e, children: e }, e)),
                    }),
                  ],
                }),
              ],
            }),
            (0, I.jsx)(`p`, {
              className: `text-xs text-muted-foreground`,
              children: `Sans prix d'achat, cette vente comptera entièrement comme bénéfice dans les rapports.`,
            }),
          ],
        }),
        (0, I.jsxs)(E, {
          children: [
            (0, I.jsx)(C, { variant: `ghost`, onClick: () => t(!1), children: `Annuler` }),
            (0, I.jsx)(C, { onClick: x, children: `Ajouter au panier` }),
          ],
        }),
      ],
    }),
  });
}
function B({ active: e, onClick: t, children: n }) {
  return (0, I.jsx)(`button`, {
    onClick: t,
    className: a(
      `px-3 py-1 rounded-full text-sm border transition-colors`,
      e ? `bg-primary text-primary-foreground border-primary` : `bg-card hover:bg-accent`,
    ),
    children: n,
  });
}
export { R as component };
