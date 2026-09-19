import { r as e } from "./rolldown-runtime-QTnfLwEv.js";
import { M as t, P as n, a as r, r as i, t as a } from "./utils-7o9Ncrmj.js";
import {
  C as o,
  d as s,
  h as c,
  i as l,
  n as u,
  r as d,
  s as f,
  t as p,
  u as m,
  w as h,
  y as g,
} from "./card-izC2g9JZ.js";
import { i as _, n as v, t as y } from "./label-CWF-dgEY.js";
import {
  a as b,
  c as x,
  i as ee,
  l as S,
  n as C,
  o as w,
  r as T,
  s as E,
  t as D,
} from "./select-7_heDHPZ.js";
import {
  A as O,
  C as k,
  D as A,
  S as j,
  _ as M,
  a as N,
  c as te,
  f as ne,
  i as re,
  n as P,
  o as ie,
  r as ae,
  s as oe,
  v as se,
  x as ce,
} from "./index-BJAoqMkh.js";
import { t as le } from "./badge-Bwm_fD3b.js";
import { o as F } from "./dist-BCEmwt1q.js";
var I = i(`pencil`, [
    [
      `path`,
      {
        d: `M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z`,
        key: `1a8usu`,
      },
    ],
    [`path`, { d: `m15 5 4 4`, key: `1mk7zo` }],
  ]),
  L = e(n(), 1),
  R = t(),
  z = `Checkbox`,
  [B, ue] = ce(z),
  [V, H] = B(z);
function U(e) {
  let {
      __scopeCheckbox: t,
      checked: n,
      children: r,
      defaultChecked: i,
      disabled: a,
      form: o,
      name: s,
      onCheckedChange: c,
      required: l,
      value: u = `on`,
      internal_do_not_use_render: d,
    } = e,
    [f, p] = se({ prop: n, defaultProp: i ?? !1, onChange: c, caller: z }),
    [m, h] = L.useState(null),
    [g, _] = L.useState(null),
    v = L.useRef(!1),
    y = !m || !!o || !!m.closest(`form`),
    b = {
      checked: f,
      disabled: a,
      setChecked: p,
      control: m,
      setControl: h,
      name: s,
      form: o,
      value: u,
      hasConsumerStoppedPropagationRef: v,
      required: l,
      defaultChecked: !Z(i) && i,
      isFormControl: y,
      bubbleInput: g,
      setBubbleInput: _,
    };
  return (0, R.jsx)(V, { scope: t, ...b, children: de(d) ? d(b) : r });
}
var W = `CheckboxTrigger`,
  G = L.forwardRef(({ __scopeCheckbox: e, onKeyDown: t, onClick: n, ...r }, i) => {
    let {
        control: a,
        value: o,
        disabled: s,
        checked: c,
        required: l,
        setControl: u,
        setChecked: d,
        hasConsumerStoppedPropagationRef: f,
        isFormControl: p,
        bubbleInput: m,
      } = H(W, e),
      h = A(i, u),
      g = L.useRef(c);
    return (
      L.useEffect(() => {
        let e = a?.form;
        if (e) {
          let t = () => d(g.current);
          return (e.addEventListener(`reset`, t), () => e.removeEventListener(`reset`, t));
        }
      }, [a, d]),
      (0, R.jsx)(M.button, {
        type: `button`,
        role: `checkbox`,
        "aria-checked": Z(c) ? `mixed` : c,
        "aria-required": l,
        "data-state": Q(c),
        "data-disabled": s ? `` : void 0,
        disabled: s,
        value: o,
        ...r,
        ref: h,
        onKeyDown: j(t, (e) => {
          e.key === `Enter` && e.preventDefault();
        }),
        onClick: j(n, (e) => {
          (d((e) => (Z(e) ? !0 : !e)),
            m && p && ((f.current = e.isPropagationStopped()), f.current || e.stopPropagation()));
        }),
      })
    );
  });
G.displayName = W;
var K = L.forwardRef((e, t) => {
  let {
    __scopeCheckbox: n,
    name: r,
    checked: i,
    defaultChecked: a,
    required: o,
    disabled: s,
    value: c,
    onCheckedChange: l,
    form: u,
    ...d
  } = e;
  return (0, R.jsx)(U, {
    __scopeCheckbox: n,
    checked: i,
    defaultChecked: a,
    disabled: s,
    required: o,
    onCheckedChange: l,
    name: r,
    form: u,
    value: c,
    internal_do_not_use_render: ({ isFormControl: e }) =>
      (0, R.jsxs)(R.Fragment, {
        children: [
          (0, R.jsx)(G, { ...d, ref: t, __scopeCheckbox: n }),
          e && (0, R.jsx)(X, { __scopeCheckbox: n }),
        ],
      }),
  });
});
K.displayName = z;
var q = `CheckboxIndicator`,
  J = L.forwardRef((e, t) => {
    let { __scopeCheckbox: n, forceMount: r, ...i } = e,
      a = H(q, n);
    return (0, R.jsx)(ne, {
      present: r || Z(a.checked) || a.checked === !0,
      children: (0, R.jsx)(M.span, {
        "data-state": Q(a.checked),
        "data-disabled": a.disabled ? `` : void 0,
        ...i,
        ref: t,
        style: { pointerEvents: `none`, ...e.style },
      }),
    });
  });
J.displayName = q;
var Y = `CheckboxBubbleInput`,
  X = L.forwardRef(({ __scopeCheckbox: e, ...t }, n) => {
    let {
        control: r,
        hasConsumerStoppedPropagationRef: i,
        checked: a,
        defaultChecked: o,
        required: s,
        disabled: c,
        name: l,
        value: u,
        form: d,
        bubbleInput: f,
        setBubbleInput: p,
      } = H(Y, e),
      m = A(n, p),
      h = w(a),
      g = F(r);
    L.useEffect(() => {
      let e = f;
      if (!e) return;
      let t = window.HTMLInputElement.prototype,
        n = Object.getOwnPropertyDescriptor(t, `checked`).set,
        r = !i.current;
      if (h !== a && n) {
        let t = new Event(`click`, { bubbles: r });
        ((e.indeterminate = Z(a)), n.call(e, !Z(a) && a), e.dispatchEvent(t));
      }
    }, [f, h, a, i]);
    let _ = L.useRef(!Z(a) && a);
    return (0, R.jsx)(M.input, {
      type: `checkbox`,
      "aria-hidden": !0,
      defaultChecked: o ?? _.current,
      required: s,
      disabled: c,
      name: l,
      value: u,
      form: d,
      ...t,
      tabIndex: -1,
      ref: m,
      style: {
        ...t.style,
        ...g,
        position: `absolute`,
        pointerEvents: `none`,
        opacity: 0,
        margin: 0,
        transform: `translateX(-100%)`,
      },
    });
  });
X.displayName = Y;
function de(e) {
  return typeof e == `function`;
}
function Z(e) {
  return e === `indeterminate`;
}
function Q(e) {
  return Z(e) ? `indeterminate` : e ? `checked` : `unchecked`;
}
var $ = L.forwardRef(({ className: e, ...t }, n) =>
  (0, R.jsx)(K, {
    ref: n,
    className: a(
      `grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground`,
      e,
    ),
    ...t,
    children: (0, R.jsx)(J, {
      className: a(`grid place-content-center text-current`),
      children: (0, R.jsx)(S, { className: `h-4 w-4` }),
    }),
  }),
);
$.displayName = K.displayName;
function fe() {
  let e = r(),
    { data: t = [] } = h({ queryKey: [`products`], queryFn: g }),
    [n, i] = (0, L.useState)(null),
    [a, o] = (0, L.useState)(!1),
    s = _({
      mutationFn: c,
      onSuccess: () => {
        (e.invalidateQueries({ queryKey: [`products`] }), P.success(`Produit supprimé`));
      },
    }),
    m = (0, L.useMemo)(() => {
      let e = {};
      for (let n of t) (e[n.category] ??= []).push(n);
      return e;
    }, [t]);
  return (0, R.jsxs)(`div`, {
    className: `mx-auto max-w-5xl px-4 py-6 space-y-6`,
    children: [
      (0, R.jsxs)(`div`, {
        className: `flex items-center justify-between`,
        children: [
          (0, R.jsxs)(`div`, {
            children: [
              (0, R.jsxs)(`h1`, {
                className: `text-2xl font-bold flex items-center gap-2`,
                children: [(0, R.jsx)(O, { className: `h-6 w-6` }), ` Stocks & Produits`],
              }),
              (0, R.jsx)(`p`, {
                className: `text-sm text-muted-foreground`,
                children: `Créez et mettez à jour vos articles avant de vendre.`,
              }),
            ],
          }),
          (0, R.jsxs)(ae, {
            open: a,
            onOpenChange: (e) => {
              (o(e), e || i(null));
            },
            children: [
              (0, R.jsx)(te, {
                asChild: !0,
                children: (0, R.jsxs)(k, {
                  size: `lg`,
                  onClick: () => i(null),
                  children: [(0, R.jsx)(x, { className: `h-5 w-5 mr-1` }), ` Nouveau produit`],
                }),
              }),
              (0, R.jsx)(pe, {
                editing: n,
                onClose: () => {
                  (o(!1), i(null));
                },
              }),
            ],
          }),
        ],
      }),
      t.length === 0
        ? (0, R.jsx)(p, {
            children: (0, R.jsx)(u, {
              className: `p-10 text-center text-muted-foreground`,
              children: `Aucun produit. Cliquez sur « Nouveau produit » pour commencer.`,
            }),
          })
        : Object.entries(m).map(([e, t]) =>
            (0, R.jsxs)(
              p,
              {
                children: [
                  (0, R.jsx)(d, {
                    className: `pb-3`,
                    children: (0, R.jsxs)(l, {
                      className: `text-base flex items-center gap-2`,
                      children: [e, (0, R.jsx)(le, { variant: `secondary`, children: t.length })],
                    }),
                  }),
                  (0, R.jsx)(u, {
                    className: `divide-y`,
                    children: t.map((e) =>
                      (0, R.jsxs)(
                        `div`,
                        {
                          className: `flex items-center justify-between py-3 gap-3`,
                          children: [
                            (0, R.jsxs)(`div`, {
                              className: `min-w-0`,
                              children: [
                                (0, R.jsx)(`div`, {
                                  className: `font-medium truncate`,
                                  children: e.name,
                                }),
                                (0, R.jsxs)(`div`, {
                                  className: `text-sm text-muted-foreground`,
                                  children: [
                                    e.cost > 0 &&
                                      (0, R.jsxs)(R.Fragment, {
                                        children: [`Achat `, f(e.cost), ` · `],
                                      }),
                                    `Vente `,
                                    f(e.price),
                                    e.cost > 0 &&
                                      (0, R.jsxs)(R.Fragment, {
                                        children: [` · Marge `, f(e.price - e.cost)],
                                      }),
                                    ` · Stock\xA0:`,
                                    ` `,
                                    (0, R.jsx)(`span`, {
                                      className:
                                        Number.isFinite(e.stock) && e.stock <= 5
                                          ? `text-destructive font-semibold`
                                          : ``,
                                      children: Number.isFinite(e.stock) ? e.stock : `∞`,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, R.jsxs)(`div`, {
                              className: `flex items-center gap-2`,
                              children: [
                                (0, R.jsx)(k, {
                                  size: `icon`,
                                  variant: `ghost`,
                                  onClick: () => {
                                    (i(e), o(!0));
                                  },
                                  children: (0, R.jsx)(I, { className: `h-4 w-4` }),
                                }),
                                (0, R.jsx)(k, {
                                  size: `icon`,
                                  variant: `ghost`,
                                  onClick: () => {
                                    confirm(`Supprimer "${e.name}" ?`) && s.mutate(e.id);
                                  },
                                  children: (0, R.jsx)(E, {
                                    className: `h-4 w-4 text-destructive`,
                                  }),
                                }),
                              ],
                            }),
                          ],
                        },
                        e.id,
                      ),
                    ),
                  }),
                ],
              },
              e,
            ),
          ),
    ],
  });
}
function pe({ editing: e, onClose: t }) {
  let n = r(),
    [i, a] = (0, L.useState)(e?.name ?? ``),
    [c, l] = (0, L.useState)(e?.cost ? String(e.cost) : ``),
    [u, d] = (0, L.useState)(e ? String(e.price) : ``),
    [f, p] = (0, L.useState)(e ? !Number.isFinite(e.stock) : !1),
    [h, g] = (0, L.useState)(e && Number.isFinite(e.stock) ? String(e.stock) : ``),
    [x, S] = (0, L.useState)(e?.category ?? `Boisson`),
    w = _({
      mutationFn: async () => {
        let t = {
          name: i.trim(),
          cost: Number(c) || 0,
          price: Number(u) || 0,
          stock: f ? 1 / 0 : Number(h) || 0,
          category: x,
        };
        if (!t.name) throw Error(`Nom requis`);
        if (t.price <= 0) throw Error(`Prix invalide`);
        e ? await o({ ...e, ...t }) : await s(t);
      },
      onSuccess: () => {
        (n.invalidateQueries({ queryKey: [`products`] }),
          P.success(e ? `Produit mis à jour` : `Produit ajouté`),
          t());
      },
      onError: (e) => P.error(e.message),
    });
  return (0, R.jsxs)(re, {
    children: [
      (0, R.jsx)(ie, {
        children: (0, R.jsx)(oe, { children: e ? `Modifier le produit` : `Nouveau produit` }),
      }),
      (0, R.jsxs)(`div`, {
        className: `space-y-4`,
        children: [
          (0, R.jsxs)(`div`, {
            children: [
              (0, R.jsx)(y, { htmlFor: `name`, children: `Nom` }),
              (0, R.jsx)(v, {
                id: `name`,
                value: i,
                onChange: (e) => a(e.target.value),
                placeholder: `Ex : Regab`,
              }),
            ],
          }),
          (0, R.jsxs)(`div`, {
            className: `grid grid-cols-3 gap-3`,
            children: [
              (0, R.jsxs)(`div`, {
                children: [
                  (0, R.jsx)(y, { htmlFor: `cost`, children: `Prix d'achat` }),
                  (0, R.jsx)(v, {
                    id: `cost`,
                    inputMode: `numeric`,
                    value: c,
                    onChange: (e) => l(e.target.value.replace(/\D/g, ``)),
                    placeholder: `200`,
                  }),
                ],
              }),
              (0, R.jsxs)(`div`, {
                children: [
                  (0, R.jsx)(y, { htmlFor: `price`, children: `Prix de vente` }),
                  (0, R.jsx)(v, {
                    id: `price`,
                    inputMode: `numeric`,
                    value: u,
                    onChange: (e) => d(e.target.value.replace(/\D/g, ``)),
                    placeholder: `300`,
                  }),
                ],
              }),
              (0, R.jsxs)(`div`, {
                children: [
                  (0, R.jsx)(y, { htmlFor: `stock`, children: `Stock` }),
                  (0, R.jsx)(v, {
                    id: `stock`,
                    inputMode: `numeric`,
                    value: h,
                    onChange: (e) => g(e.target.value.replace(/\D/g, ``)),
                    placeholder: `50`,
                    disabled: f,
                  }),
                ],
              }),
            ],
          }),
          (0, R.jsxs)(`div`, {
            className: `flex items-center gap-2`,
            children: [
              (0, R.jsx)($, { id: `unlimited`, checked: f, onCheckedChange: (e) => p(!!e) }),
              (0, R.jsx)(y, {
                htmlFor: `unlimited`,
                className: `cursor-pointer`,
                children: `Stock illimité (service)`,
              }),
            ],
          }),
          (0, R.jsxs)(`div`, {
            children: [
              (0, R.jsx)(y, { children: `Catégorie` }),
              (0, R.jsxs)(D, {
                value: x,
                onValueChange: (e) => S(e),
                children: [
                  (0, R.jsx)(ee, { children: (0, R.jsx)(b, {}) }),
                  (0, R.jsx)(C, {
                    children: m.map((e) => (0, R.jsx)(T, { value: e, children: e }, e)),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      (0, R.jsxs)(N, {
        children: [
          (0, R.jsx)(k, { variant: `ghost`, onClick: t, children: `Annuler` }),
          (0, R.jsx)(k, {
            onClick: () => w.mutate(),
            disabled: w.isPending,
            children: `Enregistrer`,
          }),
        ],
      }),
    ],
  });
}
export { fe as component };
