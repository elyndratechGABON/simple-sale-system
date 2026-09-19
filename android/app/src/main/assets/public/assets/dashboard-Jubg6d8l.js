import { r as e } from "./rolldown-runtime-QTnfLwEv.js";
import { M as t, P as n, n as r, r as i } from "./utils-7o9Ncrmj.js";
import { S as a, c as o, i as s, n as c, o as l, r as u, s as d, t as f } from "./card-izC2g9JZ.js";
import { I as p, j as m } from "./index-BJAoqMkh.js";
import {
  A as h,
  B as g,
  C as _,
  D as v,
  E as y,
  F as b,
  H as x,
  L as ee,
  M as S,
  O as C,
  P as w,
  R as T,
  T as E,
  U as D,
  V as O,
  _ as k,
  a as A,
  b as j,
  i as M,
  j as te,
  n as ne,
  o as N,
  r as re,
  s as ie,
  t as ae,
  v as oe,
  w as se,
  x as ce,
  y as le,
  z as P,
} from "./chart-CUH6xCOy.js";
var ue = i(`trending-up`, [
    [`path`, { d: `M16 7h6v6`, key: `box55l` }],
    [`path`, { d: `m22 7-8.5 8.5-5-5L2 17`, key: `1t1m79` }],
  ]),
  F = e(n()),
  I = e(D()),
  L = e(te()),
  R = e(x()),
  de = e(O()),
  z = e(h()),
  fe = [`layout`, `type`, `stroke`, `connectNulls`, `isRange`, `ref`],
  pe = [`key`],
  B;
function V(e) {
  "@babel/helpers - typeof";
  return (
    (V =
      typeof Symbol == `function` && typeof Symbol.iterator == `symbol`
        ? function (e) {
            return typeof e;
          }
        : function (e) {
            return e &&
              typeof Symbol == `function` &&
              e.constructor === Symbol &&
              e !== Symbol.prototype
              ? `symbol`
              : typeof e;
          }),
    V(e)
  );
}
function H(e, t) {
  if (e == null) return {};
  var n = me(e, t),
    r,
    i;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(e);
    for (i = 0; i < a.length; i++)
      ((r = a[i]),
        !(t.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(e, r) && (n[r] = e[r]));
  }
  return n;
}
function me(e, t) {
  if (e == null) return {};
  var n = {};
  for (var r in e)
    if (Object.prototype.hasOwnProperty.call(e, r)) {
      if (t.indexOf(r) >= 0) continue;
      n[r] = e[r];
    }
  return n;
}
function U() {
  return (
    (U = Object.assign
      ? Object.assign.bind()
      : function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var n = arguments[t];
            for (var r in n) Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
          }
          return e;
        }),
    U.apply(this, arguments)
  );
}
function W(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    (t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      n.push.apply(n, r));
  }
  return n;
}
function G(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] == null ? {} : arguments[t];
    t % 2
      ? W(Object(n), !0).forEach(function (t) {
          X(e, t, n[t]);
        })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
        : W(Object(n)).forEach(function (t) {
            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
          });
  }
  return e;
}
function he(e, t) {
  if (!(e instanceof t)) throw TypeError(`Cannot call a class as a function`);
}
function K(e, t) {
  for (var n = 0; n < t.length; n++) {
    var r = t[n];
    ((r.enumerable = r.enumerable || !1),
      (r.configurable = !0),
      `value` in r && (r.writable = !0),
      Object.defineProperty(e, Z(r.key), r));
  }
}
function ge(e, t, n) {
  return (
    t && K(e.prototype, t),
    n && K(e, n),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    e
  );
}
function _e(e, t, n) {
  return ((t = J(t)), ve(e, q() ? Reflect.construct(t, n || [], J(e).constructor) : t.apply(e, n)));
}
function ve(e, t) {
  if (t && (V(t) === `object` || typeof t == `function`)) return t;
  if (t !== void 0) throw TypeError(`Derived constructors may only return object or undefined`);
  return ye(e);
}
function ye(e) {
  if (e === void 0)
    throw ReferenceError(`this hasn't been initialised - super() hasn't been called`);
  return e;
}
function q() {
  try {
    var e = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
  } catch {}
  return (q = function () {
    return !!e;
  })();
}
function J(e) {
  return (
    (J = Object.setPrototypeOf
      ? Object.getPrototypeOf.bind()
      : function (e) {
          return e.__proto__ || Object.getPrototypeOf(e);
        }),
    J(e)
  );
}
function be(e, t) {
  if (typeof t != `function` && t !== null)
    throw TypeError(`Super expression must either be null or a function`);
  ((e.prototype = Object.create(t && t.prototype, {
    constructor: { value: e, writable: !0, configurable: !0 },
  })),
    Object.defineProperty(e, "prototype", { writable: !1 }),
    t && Y(e, t));
}
function Y(e, t) {
  return (
    (Y = Object.setPrototypeOf
      ? Object.setPrototypeOf.bind()
      : function (e, t) {
          return ((e.__proto__ = t), e);
        }),
    Y(e, t)
  );
}
function X(e, t, n) {
  return (
    (t = Z(t)),
    t in e
      ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 })
      : (e[t] = n),
    e
  );
}
function Z(e) {
  var t = xe(e, `string`);
  return V(t) == `symbol` ? t : t + ``;
}
function xe(e, t) {
  if (V(e) != `object` || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || `default`);
    if (V(r) != `object`) return r;
    throw TypeError(`@@toPrimitive must return a primitive value.`);
  }
  return (t === `string` ? String : Number)(e);
}
var Q = (function (e) {
  function t() {
    var e;
    he(this, t);
    var n = [...arguments];
    return (
      (e = _e(this, t, [].concat(n))),
      X(e, `state`, { isAnimationFinished: !0 }),
      X(e, `id`, g(`recharts-area-`)),
      X(e, `handleAnimationEnd`, function () {
        var t = e.props.onAnimationEnd;
        (e.setState({ isAnimationFinished: !0 }), (0, I.default)(t) && t());
      }),
      X(e, `handleAnimationStart`, function () {
        var t = e.props.onAnimationStart;
        (e.setState({ isAnimationFinished: !1 }), (0, I.default)(t) && t());
      }),
      e
    );
  }
  return (
    be(t, e),
    ge(
      t,
      [
        {
          key: `renderDots`,
          value: function (e, n, r) {
            var i = this.props.isAnimationActive,
              a = this.state.isAnimationFinished;
            if (i && !a) return null;
            var o = this.props,
              s = o.dot,
              c = o.points,
              l = o.dataKey,
              u = b(this.props, !1),
              d = b(s, !0),
              f = c.map(function (e, n) {
                var r = G(
                  G(G({ key: `dot-${n}`, r: 3 }, u), d),
                  {},
                  {
                    index: n,
                    cx: e.x,
                    cy: e.y,
                    dataKey: l,
                    value: e.value,
                    payload: e.payload,
                    points: c,
                  },
                );
                return t.renderDotItem(s, r);
              }),
              p = { clipPath: e ? `url(#clipPath-${n ? `` : `dots-`}${r})` : null };
            return F.createElement(w, U({ className: `recharts-area-dots` }, p), f);
          },
        },
        {
          key: `renderHorizontalRect`,
          value: function (e) {
            var t = this.props,
              n = t.baseLine,
              r = t.points,
              i = t.strokeWidth,
              a = r[0].x,
              o = r[r.length - 1].x,
              s = e * Math.abs(a - o),
              c = (0, L.default)(
                r.map(function (e) {
                  return e.y || 0;
                }),
              );
            return (
              P(n) && typeof n == `number`
                ? (c = Math.max(n, c))
                : n &&
                  Array.isArray(n) &&
                  n.length &&
                  (c = Math.max(
                    (0, L.default)(
                      n.map(function (e) {
                        return e.y || 0;
                      }),
                    ),
                    c,
                  )),
              P(c)
                ? F.createElement(`rect`, {
                    x: a < o ? a : a - s,
                    y: 0,
                    width: s,
                    height: Math.floor(c + (i ? parseInt(`${i}`, 10) : 1)),
                  })
                : null
            );
          },
        },
        {
          key: `renderVerticalRect`,
          value: function (e) {
            var t = this.props,
              n = t.baseLine,
              r = t.points,
              i = t.strokeWidth,
              a = r[0].y,
              o = r[r.length - 1].y,
              s = e * Math.abs(a - o),
              c = (0, L.default)(
                r.map(function (e) {
                  return e.x || 0;
                }),
              );
            return (
              P(n) && typeof n == `number`
                ? (c = Math.max(n, c))
                : n &&
                  Array.isArray(n) &&
                  n.length &&
                  (c = Math.max(
                    (0, L.default)(
                      n.map(function (e) {
                        return e.x || 0;
                      }),
                    ),
                    c,
                  )),
              P(c)
                ? F.createElement(`rect`, {
                    x: 0,
                    y: a < o ? a : a - s,
                    width: c + (i ? parseInt(`${i}`, 10) : 1),
                    height: Math.floor(s),
                  })
                : null
            );
          },
        },
        {
          key: `renderClipRect`,
          value: function (e) {
            return this.props.layout === `vertical`
              ? this.renderVerticalRect(e)
              : this.renderHorizontalRect(e);
          },
        },
        {
          key: `renderAreaStatically`,
          value: function (e, t, n, r) {
            var i = this.props,
              a = i.layout,
              o = i.type,
              s = i.stroke,
              c = i.connectNulls,
              l = i.isRange;
            i.ref;
            var u = H(i, fe);
            return F.createElement(
              w,
              { clipPath: n ? `url(#clipPath-${r})` : null },
              F.createElement(
                E,
                U({}, b(u, !0), {
                  points: e,
                  connectNulls: c,
                  type: o,
                  baseLine: t,
                  layout: a,
                  stroke: `none`,
                  className: `recharts-area-area`,
                }),
              ),
              s !== `none` &&
                F.createElement(
                  E,
                  U({}, b(this.props, !1), {
                    className: `recharts-area-curve`,
                    layout: a,
                    type: o,
                    connectNulls: c,
                    fill: `none`,
                    points: e,
                  }),
                ),
              s !== `none` &&
                l &&
                F.createElement(
                  E,
                  U({}, b(this.props, !1), {
                    className: `recharts-area-curve`,
                    layout: a,
                    type: o,
                    connectNulls: c,
                    fill: `none`,
                    points: t,
                  }),
                ),
            );
          },
        },
        {
          key: `renderAreaWithAnimation`,
          value: function (e, t) {
            var n = this,
              r = this.props,
              i = r.points,
              a = r.baseLine,
              o = r.isAnimationActive,
              s = r.animationBegin,
              c = r.animationDuration,
              l = r.animationEasing,
              u = r.animationId,
              d = this.state,
              f = d.prevPoints,
              p = d.prevBaseLine;
            return F.createElement(
              se,
              {
                begin: s,
                duration: c,
                isActive: o,
                easing: l,
                from: { t: 0 },
                to: { t: 1 },
                key: `area-${u}`,
                onAnimationEnd: this.handleAnimationEnd,
                onAnimationStart: this.handleAnimationStart,
              },
              function (r) {
                var o = r.t;
                if (f) {
                  var s = f.length / i.length,
                    c = i.map(function (e, t) {
                      var n = Math.floor(t * s);
                      if (f[n]) {
                        var r = f[n],
                          i = T(r.x, e.x),
                          a = T(r.y, e.y);
                        return G(G({}, e), {}, { x: i(o), y: a(o) });
                      }
                      return e;
                    }),
                    l =
                      P(a) && typeof a == `number`
                        ? T(p, a)(o)
                        : (0, R.default)(a) || (0, de.default)(a)
                          ? T(p, 0)(o)
                          : a.map(function (e, t) {
                              var n = Math.floor(t * s);
                              if (p[n]) {
                                var r = p[n],
                                  i = T(r.x, e.x),
                                  a = T(r.y, e.y);
                                return G(G({}, e), {}, { x: i(o), y: a(o) });
                              }
                              return e;
                            });
                  return n.renderAreaStatically(c, l, e, t);
                }
                return F.createElement(
                  w,
                  null,
                  F.createElement(
                    `defs`,
                    null,
                    F.createElement(
                      `clipPath`,
                      { id: `animationClipPath-${t}` },
                      n.renderClipRect(o),
                    ),
                  ),
                  F.createElement(
                    w,
                    { clipPath: `url(#animationClipPath-${t})` },
                    n.renderAreaStatically(i, a, e, t),
                  ),
                );
              },
            );
          },
        },
        {
          key: `renderArea`,
          value: function (e, t) {
            var n = this.props,
              r = n.points,
              i = n.baseLine,
              a = n.isAnimationActive,
              o = this.state,
              s = o.prevPoints,
              c = o.prevBaseLine,
              l = o.totalLength;
            return a &&
              r &&
              r.length &&
              ((!s && l > 0) || !(0, z.default)(s, r) || !(0, z.default)(c, i))
              ? this.renderAreaWithAnimation(e, t)
              : this.renderAreaStatically(r, i, e, t);
          },
        },
        {
          key: `render`,
          value: function () {
            var e = this.props,
              t = e.hide,
              n = e.dot,
              i = e.points,
              a = e.className,
              o = e.top,
              s = e.left,
              c = e.xAxis,
              l = e.yAxis,
              u = e.width,
              d = e.height,
              f = e.isAnimationActive,
              p = e.id;
            if (t || !i || !i.length) return null;
            var m = this.state.isAnimationFinished,
              h = i.length === 1,
              g = r(`recharts-area`, a),
              _ = c && c.allowDataOverflow,
              v = l && l.allowDataOverflow,
              x = _ || v,
              S = (0, R.default)(p) ? this.id : p,
              C = b(n, !1) ?? { r: 3, strokeWidth: 2 },
              T = C.r,
              E = T === void 0 ? 3 : T,
              D = C.strokeWidth,
              O = D === void 0 ? 2 : D,
              k = (ee(n) ? n : {}).clipDot,
              A = k === void 0 || k,
              j = E * 2 + O;
            return F.createElement(
              w,
              { className: g },
              _ || v
                ? F.createElement(
                    `defs`,
                    null,
                    F.createElement(
                      `clipPath`,
                      { id: `clipPath-${S}` },
                      F.createElement(`rect`, {
                        x: _ ? s : s - u / 2,
                        y: v ? o : o - d / 2,
                        width: _ ? u : u * 2,
                        height: v ? d : d * 2,
                      }),
                    ),
                    !A &&
                      F.createElement(
                        `clipPath`,
                        { id: `clipPath-dots-${S}` },
                        F.createElement(`rect`, {
                          x: s - j / 2,
                          y: o - j / 2,
                          width: u + j,
                          height: d + j,
                        }),
                      ),
                  )
                : null,
              h ? null : this.renderArea(x, S),
              (n || h) && this.renderDots(x, A, S),
              (!f || m) && y.renderCallByParent(this.props, i),
            );
          },
        },
      ],
      [
        {
          key: `getDerivedStateFromProps`,
          value: function (e, t) {
            return e.animationId === t.prevAnimationId
              ? e.points !== t.curPoints || e.baseLine !== t.curBaseLine
                ? { curPoints: e.points, curBaseLine: e.baseLine }
                : null
              : {
                  prevAnimationId: e.animationId,
                  curPoints: e.points,
                  curBaseLine: e.baseLine,
                  prevPoints: t.curPoints,
                  prevBaseLine: t.curBaseLine,
                };
          },
        },
      ],
    )
  );
})(F.PureComponent);
((B = Q),
  X(Q, `displayName`, `Area`),
  X(Q, `defaultProps`, {
    stroke: `#3182bd`,
    fill: `#3182bd`,
    fillOpacity: 0.6,
    xAxisId: 0,
    yAxisId: 0,
    legendType: `line`,
    connectNulls: !1,
    points: [],
    dot: !1,
    activeDot: !0,
    hide: !1,
    isAnimationActive: !S.isSsr,
    animationBegin: 0,
    animationDuration: 1500,
    animationEasing: `ease`,
  }),
  X(Q, `getBaseValue`, function (e, t, n, r) {
    var i = e.layout,
      a = e.baseValue,
      o = t.props.baseValue ?? a;
    if (P(o) && typeof o == `number`) return o;
    var s = i === `horizontal` ? r : n,
      c = s.scale.domain();
    if (s.type === `number`) {
      var l = Math.max(c[0], c[1]),
        u = Math.min(c[0], c[1]);
      return o === `dataMin` ? u : o === `dataMax` || l < 0 ? l : Math.max(Math.min(c[0], c[1]), 0);
    }
    return o === `dataMin` ? c[0] : o === `dataMax` ? c[1] : c[0];
  }),
  X(Q, `getComposedData`, function (e) {
    var t = e.props,
      n = e.item,
      r = e.xAxis,
      i = e.yAxis,
      a = e.xAxisTicks,
      o = e.yAxisTicks,
      s = e.bandSize,
      c = e.dataKey,
      l = e.stackedData,
      u = e.dataStartIndex,
      d = e.displayedData,
      f = e.offset,
      p = t.layout,
      m = l && l.length,
      h = B.getBaseValue(t, n, r, i),
      g = p === `horizontal`,
      _ = !1,
      y = d.map(function (e, t) {
        var n;
        m ? (n = l[u + t]) : ((n = C(e, c)), Array.isArray(n) ? (_ = !0) : (n = [h, n]));
        var d = n[1] == null || (m && C(e, c) == null);
        return g
          ? {
              x: v({ axis: r, ticks: a, bandSize: s, entry: e, index: t }),
              y: d ? null : i.scale(n[1]),
              value: n,
              payload: e,
            }
          : {
              x: d ? null : r.scale(n[1]),
              y: v({ axis: i, ticks: o, bandSize: s, entry: e, index: t }),
              value: n,
              payload: e,
            };
      });
    return G(
      {
        points: y,
        baseLine:
          m || _
            ? y.map(function (e) {
                var t = Array.isArray(e.value) ? e.value[0] : null;
                return g
                  ? { x: e.x, y: t != null && e.y != null ? i.scale(t) : null }
                  : { x: t == null ? null : r.scale(t), y: e.y };
              })
            : g
              ? i.scale(h)
              : r.scale(h),
        layout: p,
        isRange: _,
      },
      f,
    );
  }),
  X(Q, `renderDotItem`, function (e, t) {
    var n;
    if (F.isValidElement(e)) n = F.cloneElement(e, t);
    else if ((0, I.default)(e)) n = e(t);
    else {
      var i = r(`recharts-area-dot`, typeof e == `boolean` ? `` : e.className),
        a = t.key,
        o = H(t, pe);
      n = F.createElement(_, U({}, o, { key: a, className: i }));
    }
    return n;
  }));
var Se = k({
    chartName: `AreaChart`,
    GraphicalChild: Q,
    axisComponents: [
      { axisType: `xAxis`, AxisComp: le },
      { axisType: `yAxis`, AxisComp: oe },
    ],
    formatAxisMap: ce,
  }),
  $ = t(),
  Ce = { revenue: { label: `Revenus`, color: `var(--chart-1)` } };
function we() {
  let e = ie(7),
    { data: t } = A(e.from, e.to),
    n = t?.sales ?? [],
    r = t?.items ?? [],
    i = (0, F.useMemo)(() => {
      let e = a();
      return N(n, r, e, e + 864e5);
    }, [n, r]),
    h = (0, F.useMemo)(() => N(n, r, e.from, e.to), [n, r, e.from, e.to]),
    g = h.days.map((e) => ({ day: l(e.day), revenue: e.revenue }));
  return (0, $.jsxs)(`div`, {
    className: `mx-auto max-w-5xl px-4 py-6 space-y-6`,
    children: [
      (0, $.jsxs)(`div`, {
        children: [
          (0, $.jsxs)(`h1`, {
            className: `text-2xl font-bold flex items-center gap-2`,
            children: [(0, $.jsx)(m, { className: `h-6 w-6` }), ` Tableau de bord`],
          }),
          (0, $.jsx)(`p`, {
            className: `text-sm text-muted-foreground`,
            children: `Activité du jour, en temps réel.`,
          }),
        ],
      }),
      (0, $.jsxs)(`div`, {
        className: `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`,
        children: [
          (0, $.jsx)(M, { label: `Revenus du jour`, value: d(i.revenue), highlight: !0 }),
          (0, $.jsx)(M, { label: `Bénéfices du jour`, value: d(i.profit), highlight: !0 }),
          (0, $.jsx)(M, { label: `Ventes`, value: String(i.salesCount) }),
          (0, $.jsx)(M, { label: `Marge`, value: o(i.marginRate), hint: `bénéfice ÷ revenus` }),
          (0, $.jsx)(M, { label: `Panier moyen`, value: d(i.averageBasket) }),
          (0, $.jsx)(M, { label: `Articles vendus`, value: String(i.itemsCount) }),
        ],
      }),
      (0, $.jsxs)(f, {
        children: [
          (0, $.jsx)(u, {
            className: `pb-2`,
            children: (0, $.jsxs)(s, {
              className: `text-base flex items-center gap-2`,
              children: [(0, $.jsx)(ue, { className: `h-4 w-4` }), ` Revenus des 7 derniers jours`],
            }),
          }),
          (0, $.jsxs)(c, {
            children: [
              (0, $.jsx)(ae, {
                config: Ce,
                className: `aspect-[3/1] w-full`,
                children: (0, $.jsxs)(Se, {
                  data: g,
                  margin: { left: 4, right: 4, top: 8 },
                  children: [
                    (0, $.jsx)(j, { vertical: !1 }),
                    (0, $.jsx)(le, {
                      dataKey: `day`,
                      tickLine: !1,
                      axisLine: !1,
                      tickMargin: 8,
                      interval: 0,
                    }),
                    (0, $.jsx)(ne, { content: (0, $.jsx)(re, { formatter: (e) => d(Number(e)) }) }),
                    (0, $.jsx)(Q, {
                      dataKey: `revenue`,
                      type: `monotone`,
                      stroke: `var(--color-revenue)`,
                      fill: `var(--color-revenue)`,
                      fillOpacity: 0.15,
                      strokeWidth: 2,
                    }),
                  ],
                }),
              }),
              (0, $.jsxs)(`p`, {
                className: `mt-3 text-sm text-muted-foreground`,
                children: [
                  d(h.revenue),
                  ` encaissés sur 7 jours ·`,
                  ` `,
                  d(h.profit),
                  ` de bénéfice ·`,
                  ` `,
                  (0, $.jsx)(p, {
                    to: `/reports`,
                    className: `text-primary underline`,
                    children: `analyse détaillée`,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
export { we as component };
