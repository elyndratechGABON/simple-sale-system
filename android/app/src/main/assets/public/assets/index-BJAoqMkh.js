const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "assets/dashboard-Jubg6d8l.js",
      "assets/rolldown-runtime-QTnfLwEv.js",
      "assets/utils-7o9Ncrmj.js",
      "assets/card-izC2g9JZ.js",
      "assets/chart-CUH6xCOy.js",
      "assets/history-C3ju-Ocw.js",
      "assets/label-CWF-dgEY.js",
      "assets/chevron-up-BOu0KSCt.js",
      "assets/badge-Bwm_fD3b.js",
      "assets/pin-DZXMeoF4.js",
      "assets/pos-CyRt3juJ.js",
      "assets/select-7_heDHPZ.js",
      "assets/dist-BCEmwt1q.js",
      "assets/reports-Y83M0DOW.js",
      "assets/dist-Cnp6P8yH.js",
      "assets/typeof-B5XbjTb1.js",
      "assets/stocks-Bwz_jpSe.js",
    ]),
) => i.map((i) => d[i]);
import { r as e, t } from "./rolldown-runtime-QTnfLwEv.js";
import {
  A as n,
  D as r,
  M as i,
  N as a,
  P as o,
  b as s,
  c,
  d as l,
  g as u,
  h as d,
  i as f,
  j as p,
  l as m,
  m as h,
  n as g,
  o as _,
  r as v,
  t as y,
  u as b,
  v as x,
  w as S,
  x as C,
  y as ee,
} from "./utils-7o9Ncrmj.js";
var te = t((e) => {
    function t(e, t) {
      var n = e.length;
      e.push(t);
      a: for (; 0 < n;) {
        var r = (n - 1) >>> 1,
          a = e[r];
        if (0 < i(a, t)) ((e[r] = t), (e[n] = a), (n = r));
        else break a;
      }
    }
    function n(e) {
      return e.length === 0 ? null : e[0];
    }
    function r(e) {
      if (e.length === 0) return null;
      var t = e[0],
        n = e.pop();
      if (n !== t) {
        e[0] = n;
        a: for (var r = 0, a = e.length, o = a >>> 1; r < o;) {
          var s = 2 * (r + 1) - 1,
            c = e[s],
            l = s + 1,
            u = e[l];
          if (0 > i(c, n))
            l < a && 0 > i(u, c)
              ? ((e[r] = u), (e[l] = n), (r = l))
              : ((e[r] = c), (e[s] = n), (r = s));
          else if (l < a && 0 > i(u, n)) ((e[r] = u), (e[l] = n), (r = l));
          else break a;
        }
      }
      return t;
    }
    function i(e, t) {
      var n = e.sortIndex - t.sortIndex;
      return n === 0 ? e.id - t.id : n;
    }
    if (
      ((e.unstable_now = void 0),
      typeof performance == `object` && typeof performance.now == `function`)
    ) {
      var a = performance;
      e.unstable_now = function () {
        return a.now();
      };
    } else {
      var o = Date,
        s = o.now();
      e.unstable_now = function () {
        return o.now() - s;
      };
    }
    var c = [],
      l = [],
      u = 1,
      d = null,
      f = 3,
      p = !1,
      m = !1,
      h = !1,
      g = !1,
      _ = typeof setTimeout == `function` ? setTimeout : null,
      v = typeof clearTimeout == `function` ? clearTimeout : null,
      y = typeof setImmediate < `u` ? setImmediate : null;
    function b(e) {
      for (var i = n(l); i !== null;) {
        if (i.callback === null) r(l);
        else if (i.startTime <= e) (r(l), (i.sortIndex = i.expirationTime), t(c, i));
        else break;
        i = n(l);
      }
    }
    function x(e) {
      if (((h = !1), b(e), !m))
        if (n(c) !== null) ((m = !0), S || ((S = !0), w()));
        else {
          var t = n(l);
          t !== null && oe(x, t.startTime - e);
        }
    }
    var S = !1,
      C = -1,
      ee = 5,
      te = -1;
    function ne() {
      return g ? !0 : !(e.unstable_now() - te < ee);
    }
    function re() {
      if (((g = !1), S)) {
        var t = e.unstable_now();
        te = t;
        var i = !0;
        try {
          a: {
            ((m = !1), h && ((h = !1), v(C), (C = -1)), (p = !0));
            var a = f;
            try {
              b: {
                for (b(t), d = n(c); d !== null && !(d.expirationTime > t && ne());) {
                  var o = d.callback;
                  if (typeof o == `function`) {
                    ((d.callback = null), (f = d.priorityLevel));
                    var s = o(d.expirationTime <= t);
                    if (((t = e.unstable_now()), typeof s == `function`)) {
                      ((d.callback = s), b(t), (i = !0));
                      break b;
                    }
                    (d === n(c) && r(c), b(t));
                  } else r(c);
                  d = n(c);
                }
                if (d !== null) i = !0;
                else {
                  var u = n(l);
                  (u !== null && oe(x, u.startTime - t), (i = !1));
                }
              }
              break a;
            } finally {
              ((d = null), (f = a), (p = !1));
            }
            i = void 0;
          }
        } finally {
          i ? w() : (S = !1);
        }
      }
    }
    var w;
    if (typeof y == `function`)
      w = function () {
        y(re);
      };
    else if (typeof MessageChannel < `u`) {
      var ie = new MessageChannel(),
        ae = ie.port2;
      ((ie.port1.onmessage = re),
        (w = function () {
          ae.postMessage(null);
        }));
    } else
      w = function () {
        _(re, 0);
      };
    function oe(t, n) {
      C = _(function () {
        t(e.unstable_now());
      }, n);
    }
    ((e.unstable_IdlePriority = 5),
      (e.unstable_ImmediatePriority = 1),
      (e.unstable_LowPriority = 4),
      (e.unstable_NormalPriority = 3),
      (e.unstable_Profiling = null),
      (e.unstable_UserBlockingPriority = 2),
      (e.unstable_cancelCallback = function (e) {
        e.callback = null;
      }),
      (e.unstable_forceFrameRate = function (e) {
        0 > e || 125 < e
          ? console.error(
              `forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported`,
            )
          : (ee = 0 < e ? Math.floor(1e3 / e) : 5);
      }),
      (e.unstable_getCurrentPriorityLevel = function () {
        return f;
      }),
      (e.unstable_next = function (e) {
        switch (f) {
          case 1:
          case 2:
          case 3:
            var t = 3;
            break;
          default:
            t = f;
        }
        var n = f;
        f = t;
        try {
          return e();
        } finally {
          f = n;
        }
      }),
      (e.unstable_requestPaint = function () {
        g = !0;
      }),
      (e.unstable_runWithPriority = function (e, t) {
        switch (e) {
          case 1:
          case 2:
          case 3:
          case 4:
          case 5:
            break;
          default:
            e = 3;
        }
        var n = f;
        f = e;
        try {
          return t();
        } finally {
          f = n;
        }
      }),
      (e.unstable_scheduleCallback = function (r, i, a) {
        var o = e.unstable_now();
        switch (
          (typeof a == `object` && a
            ? ((a = a.delay), (a = typeof a == `number` && 0 < a ? o + a : o))
            : (a = o),
          r)
        ) {
          case 1:
            var s = -1;
            break;
          case 2:
            s = 250;
            break;
          case 5:
            s = 1073741823;
            break;
          case 4:
            s = 1e4;
            break;
          default:
            s = 5e3;
        }
        return (
          (s = a + s),
          (r = {
            id: u++,
            callback: i,
            priorityLevel: r,
            startTime: a,
            expirationTime: s,
            sortIndex: -1,
          }),
          a > o
            ? ((r.sortIndex = a),
              t(l, r),
              n(c) === null && r === n(l) && (h ? (v(C), (C = -1)) : (h = !0), oe(x, a - o)))
            : ((r.sortIndex = s), t(c, r), m || p || ((m = !0), S || ((S = !0), w()))),
          r
        );
      }),
      (e.unstable_shouldYield = ne),
      (e.unstable_wrapCallback = function (e) {
        var t = f;
        return function () {
          var n = f;
          f = t;
          try {
            return e.apply(this, arguments);
          } finally {
            f = n;
          }
        };
      }));
  }),
  ne = t((e, t) => {
    t.exports = te();
  }),
  re = t((e) => {
    var t = ne(),
      n = o(),
      r = a();
    function i(e) {
      var t = `https://react.dev/errors/` + e;
      if (1 < arguments.length) {
        t += `?args[]=` + encodeURIComponent(arguments[1]);
        for (var n = 2; n < arguments.length; n++)
          t += `&args[]=` + encodeURIComponent(arguments[n]);
      }
      return (
        `Minified React error #` +
        e +
        `; visit ` +
        t +
        ` for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`
      );
    }
    function s(e) {
      return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
    }
    function c(e) {
      var t = e,
        n = e;
      if (e.alternate) for (; t.return;) t = t.return;
      else {
        e = t;
        do ((t = e), t.flags & 4098 && (n = t.return), (e = t.return));
        while (e);
      }
      return t.tag === 3 ? n : null;
    }
    function l(e) {
      if (e.tag === 13) {
        var t = e.memoizedState;
        if ((t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null))
          return t.dehydrated;
      }
      return null;
    }
    function u(e) {
      if (e.tag === 31) {
        var t = e.memoizedState;
        if ((t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null))
          return t.dehydrated;
      }
      return null;
    }
    function d(e) {
      if (c(e) !== e) throw Error(i(188));
    }
    function f(e) {
      var t = e.alternate;
      if (!t) {
        if (((t = c(e)), t === null)) throw Error(i(188));
        return t === e ? e : null;
      }
      for (var n = e, r = t; ;) {
        var a = n.return;
        if (a === null) break;
        var o = a.alternate;
        if (o === null) {
          if (((r = a.return), r !== null)) {
            n = r;
            continue;
          }
          break;
        }
        if (a.child === o.child) {
          for (o = a.child; o;) {
            if (o === n) return (d(a), e);
            if (o === r) return (d(a), t);
            o = o.sibling;
          }
          throw Error(i(188));
        }
        if (n.return !== r.return) ((n = a), (r = o));
        else {
          for (var s = !1, l = a.child; l;) {
            if (l === n) {
              ((s = !0), (n = a), (r = o));
              break;
            }
            if (l === r) {
              ((s = !0), (r = a), (n = o));
              break;
            }
            l = l.sibling;
          }
          if (!s) {
            for (l = o.child; l;) {
              if (l === n) {
                ((s = !0), (n = o), (r = a));
                break;
              }
              if (l === r) {
                ((s = !0), (r = o), (n = a));
                break;
              }
              l = l.sibling;
            }
            if (!s) throw Error(i(189));
          }
        }
        if (n.alternate !== r) throw Error(i(190));
      }
      if (n.tag !== 3) throw Error(i(188));
      return n.stateNode.current === n ? e : t;
    }
    function p(e) {
      var t = e.tag;
      if (t === 5 || t === 26 || t === 27 || t === 6) return e;
      for (e = e.child; e !== null;) {
        if (((t = p(e)), t !== null)) return t;
        e = e.sibling;
      }
      return null;
    }
    var m = Object.assign,
      h = Symbol.for(`react.element`),
      g = Symbol.for(`react.transitional.element`),
      _ = Symbol.for(`react.portal`),
      v = Symbol.for(`react.fragment`),
      y = Symbol.for(`react.strict_mode`),
      b = Symbol.for(`react.profiler`),
      x = Symbol.for(`react.consumer`),
      S = Symbol.for(`react.context`),
      C = Symbol.for(`react.forward_ref`),
      ee = Symbol.for(`react.suspense`),
      te = Symbol.for(`react.suspense_list`),
      re = Symbol.for(`react.memo`),
      w = Symbol.for(`react.lazy`),
      ie = Symbol.for(`react.activity`),
      ae = Symbol.for(`react.memo_cache_sentinel`),
      oe = Symbol.iterator;
    function se(e) {
      return typeof e != `object` || !e
        ? null
        : ((e = (oe && e[oe]) || e[`@@iterator`]), typeof e == `function` ? e : null);
    }
    var ce = Symbol.for(`react.client.reference`);
    function le(e) {
      if (e == null) return null;
      if (typeof e == `function`) return e.$$typeof === ce ? null : e.displayName || e.name || null;
      if (typeof e == `string`) return e;
      switch (e) {
        case v:
          return `Fragment`;
        case b:
          return `Profiler`;
        case y:
          return `StrictMode`;
        case ee:
          return `Suspense`;
        case te:
          return `SuspenseList`;
        case ie:
          return `Activity`;
      }
      if (typeof e == `object`)
        switch (e.$$typeof) {
          case _:
            return `Portal`;
          case S:
            return e.displayName || `Context`;
          case x:
            return (e._context.displayName || `Context`) + `.Consumer`;
          case C:
            var t = e.render;
            return (
              (e = e.displayName),
              (e ||=
                ((e = t.displayName || t.name || ``),
                e === `` ? `ForwardRef` : `ForwardRef(` + e + `)`)),
              e
            );
          case re:
            return ((t = e.displayName || null), t === null ? le(e.type) || `Memo` : t);
          case w:
            ((t = e._payload), (e = e._init));
            try {
              return le(e(t));
            } catch {}
        }
      return null;
    }
    var ue = Array.isArray,
      E = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      D = r.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
      de = { pending: !1, data: null, method: null, action: null },
      fe = [],
      pe = -1;
    function me(e) {
      return { current: e };
    }
    function O(e) {
      0 > pe || ((e.current = fe[pe]), (fe[pe] = null), pe--);
    }
    function k(e, t) {
      (pe++, (fe[pe] = e.current), (e.current = t));
    }
    var he = me(null),
      ge = me(null),
      _e = me(null),
      ve = me(null);
    function ye(e, t) {
      switch ((k(_e, t), k(ge, e), k(he, null), t.nodeType)) {
        case 9:
        case 11:
          e = (e = t.documentElement) && (e = e.namespaceURI) ? Hd(e) : 0;
          break;
        default:
          if (((e = t.tagName), (t = t.namespaceURI))) ((t = Hd(t)), (e = Ud(t, e)));
          else
            switch (e) {
              case `svg`:
                e = 1;
                break;
              case `math`:
                e = 2;
                break;
              default:
                e = 0;
            }
      }
      (O(he), k(he, e));
    }
    function A() {
      (O(he), O(ge), O(_e));
    }
    function j(e) {
      e.memoizedState !== null && k(ve, e);
      var t = he.current,
        n = Ud(t, e.type);
      t !== n && (k(ge, e), k(he, n));
    }
    function be(e) {
      (ge.current === e && (O(he), O(ge)), ve.current === e && (O(ve), ($f._currentValue = de)));
    }
    var xe, Se;
    function Ce(e) {
      if (xe === void 0)
        try {
          throw Error();
        } catch (e) {
          var t = e.stack.trim().match(/\n( *(at )?)/);
          ((xe = (t && t[1]) || ``),
            (Se =
              -1 <
              e.stack.indexOf(`
    at`)
                ? ` (<anonymous>)`
                : -1 < e.stack.indexOf(`@`)
                  ? `@unknown:0:0`
                  : ``));
        }
      return (
        `
` +
        xe +
        e +
        Se
      );
    }
    var we = !1;
    function Te(e, t) {
      if (!e || we) return ``;
      we = !0;
      var n = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      try {
        var r = {
          DetermineComponentFrameRoot: function () {
            try {
              if (t) {
                var n = function () {
                  throw Error();
                };
                if (
                  (Object.defineProperty(n.prototype, "props", {
                    set: function () {
                      throw Error();
                    },
                  }),
                  typeof Reflect == `object` && Reflect.construct)
                ) {
                  try {
                    Reflect.construct(n, []);
                  } catch (e) {
                    var r = e;
                  }
                  Reflect.construct(e, [], n);
                } else {
                  try {
                    n.call();
                  } catch (e) {
                    r = e;
                  }
                  e.call(n.prototype);
                }
              } else {
                try {
                  throw Error();
                } catch (e) {
                  r = e;
                }
                (n = e()) && typeof n.catch == `function` && n.catch(function () {});
              }
            } catch (e) {
              if (e && r && typeof e.stack == `string`) return [e.stack, r.stack];
            }
            return [null, null];
          },
        };
        r.DetermineComponentFrameRoot.displayName = `DetermineComponentFrameRoot`;
        var i = Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot, `name`);
        i &&
          i.configurable &&
          Object.defineProperty(r.DetermineComponentFrameRoot, "name", {
            value: `DetermineComponentFrameRoot`,
          });
        var a = r.DetermineComponentFrameRoot(),
          o = a[0],
          s = a[1];
        if (o && s) {
          var c = o.split(`
`),
            l = s.split(`
`);
          for (i = r = 0; r < c.length && !c[r].includes(`DetermineComponentFrameRoot`);) r++;
          for (; i < l.length && !l[i].includes(`DetermineComponentFrameRoot`);) i++;
          if (r === c.length || i === l.length)
            for (r = c.length - 1, i = l.length - 1; 1 <= r && 0 <= i && c[r] !== l[i];) i--;
          for (; 1 <= r && 0 <= i; r--, i--)
            if (c[r] !== l[i]) {
              if (r !== 1 || i !== 1)
                do
                  if ((r--, i--, 0 > i || c[r] !== l[i])) {
                    var u =
                      `
` + c[r].replace(` at new `, ` at `);
                    return (
                      e.displayName &&
                        u.includes(`<anonymous>`) &&
                        (u = u.replace(`<anonymous>`, e.displayName)),
                      u
                    );
                  }
                while (1 <= r && 0 <= i);
              break;
            }
        }
      } finally {
        ((we = !1), (Error.prepareStackTrace = n));
      }
      return (n = e ? e.displayName || e.name : ``) ? Ce(n) : ``;
    }
    function Ee(e, t) {
      switch (e.tag) {
        case 26:
        case 27:
        case 5:
          return Ce(e.type);
        case 16:
          return Ce(`Lazy`);
        case 13:
          return e.child !== t && t !== null ? Ce(`Suspense Fallback`) : Ce(`Suspense`);
        case 19:
          return Ce(`SuspenseList`);
        case 0:
        case 15:
          return Te(e.type, !1);
        case 11:
          return Te(e.type.render, !1);
        case 1:
          return Te(e.type, !0);
        case 31:
          return Ce(`Activity`);
        default:
          return ``;
      }
    }
    function De(e) {
      try {
        var t = ``,
          n = null;
        do ((t += Ee(e, n)), (n = e), (e = e.return));
        while (e);
        return t;
      } catch (e) {
        return (
          `
Error generating stack: ` +
          e.message +
          `
` +
          e.stack
        );
      }
    }
    var Oe = Object.prototype.hasOwnProperty,
      ke = t.unstable_scheduleCallback,
      Ae = t.unstable_cancelCallback,
      je = t.unstable_shouldYield,
      Me = t.unstable_requestPaint,
      Ne = t.unstable_now,
      Pe = t.unstable_getCurrentPriorityLevel,
      Fe = t.unstable_ImmediatePriority,
      Ie = t.unstable_UserBlockingPriority,
      Le = t.unstable_NormalPriority,
      Re = t.unstable_LowPriority,
      ze = t.unstable_IdlePriority,
      Be = t.log,
      Ve = t.unstable_setDisableYieldValue,
      He = null,
      Ue = null;
    function We(e) {
      if ((typeof Be == `function` && Ve(e), Ue && typeof Ue.setStrictMode == `function`))
        try {
          Ue.setStrictMode(He, e);
        } catch {}
    }
    var Ge = Math.clz32 ? Math.clz32 : Je,
      Ke = Math.log,
      qe = Math.LN2;
    function Je(e) {
      return ((e >>>= 0), e === 0 ? 32 : (31 - ((Ke(e) / qe) | 0)) | 0);
    }
    var Ye = 256,
      Xe = 262144,
      Ze = 4194304;
    function Qe(e) {
      var t = e & 42;
      if (t !== 0) return t;
      switch (e & -e) {
        case 1:
          return 1;
        case 2:
          return 2;
        case 4:
          return 4;
        case 8:
          return 8;
        case 16:
          return 16;
        case 32:
          return 32;
        case 64:
          return 64;
        case 128:
          return 128;
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
          return e & 261888;
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return e & 3932160;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          return e & 62914560;
        case 67108864:
          return 67108864;
        case 134217728:
          return 134217728;
        case 268435456:
          return 268435456;
        case 536870912:
          return 536870912;
        case 1073741824:
          return 0;
        default:
          return e;
      }
    }
    function $e(e, t, n) {
      var r = e.pendingLanes;
      if (r === 0) return 0;
      var i = 0,
        a = e.suspendedLanes,
        o = e.pingedLanes;
      e = e.warmLanes;
      var s = r & 134217727;
      return (
        s === 0
          ? ((s = r & ~a),
            s === 0
              ? o === 0
                ? n || ((n = r & ~e), n !== 0 && (i = Qe(n)))
                : (i = Qe(o))
              : (i = Qe(s)))
          : ((r = s & ~a),
            r === 0
              ? ((o &= s), o === 0 ? n || ((n = s & ~e), n !== 0 && (i = Qe(n))) : (i = Qe(o)))
              : (i = Qe(r))),
        i === 0
          ? 0
          : t !== 0 &&
              t !== i &&
              (t & a) === 0 &&
              ((a = i & -i), (n = t & -t), a >= n || (a === 32 && n & 4194048))
            ? t
            : i
      );
    }
    function et(e, t) {
      return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
    }
    function tt(e, t) {
      switch (e) {
        case 1:
        case 2:
        case 4:
        case 8:
        case 64:
          return t + 250;
        case 16:
        case 32:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return t + 5e3;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          return -1;
        case 67108864:
        case 134217728:
        case 268435456:
        case 536870912:
        case 1073741824:
          return -1;
        default:
          return -1;
      }
    }
    function nt() {
      var e = Ze;
      return ((Ze <<= 1), !(Ze & 62914560) && (Ze = 4194304), e);
    }
    function rt(e) {
      for (var t = [], n = 0; 31 > n; n++) t.push(e);
      return t;
    }
    function it(e, t) {
      ((e.pendingLanes |= t),
        t !== 268435456 && ((e.suspendedLanes = 0), (e.pingedLanes = 0), (e.warmLanes = 0)));
    }
    function at(e, t, n, r, i, a) {
      var o = e.pendingLanes;
      ((e.pendingLanes = n),
        (e.suspendedLanes = 0),
        (e.pingedLanes = 0),
        (e.warmLanes = 0),
        (e.expiredLanes &= n),
        (e.entangledLanes &= n),
        (e.errorRecoveryDisabledLanes &= n),
        (e.shellSuspendCounter = 0));
      var s = e.entanglements,
        c = e.expirationTimes,
        l = e.hiddenUpdates;
      for (n = o & ~n; 0 < n;) {
        var u = 31 - Ge(n),
          d = 1 << u;
        ((s[u] = 0), (c[u] = -1));
        var f = l[u];
        if (f !== null)
          for (l[u] = null, u = 0; u < f.length; u++) {
            var p = f[u];
            p !== null && (p.lane &= -536870913);
          }
        n &= ~d;
      }
      (r !== 0 && ot(e, r, 0),
        a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t)));
    }
    function ot(e, t, n) {
      ((e.pendingLanes |= t), (e.suspendedLanes &= ~t));
      var r = 31 - Ge(t);
      ((e.entangledLanes |= t),
        (e.entanglements[r] = e.entanglements[r] | 1073741824 | (n & 261930)));
    }
    function st(e, t) {
      var n = (e.entangledLanes |= t);
      for (e = e.entanglements; n;) {
        var r = 31 - Ge(n),
          i = 1 << r;
        ((i & t) | (e[r] & t) && (e[r] |= t), (n &= ~i));
      }
    }
    function ct(e, t) {
      var n = t & -t;
      return ((n = n & 42 ? 1 : lt(n)), (n & (e.suspendedLanes | t)) === 0 ? n : 0);
    }
    function lt(e) {
      switch (e) {
        case 2:
          e = 1;
          break;
        case 8:
          e = 4;
          break;
        case 32:
          e = 16;
          break;
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          e = 128;
          break;
        case 268435456:
          e = 134217728;
          break;
        default:
          e = 0;
      }
      return e;
    }
    function ut(e) {
      return ((e &= -e), 2 < e ? (8 < e ? (e & 134217727 ? 32 : 268435456) : 8) : 2);
    }
    function dt() {
      var e = D.p;
      return e === 0 ? ((e = window.event), e === void 0 ? 32 : hp(e.type)) : e;
    }
    function ft(e, t) {
      var n = D.p;
      try {
        return ((D.p = e), t());
      } finally {
        D.p = n;
      }
    }
    var pt = Math.random().toString(36).slice(2),
      mt = `__reactFiber$` + pt,
      ht = `__reactProps$` + pt,
      gt = `__reactContainer$` + pt,
      _t = `__reactEvents$` + pt,
      vt = `__reactListeners$` + pt,
      yt = `__reactHandles$` + pt,
      bt = `__reactResources$` + pt,
      xt = `__reactMarker$` + pt;
    function St(e) {
      (delete e[mt], delete e[ht], delete e[_t], delete e[vt], delete e[yt]);
    }
    function Ct(e) {
      var t = e[mt];
      if (t) return t;
      for (var n = e.parentNode; n;) {
        if ((t = n[gt] || n[mt])) {
          if (((n = t.alternate), t.child !== null || (n !== null && n.child !== null)))
            for (e = ff(e); e !== null;) {
              if ((n = e[mt])) return n;
              e = ff(e);
            }
          return t;
        }
        ((e = n), (n = e.parentNode));
      }
      return null;
    }
    function wt(e) {
      if ((e = e[mt] || e[gt])) {
        var t = e.tag;
        if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e;
      }
      return null;
    }
    function Tt(e) {
      var t = e.tag;
      if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
      throw Error(i(33));
    }
    function Et(e) {
      var t = e[bt];
      return ((t ||= e[bt] = { hoistableStyles: new Map(), hoistableScripts: new Map() }), t);
    }
    function Dt(e) {
      e[xt] = !0;
    }
    var Ot = new Set(),
      kt = {};
    function At(e, t) {
      (jt(e, t), jt(e + `Capture`, t));
    }
    function jt(e, t) {
      for (kt[e] = t, e = 0; e < t.length; e++) Ot.add(t[e]);
    }
    var Mt = RegExp(
        `^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$`,
      ),
      Nt = {},
      Pt = {};
    function Ft(e) {
      return Oe.call(Pt, e)
        ? !0
        : Oe.call(Nt, e)
          ? !1
          : Mt.test(e)
            ? (Pt[e] = !0)
            : ((Nt[e] = !0), !1);
    }
    function It(e, t, n) {
      if (Ft(t))
        if (n === null) e.removeAttribute(t);
        else {
          switch (typeof n) {
            case `undefined`:
            case `function`:
            case `symbol`:
              e.removeAttribute(t);
              return;
            case `boolean`:
              var r = t.toLowerCase().slice(0, 5);
              if (r !== `data-` && r !== `aria-`) {
                e.removeAttribute(t);
                return;
              }
          }
          e.setAttribute(t, `` + n);
        }
    }
    function Lt(e, t, n) {
      if (n === null) e.removeAttribute(t);
      else {
        switch (typeof n) {
          case `undefined`:
          case `function`:
          case `symbol`:
          case `boolean`:
            e.removeAttribute(t);
            return;
        }
        e.setAttribute(t, `` + n);
      }
    }
    function Rt(e, t, n, r) {
      if (r === null) e.removeAttribute(n);
      else {
        switch (typeof r) {
          case `undefined`:
          case `function`:
          case `symbol`:
          case `boolean`:
            e.removeAttribute(n);
            return;
        }
        e.setAttributeNS(t, n, `` + r);
      }
    }
    function zt(e) {
      switch (typeof e) {
        case `bigint`:
        case `boolean`:
        case `number`:
        case `string`:
        case `undefined`:
          return e;
        case `object`:
          return e;
        default:
          return ``;
      }
    }
    function Bt(e) {
      var t = e.type;
      return (e = e.nodeName) && e.toLowerCase() === `input` && (t === `checkbox` || t === `radio`);
    }
    function Vt(e, t, n) {
      var r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
      if (
        !e.hasOwnProperty(t) &&
        r !== void 0 &&
        typeof r.get == `function` &&
        typeof r.set == `function`
      ) {
        var i = r.get,
          a = r.set;
        return (
          Object.defineProperty(e, t, {
            configurable: !0,
            get: function () {
              return i.call(this);
            },
            set: function (e) {
              ((n = `` + e), a.call(this, e));
            },
          }),
          Object.defineProperty(e, t, { enumerable: r.enumerable }),
          {
            getValue: function () {
              return n;
            },
            setValue: function (e) {
              n = `` + e;
            },
            stopTracking: function () {
              ((e._valueTracker = null), delete e[t]);
            },
          }
        );
      }
    }
    function Ht(e) {
      if (!e._valueTracker) {
        var t = Bt(e) ? `checked` : `value`;
        e._valueTracker = Vt(e, t, `` + e[t]);
      }
    }
    function Ut(e) {
      if (!e) return !1;
      var t = e._valueTracker;
      if (!t) return !0;
      var n = t.getValue(),
        r = ``;
      return (
        e && (r = Bt(e) ? (e.checked ? `true` : `false`) : e.value),
        (e = r),
        e === n ? !1 : (t.setValue(e), !0)
      );
    }
    function Wt(e) {
      if (((e ||= typeof document < `u` ? document : void 0), e === void 0)) return null;
      try {
        return e.activeElement || e.body;
      } catch {
        return e.body;
      }
    }
    var Gt = /[\n"\\]/g;
    function Kt(e) {
      return e.replace(Gt, function (e) {
        return `\\` + e.charCodeAt(0).toString(16) + ` `;
      });
    }
    function qt(e, t, n, r, i, a, o, s) {
      ((e.name = ``),
        o != null && typeof o != `function` && typeof o != `symbol` && typeof o != `boolean`
          ? (e.type = o)
          : e.removeAttribute(`type`),
        t == null
          ? (o !== `submit` && o !== `reset`) || e.removeAttribute(`value`)
          : o === `number`
            ? ((t === 0 && e.value === ``) || e.value != t) && (e.value = `` + zt(t))
            : e.value !== `` + zt(t) && (e.value = `` + zt(t)),
        t == null
          ? n == null
            ? r != null && e.removeAttribute(`value`)
            : Yt(e, o, zt(n))
          : Yt(e, o, zt(t)),
        i == null && a != null && (e.defaultChecked = !!a),
        i != null && (e.checked = i && typeof i != `function` && typeof i != `symbol`),
        s != null && typeof s != `function` && typeof s != `symbol` && typeof s != `boolean`
          ? (e.name = `` + zt(s))
          : e.removeAttribute(`name`));
    }
    function Jt(e, t, n, r, i, a, o, s) {
      if (
        (a != null &&
          typeof a != `function` &&
          typeof a != `symbol` &&
          typeof a != `boolean` &&
          (e.type = a),
        t != null || n != null)
      ) {
        if (!((a !== `submit` && a !== `reset`) || t != null)) {
          Ht(e);
          return;
        }
        ((n = n == null ? `` : `` + zt(n)),
          (t = t == null ? n : `` + zt(t)),
          s || t === e.value || (e.value = t),
          (e.defaultValue = t));
      }
      ((r ??= i),
        (r = typeof r != `function` && typeof r != `symbol` && !!r),
        (e.checked = s ? e.checked : !!r),
        (e.defaultChecked = !!r),
        o != null &&
          typeof o != `function` &&
          typeof o != `symbol` &&
          typeof o != `boolean` &&
          (e.name = o),
        Ht(e));
    }
    function Yt(e, t, n) {
      (t === `number` && Wt(e.ownerDocument) === e) ||
        e.defaultValue === `` + n ||
        (e.defaultValue = `` + n);
    }
    function Xt(e, t, n, r) {
      if (((e = e.options), t)) {
        t = {};
        for (var i = 0; i < n.length; i++) t[`$` + n[i]] = !0;
        for (n = 0; n < e.length; n++)
          ((i = t.hasOwnProperty(`$` + e[n].value)),
            e[n].selected !== i && (e[n].selected = i),
            i && r && (e[n].defaultSelected = !0));
      } else {
        for (n = `` + zt(n), t = null, i = 0; i < e.length; i++) {
          if (e[i].value === n) {
            ((e[i].selected = !0), r && (e[i].defaultSelected = !0));
            return;
          }
          t !== null || e[i].disabled || (t = e[i]);
        }
        t !== null && (t.selected = !0);
      }
    }
    function Zt(e, t, n) {
      if (t != null && ((t = `` + zt(t)), t !== e.value && (e.value = t), n == null)) {
        e.defaultValue !== t && (e.defaultValue = t);
        return;
      }
      e.defaultValue = n == null ? `` : `` + zt(n);
    }
    function Qt(e, t, n, r) {
      if (t == null) {
        if (r != null) {
          if (n != null) throw Error(i(92));
          if (ue(r)) {
            if (1 < r.length) throw Error(i(93));
            r = r[0];
          }
          n = r;
        }
        ((n ??= ``), (t = n));
      }
      ((n = zt(t)),
        (e.defaultValue = n),
        (r = e.textContent),
        r === n && r !== `` && r !== null && (e.value = r),
        Ht(e));
    }
    function $t(e, t) {
      if (t) {
        var n = e.firstChild;
        if (n && n === e.lastChild && n.nodeType === 3) {
          n.nodeValue = t;
          return;
        }
      }
      e.textContent = t;
    }
    var en = new Set(
      `animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp`.split(
        ` `,
      ),
    );
    function tn(e, t, n) {
      var r = t.indexOf(`--`) === 0;
      n == null || typeof n == `boolean` || n === ``
        ? r
          ? e.setProperty(t, ``)
          : t === `float`
            ? (e.cssFloat = ``)
            : (e[t] = ``)
        : r
          ? e.setProperty(t, n)
          : typeof n != `number` || n === 0 || en.has(t)
            ? t === `float`
              ? (e.cssFloat = n)
              : (e[t] = (`` + n).trim())
            : (e[t] = n + `px`);
    }
    function nn(e, t, n) {
      if (t != null && typeof t != `object`) throw Error(i(62));
      if (((e = e.style), n != null)) {
        for (var r in n)
          !n.hasOwnProperty(r) ||
            (t != null && t.hasOwnProperty(r)) ||
            (r.indexOf(`--`) === 0
              ? e.setProperty(r, ``)
              : r === `float`
                ? (e.cssFloat = ``)
                : (e[r] = ``));
        for (var a in t) ((r = t[a]), t.hasOwnProperty(a) && n[a] !== r && tn(e, a, r));
      } else for (var o in t) t.hasOwnProperty(o) && tn(e, o, t[o]);
    }
    function rn(e) {
      if (e.indexOf(`-`) === -1) return !1;
      switch (e) {
        case `annotation-xml`:
        case `color-profile`:
        case `font-face`:
        case `font-face-src`:
        case `font-face-uri`:
        case `font-face-format`:
        case `font-face-name`:
        case `missing-glyph`:
          return !1;
        default:
          return !0;
      }
    }
    var an = new Map([
        [`acceptCharset`, `accept-charset`],
        [`htmlFor`, `for`],
        [`httpEquiv`, `http-equiv`],
        [`crossOrigin`, `crossorigin`],
        [`accentHeight`, `accent-height`],
        [`alignmentBaseline`, `alignment-baseline`],
        [`arabicForm`, `arabic-form`],
        [`baselineShift`, `baseline-shift`],
        [`capHeight`, `cap-height`],
        [`clipPath`, `clip-path`],
        [`clipRule`, `clip-rule`],
        [`colorInterpolation`, `color-interpolation`],
        [`colorInterpolationFilters`, `color-interpolation-filters`],
        [`colorProfile`, `color-profile`],
        [`colorRendering`, `color-rendering`],
        [`dominantBaseline`, `dominant-baseline`],
        [`enableBackground`, `enable-background`],
        [`fillOpacity`, `fill-opacity`],
        [`fillRule`, `fill-rule`],
        [`floodColor`, `flood-color`],
        [`floodOpacity`, `flood-opacity`],
        [`fontFamily`, `font-family`],
        [`fontSize`, `font-size`],
        [`fontSizeAdjust`, `font-size-adjust`],
        [`fontStretch`, `font-stretch`],
        [`fontStyle`, `font-style`],
        [`fontVariant`, `font-variant`],
        [`fontWeight`, `font-weight`],
        [`glyphName`, `glyph-name`],
        [`glyphOrientationHorizontal`, `glyph-orientation-horizontal`],
        [`glyphOrientationVertical`, `glyph-orientation-vertical`],
        [`horizAdvX`, `horiz-adv-x`],
        [`horizOriginX`, `horiz-origin-x`],
        [`imageRendering`, `image-rendering`],
        [`letterSpacing`, `letter-spacing`],
        [`lightingColor`, `lighting-color`],
        [`markerEnd`, `marker-end`],
        [`markerMid`, `marker-mid`],
        [`markerStart`, `marker-start`],
        [`overlinePosition`, `overline-position`],
        [`overlineThickness`, `overline-thickness`],
        [`paintOrder`, `paint-order`],
        [`panose-1`, `panose-1`],
        [`pointerEvents`, `pointer-events`],
        [`renderingIntent`, `rendering-intent`],
        [`shapeRendering`, `shape-rendering`],
        [`stopColor`, `stop-color`],
        [`stopOpacity`, `stop-opacity`],
        [`strikethroughPosition`, `strikethrough-position`],
        [`strikethroughThickness`, `strikethrough-thickness`],
        [`strokeDasharray`, `stroke-dasharray`],
        [`strokeDashoffset`, `stroke-dashoffset`],
        [`strokeLinecap`, `stroke-linecap`],
        [`strokeLinejoin`, `stroke-linejoin`],
        [`strokeMiterlimit`, `stroke-miterlimit`],
        [`strokeOpacity`, `stroke-opacity`],
        [`strokeWidth`, `stroke-width`],
        [`textAnchor`, `text-anchor`],
        [`textDecoration`, `text-decoration`],
        [`textRendering`, `text-rendering`],
        [`transformOrigin`, `transform-origin`],
        [`underlinePosition`, `underline-position`],
        [`underlineThickness`, `underline-thickness`],
        [`unicodeBidi`, `unicode-bidi`],
        [`unicodeRange`, `unicode-range`],
        [`unitsPerEm`, `units-per-em`],
        [`vAlphabetic`, `v-alphabetic`],
        [`vHanging`, `v-hanging`],
        [`vIdeographic`, `v-ideographic`],
        [`vMathematical`, `v-mathematical`],
        [`vectorEffect`, `vector-effect`],
        [`vertAdvY`, `vert-adv-y`],
        [`vertOriginX`, `vert-origin-x`],
        [`vertOriginY`, `vert-origin-y`],
        [`wordSpacing`, `word-spacing`],
        [`writingMode`, `writing-mode`],
        [`xmlnsXlink`, `xmlns:xlink`],
        [`xHeight`, `x-height`],
      ]),
      on =
        /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
    function sn(e) {
      return on.test(`` + e)
        ? `javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')`
        : e;
    }
    function cn() {}
    var ln = null;
    function un(e) {
      return (
        (e = e.target || e.srcElement || window),
        e.correspondingUseElement && (e = e.correspondingUseElement),
        e.nodeType === 3 ? e.parentNode : e
      );
    }
    var dn = null,
      fn = null;
    function pn(e) {
      var t = wt(e);
      if (t && (e = t.stateNode)) {
        var n = e[ht] || null;
        a: switch (((e = t.stateNode), t.type)) {
          case `input`:
            if (
              (qt(
                e,
                n.value,
                n.defaultValue,
                n.defaultValue,
                n.checked,
                n.defaultChecked,
                n.type,
                n.name,
              ),
              (t = n.name),
              n.type === `radio` && t != null)
            ) {
              for (n = e; n.parentNode;) n = n.parentNode;
              for (
                n = n.querySelectorAll(`input[name="` + Kt(`` + t) + `"][type="radio"]`), t = 0;
                t < n.length;
                t++
              ) {
                var r = n[t];
                if (r !== e && r.form === e.form) {
                  var a = r[ht] || null;
                  if (!a) throw Error(i(90));
                  qt(
                    r,
                    a.value,
                    a.defaultValue,
                    a.defaultValue,
                    a.checked,
                    a.defaultChecked,
                    a.type,
                    a.name,
                  );
                }
              }
              for (t = 0; t < n.length; t++) ((r = n[t]), r.form === e.form && Ut(r));
            }
            break a;
          case `textarea`:
            Zt(e, n.value, n.defaultValue);
            break a;
          case `select`:
            ((t = n.value), t != null && Xt(e, !!n.multiple, t, !1));
        }
      }
    }
    var mn = !1;
    function hn(e, t, n) {
      if (mn) return e(t, n);
      mn = !0;
      try {
        return e(t);
      } finally {
        if (
          ((mn = !1),
          (dn !== null || fn !== null) &&
            (xu(), dn && ((t = dn), (e = fn), (fn = dn = null), pn(t), e)))
        )
          for (t = 0; t < e.length; t++) pn(e[t]);
      }
    }
    function gn(e, t) {
      var n = e.stateNode;
      if (n === null) return null;
      var r = n[ht] || null;
      if (r === null) return null;
      n = r[t];
      a: switch (t) {
        case `onClick`:
        case `onClickCapture`:
        case `onDoubleClick`:
        case `onDoubleClickCapture`:
        case `onMouseDown`:
        case `onMouseDownCapture`:
        case `onMouseMove`:
        case `onMouseMoveCapture`:
        case `onMouseUp`:
        case `onMouseUpCapture`:
        case `onMouseEnter`:
          ((r = !r.disabled) ||
            ((e = e.type),
            (r = !(e === `button` || e === `input` || e === `select` || e === `textarea`))),
            (e = !r));
          break a;
        default:
          e = !1;
      }
      if (e) return null;
      if (n && typeof n != `function`) throw Error(i(231, t, typeof n));
      return n;
    }
    var _n = !(
        typeof window > `u` ||
        window.document === void 0 ||
        window.document.createElement === void 0
      ),
      vn = !1;
    if (_n)
      try {
        var yn = {};
        (Object.defineProperty(yn, "passive", {
          get: function () {
            vn = !0;
          },
        }),
          window.addEventListener(`test`, yn, yn),
          window.removeEventListener(`test`, yn, yn));
      } catch {
        vn = !1;
      }
    var bn = null,
      xn = null,
      Sn = null;
    function Cn() {
      if (Sn) return Sn;
      var e,
        t = xn,
        n = t.length,
        r,
        i = `value` in bn ? bn.value : bn.textContent,
        a = i.length;
      for (e = 0; e < n && t[e] === i[e]; e++);
      var o = n - e;
      for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
      return (Sn = i.slice(e, 1 < r ? 1 - r : void 0));
    }
    function wn(e) {
      var t = e.keyCode;
      return (
        `charCode` in e ? ((e = e.charCode), e === 0 && t === 13 && (e = 13)) : (e = t),
        e === 10 && (e = 13),
        32 <= e || e === 13 ? e : 0
      );
    }
    function Tn() {
      return !0;
    }
    function En() {
      return !1;
    }
    function Dn(e) {
      function t(t, n, r, i, a) {
        for (var o in ((this._reactName = t),
        (this._targetInst = r),
        (this.type = n),
        (this.nativeEvent = i),
        (this.target = a),
        (this.currentTarget = null),
        e))
          e.hasOwnProperty(o) && ((t = e[o]), (this[o] = t ? t(i) : i[o]));
        return (
          (this.isDefaultPrevented = (
            i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented
          )
            ? Tn
            : En),
          (this.isPropagationStopped = En),
          this
        );
      }
      return (
        m(t.prototype, {
          preventDefault: function () {
            this.defaultPrevented = !0;
            var e = this.nativeEvent;
            e &&
              (e.preventDefault
                ? e.preventDefault()
                : typeof e.returnValue != `unknown` && (e.returnValue = !1),
              (this.isDefaultPrevented = Tn));
          },
          stopPropagation: function () {
            var e = this.nativeEvent;
            e &&
              (e.stopPropagation
                ? e.stopPropagation()
                : typeof e.cancelBubble != `unknown` && (e.cancelBubble = !0),
              (this.isPropagationStopped = Tn));
          },
          persist: function () {},
          isPersistent: Tn,
        }),
        t
      );
    }
    var On = {
        eventPhase: 0,
        bubbles: 0,
        cancelable: 0,
        timeStamp: function (e) {
          return e.timeStamp || Date.now();
        },
        defaultPrevented: 0,
        isTrusted: 0,
      },
      kn = Dn(On),
      An = m({}, On, { view: 0, detail: 0 }),
      jn = Dn(An),
      Mn,
      Nn,
      Pn,
      Fn = m({}, An, {
        screenX: 0,
        screenY: 0,
        clientX: 0,
        clientY: 0,
        pageX: 0,
        pageY: 0,
        ctrlKey: 0,
        shiftKey: 0,
        altKey: 0,
        metaKey: 0,
        getModifierState: Kn,
        button: 0,
        buttons: 0,
        relatedTarget: function (e) {
          return e.relatedTarget === void 0
            ? e.fromElement === e.srcElement
              ? e.toElement
              : e.fromElement
            : e.relatedTarget;
        },
        movementX: function (e) {
          return `movementX` in e
            ? e.movementX
            : (e !== Pn &&
                (Pn && e.type === `mousemove`
                  ? ((Mn = e.screenX - Pn.screenX), (Nn = e.screenY - Pn.screenY))
                  : (Nn = Mn = 0),
                (Pn = e)),
              Mn);
        },
        movementY: function (e) {
          return `movementY` in e ? e.movementY : Nn;
        },
      }),
      In = Dn(Fn),
      Ln = Dn(m({}, Fn, { dataTransfer: 0 })),
      Rn = Dn(m({}, An, { relatedTarget: 0 })),
      zn = Dn(m({}, On, { animationName: 0, elapsedTime: 0, pseudoElement: 0 })),
      Bn = Dn(
        m({}, On, {
          clipboardData: function (e) {
            return `clipboardData` in e ? e.clipboardData : window.clipboardData;
          },
        }),
      ),
      Vn = Dn(m({}, On, { data: 0 })),
      Hn = {
        Esc: `Escape`,
        Spacebar: ` `,
        Left: `ArrowLeft`,
        Up: `ArrowUp`,
        Right: `ArrowRight`,
        Down: `ArrowDown`,
        Del: `Delete`,
        Win: `OS`,
        Menu: `ContextMenu`,
        Apps: `ContextMenu`,
        Scroll: `ScrollLock`,
        MozPrintableKey: `Unidentified`,
      },
      Un = {
        8: `Backspace`,
        9: `Tab`,
        12: `Clear`,
        13: `Enter`,
        16: `Shift`,
        17: `Control`,
        18: `Alt`,
        19: `Pause`,
        20: `CapsLock`,
        27: `Escape`,
        32: ` `,
        33: `PageUp`,
        34: `PageDown`,
        35: `End`,
        36: `Home`,
        37: `ArrowLeft`,
        38: `ArrowUp`,
        39: `ArrowRight`,
        40: `ArrowDown`,
        45: `Insert`,
        46: `Delete`,
        112: `F1`,
        113: `F2`,
        114: `F3`,
        115: `F4`,
        116: `F5`,
        117: `F6`,
        118: `F7`,
        119: `F8`,
        120: `F9`,
        121: `F10`,
        122: `F11`,
        123: `F12`,
        144: `NumLock`,
        145: `ScrollLock`,
        224: `Meta`,
      },
      Wn = { Alt: `altKey`, Control: `ctrlKey`, Meta: `metaKey`, Shift: `shiftKey` };
    function Gn(e) {
      var t = this.nativeEvent;
      return t.getModifierState ? t.getModifierState(e) : (e = Wn[e]) ? !!t[e] : !1;
    }
    function Kn() {
      return Gn;
    }
    var qn = Dn(
        m({}, An, {
          key: function (e) {
            if (e.key) {
              var t = Hn[e.key] || e.key;
              if (t !== `Unidentified`) return t;
            }
            return e.type === `keypress`
              ? ((e = wn(e)), e === 13 ? `Enter` : String.fromCharCode(e))
              : e.type === `keydown` || e.type === `keyup`
                ? Un[e.keyCode] || `Unidentified`
                : ``;
          },
          code: 0,
          location: 0,
          ctrlKey: 0,
          shiftKey: 0,
          altKey: 0,
          metaKey: 0,
          repeat: 0,
          locale: 0,
          getModifierState: Kn,
          charCode: function (e) {
            return e.type === `keypress` ? wn(e) : 0;
          },
          keyCode: function (e) {
            return e.type === `keydown` || e.type === `keyup` ? e.keyCode : 0;
          },
          which: function (e) {
            return e.type === `keypress`
              ? wn(e)
              : e.type === `keydown` || e.type === `keyup`
                ? e.keyCode
                : 0;
          },
        }),
      ),
      Jn = Dn(
        m({}, Fn, {
          pointerId: 0,
          width: 0,
          height: 0,
          pressure: 0,
          tangentialPressure: 0,
          tiltX: 0,
          tiltY: 0,
          twist: 0,
          pointerType: 0,
          isPrimary: 0,
        }),
      ),
      Yn = Dn(
        m({}, An, {
          touches: 0,
          targetTouches: 0,
          changedTouches: 0,
          altKey: 0,
          metaKey: 0,
          ctrlKey: 0,
          shiftKey: 0,
          getModifierState: Kn,
        }),
      ),
      Xn = Dn(m({}, On, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 })),
      Zn = Dn(
        m({}, Fn, {
          deltaX: function (e) {
            return `deltaX` in e ? e.deltaX : `wheelDeltaX` in e ? -e.wheelDeltaX : 0;
          },
          deltaY: function (e) {
            return `deltaY` in e
              ? e.deltaY
              : `wheelDeltaY` in e
                ? -e.wheelDeltaY
                : `wheelDelta` in e
                  ? -e.wheelDelta
                  : 0;
          },
          deltaZ: 0,
          deltaMode: 0,
        }),
      ),
      Qn = Dn(m({}, On, { newState: 0, oldState: 0 })),
      $n = [9, 13, 27, 32],
      er = _n && `CompositionEvent` in window,
      tr = null;
    _n && `documentMode` in document && (tr = document.documentMode);
    var nr = _n && `TextEvent` in window && !tr,
      rr = _n && (!er || (tr && 8 < tr && 11 >= tr)),
      ir = ` `,
      ar = !1;
    function or(e, t) {
      switch (e) {
        case `keyup`:
          return $n.indexOf(t.keyCode) !== -1;
        case `keydown`:
          return t.keyCode !== 229;
        case `keypress`:
        case `mousedown`:
        case `focusout`:
          return !0;
        default:
          return !1;
      }
    }
    function sr(e) {
      return ((e = e.detail), typeof e == `object` && `data` in e ? e.data : null);
    }
    var cr = !1;
    function lr(e, t) {
      switch (e) {
        case `compositionend`:
          return sr(t);
        case `keypress`:
          return t.which === 32 ? ((ar = !0), ir) : null;
        case `textInput`:
          return ((e = t.data), e === ir && ar ? null : e);
        default:
          return null;
      }
    }
    function ur(e, t) {
      if (cr)
        return e === `compositionend` || (!er && or(e, t))
          ? ((e = Cn()), (Sn = xn = bn = null), (cr = !1), e)
          : null;
      switch (e) {
        case `paste`:
          return null;
        case `keypress`:
          if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
            if (t.char && 1 < t.char.length) return t.char;
            if (t.which) return String.fromCharCode(t.which);
          }
          return null;
        case `compositionend`:
          return rr && t.locale !== `ko` ? null : t.data;
        default:
          return null;
      }
    }
    var dr = {
      color: !0,
      date: !0,
      datetime: !0,
      "datetime-local": !0,
      email: !0,
      month: !0,
      number: !0,
      password: !0,
      range: !0,
      search: !0,
      tel: !0,
      text: !0,
      time: !0,
      url: !0,
      week: !0,
    };
    function fr(e) {
      var t = e && e.nodeName && e.nodeName.toLowerCase();
      return t === `input` ? !!dr[e.type] : t === `textarea`;
    }
    function pr(e, t, n, r) {
      (dn ? (fn ? fn.push(r) : (fn = [r])) : (dn = r),
        (t = Dd(t, `onChange`)),
        0 < t.length &&
          ((n = new kn(`onChange`, `change`, null, n, r)), e.push({ event: n, listeners: t })));
    }
    var M = null,
      mr = null;
    function hr(e) {
      bd(e, 0);
    }
    function gr(e) {
      if (Ut(Tt(e))) return e;
    }
    function N(e, t) {
      if (e === `change`) return t;
    }
    var _r = !1;
    if (_n) {
      var vr;
      if (_n) {
        var yr = `oninput` in document;
        if (!yr) {
          var br = document.createElement(`div`);
          (br.setAttribute(`oninput`, `return;`), (yr = typeof br.oninput == `function`));
        }
        vr = yr;
      } else vr = !1;
      _r = vr && (!document.documentMode || 9 < document.documentMode);
    }
    function xr() {
      M && (M.detachEvent(`onpropertychange`, Sr), (mr = M = null));
    }
    function Sr(e) {
      if (e.propertyName === `value` && gr(mr)) {
        var t = [];
        (pr(t, mr, e, un(e)), hn(hr, t));
      }
    }
    function Cr(e, t, n) {
      e === `focusin`
        ? (xr(), (M = t), (mr = n), M.attachEvent(`onpropertychange`, Sr))
        : e === `focusout` && xr();
    }
    function wr(e) {
      if (e === `selectionchange` || e === `keyup` || e === `keydown`) return gr(mr);
    }
    function Tr(e, t) {
      if (e === `click`) return gr(t);
    }
    function Er(e, t) {
      if (e === `input` || e === `change`) return gr(t);
    }
    function Dr(e, t) {
      return (e === t && (e !== 0 || 1 / e == 1 / t)) || (e !== e && t !== t);
    }
    var Or = typeof Object.is == `function` ? Object.is : Dr;
    function kr(e, t) {
      if (Or(e, t)) return !0;
      if (typeof e != `object` || !e || typeof t != `object` || !t) return !1;
      var n = Object.keys(e),
        r = Object.keys(t);
      if (n.length !== r.length) return !1;
      for (r = 0; r < n.length; r++) {
        var i = n[r];
        if (!Oe.call(t, i) || !Or(e[i], t[i])) return !1;
      }
      return !0;
    }
    function Ar(e) {
      for (; e && e.firstChild;) e = e.firstChild;
      return e;
    }
    function jr(e, t) {
      var n = Ar(e);
      e = 0;
      for (var r; n;) {
        if (n.nodeType === 3) {
          if (((r = e + n.textContent.length), e <= t && r >= t)) return { node: n, offset: t - e };
          e = r;
        }
        a: {
          for (; n;) {
            if (n.nextSibling) {
              n = n.nextSibling;
              break a;
            }
            n = n.parentNode;
          }
          n = void 0;
        }
        n = Ar(n);
      }
    }
    function Mr(e, t) {
      return e && t
        ? e === t
          ? !0
          : e && e.nodeType === 3
            ? !1
            : t && t.nodeType === 3
              ? Mr(e, t.parentNode)
              : `contains` in e
                ? e.contains(t)
                : e.compareDocumentPosition
                  ? !!(e.compareDocumentPosition(t) & 16)
                  : !1
        : !1;
    }
    function Nr(e) {
      e =
        e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null
          ? e.ownerDocument.defaultView
          : window;
      for (var t = Wt(e.document); t instanceof e.HTMLIFrameElement;) {
        try {
          var n = typeof t.contentWindow.location.href == `string`;
        } catch {
          n = !1;
        }
        if (n) e = t.contentWindow;
        else break;
        t = Wt(e.document);
      }
      return t;
    }
    function Pr(e) {
      var t = e && e.nodeName && e.nodeName.toLowerCase();
      return (
        t &&
        ((t === `input` &&
          (e.type === `text` ||
            e.type === `search` ||
            e.type === `tel` ||
            e.type === `url` ||
            e.type === `password`)) ||
          t === `textarea` ||
          e.contentEditable === `true`)
      );
    }
    var Fr = _n && `documentMode` in document && 11 >= document.documentMode,
      Ir = null,
      Lr = null,
      Rr = null,
      zr = !1;
    function Br(e, t, n) {
      var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
      zr ||
        Ir == null ||
        Ir !== Wt(r) ||
        ((r = Ir),
        `selectionStart` in r && Pr(r)
          ? (r = { start: r.selectionStart, end: r.selectionEnd })
          : ((r = ((r.ownerDocument && r.ownerDocument.defaultView) || window).getSelection()),
            (r = {
              anchorNode: r.anchorNode,
              anchorOffset: r.anchorOffset,
              focusNode: r.focusNode,
              focusOffset: r.focusOffset,
            })),
        (Rr && kr(Rr, r)) ||
          ((Rr = r),
          (r = Dd(Lr, `onSelect`)),
          0 < r.length &&
            ((t = new kn(`onSelect`, `select`, null, t, n)),
            e.push({ event: t, listeners: r }),
            (t.target = Ir))));
    }
    function Vr(e, t) {
      var n = {};
      return (
        (n[e.toLowerCase()] = t.toLowerCase()),
        (n[`Webkit` + e] = `webkit` + t),
        (n[`Moz` + e] = `moz` + t),
        n
      );
    }
    var Hr = {
        animationend: Vr(`Animation`, `AnimationEnd`),
        animationiteration: Vr(`Animation`, `AnimationIteration`),
        animationstart: Vr(`Animation`, `AnimationStart`),
        transitionrun: Vr(`Transition`, `TransitionRun`),
        transitionstart: Vr(`Transition`, `TransitionStart`),
        transitioncancel: Vr(`Transition`, `TransitionCancel`),
        transitionend: Vr(`Transition`, `TransitionEnd`),
      },
      Ur = {},
      Wr = {};
    _n &&
      ((Wr = document.createElement(`div`).style),
      `AnimationEvent` in window ||
        (delete Hr.animationend.animation,
        delete Hr.animationiteration.animation,
        delete Hr.animationstart.animation),
      `TransitionEvent` in window || delete Hr.transitionend.transition);
    function Gr(e) {
      if (Ur[e]) return Ur[e];
      if (!Hr[e]) return e;
      var t = Hr[e],
        n;
      for (n in t) if (t.hasOwnProperty(n) && n in Wr) return (Ur[e] = t[n]);
      return e;
    }
    var Kr = Gr(`animationend`),
      qr = Gr(`animationiteration`),
      Jr = Gr(`animationstart`),
      Yr = Gr(`transitionrun`),
      Xr = Gr(`transitionstart`),
      Zr = Gr(`transitioncancel`),
      Qr = Gr(`transitionend`),
      $r = new Map(),
      ei =
        `abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel`.split(
          ` `,
        );
    ei.push(`scrollEnd`);
    function ti(e, t) {
      ($r.set(e, t), At(t, [e]));
    }
    var ni =
        typeof reportError == `function`
          ? reportError
          : function (e) {
              if (typeof window == `object` && typeof window.ErrorEvent == `function`) {
                var t = new window.ErrorEvent(`error`, {
                  bubbles: !0,
                  cancelable: !0,
                  message:
                    typeof e == `object` && e && typeof e.message == `string`
                      ? String(e.message)
                      : String(e),
                  error: e,
                });
                if (!window.dispatchEvent(t)) return;
              } else if (typeof process == `object` && typeof process.emit == `function`) {
                process.emit(`uncaughtException`, e);
                return;
              }
              console.error(e);
            },
      ri = [],
      ii = 0,
      ai = 0;
    function oi() {
      for (var e = ii, t = (ai = ii = 0); t < e;) {
        var n = ri[t];
        ri[t++] = null;
        var r = ri[t];
        ri[t++] = null;
        var i = ri[t];
        ri[t++] = null;
        var a = ri[t];
        if (((ri[t++] = null), r !== null && i !== null)) {
          var o = r.pending;
          (o === null ? (i.next = i) : ((i.next = o.next), (o.next = i)), (r.pending = i));
        }
        a !== 0 && ui(n, i, a);
      }
    }
    function si(e, t, n, r) {
      ((ri[ii++] = e),
        (ri[ii++] = t),
        (ri[ii++] = n),
        (ri[ii++] = r),
        (ai |= r),
        (e.lanes |= r),
        (e = e.alternate),
        e !== null && (e.lanes |= r));
    }
    function ci(e, t, n, r) {
      return (si(e, t, n, r), di(e));
    }
    function li(e, t) {
      return (si(e, null, null, t), di(e));
    }
    function ui(e, t, n) {
      e.lanes |= n;
      var r = e.alternate;
      r !== null && (r.lanes |= n);
      for (var i = !1, a = e.return; a !== null;)
        ((a.childLanes |= n),
          (r = a.alternate),
          r !== null && (r.childLanes |= n),
          a.tag === 22 && ((e = a.stateNode), e === null || e._visibility & 1 || (i = !0)),
          (e = a),
          (a = a.return));
      return e.tag === 3
        ? ((a = e.stateNode),
          i &&
            t !== null &&
            ((i = 31 - Ge(n)),
            (e = a.hiddenUpdates),
            (r = e[i]),
            r === null ? (e[i] = [t]) : r.push(t),
            (t.lane = n | 536870912)),
          a)
        : null;
    }
    function di(e) {
      if (50 < fu) throw ((fu = 0), (pu = null), Error(i(185)));
      for (var t = e.return; t !== null;) ((e = t), (t = e.return));
      return e.tag === 3 ? e.stateNode : null;
    }
    var fi = {};
    function pi(e, t, n, r) {
      ((this.tag = e),
        (this.key = n),
        (this.sibling =
          this.child =
          this.return =
          this.stateNode =
          this.type =
          this.elementType =
            null),
        (this.index = 0),
        (this.refCleanup = this.ref = null),
        (this.pendingProps = t),
        (this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
        (this.mode = r),
        (this.subtreeFlags = this.flags = 0),
        (this.deletions = null),
        (this.childLanes = this.lanes = 0),
        (this.alternate = null));
    }
    function mi(e, t, n, r) {
      return new pi(e, t, n, r);
    }
    function hi(e) {
      return ((e = e.prototype), !(!e || !e.isReactComponent));
    }
    function gi(e, t) {
      var n = e.alternate;
      return (
        n === null
          ? ((n = mi(e.tag, t, e.key, e.mode)),
            (n.elementType = e.elementType),
            (n.type = e.type),
            (n.stateNode = e.stateNode),
            (n.alternate = e),
            (e.alternate = n))
          : ((n.pendingProps = t),
            (n.type = e.type),
            (n.flags = 0),
            (n.subtreeFlags = 0),
            (n.deletions = null)),
        (n.flags = e.flags & 65011712),
        (n.childLanes = e.childLanes),
        (n.lanes = e.lanes),
        (n.child = e.child),
        (n.memoizedProps = e.memoizedProps),
        (n.memoizedState = e.memoizedState),
        (n.updateQueue = e.updateQueue),
        (t = e.dependencies),
        (n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
        (n.sibling = e.sibling),
        (n.index = e.index),
        (n.ref = e.ref),
        (n.refCleanup = e.refCleanup),
        n
      );
    }
    function _i(e, t) {
      e.flags &= 65011714;
      var n = e.alternate;
      return (
        n === null
          ? ((e.childLanes = 0),
            (e.lanes = t),
            (e.child = null),
            (e.subtreeFlags = 0),
            (e.memoizedProps = null),
            (e.memoizedState = null),
            (e.updateQueue = null),
            (e.dependencies = null),
            (e.stateNode = null))
          : ((e.childLanes = n.childLanes),
            (e.lanes = n.lanes),
            (e.child = n.child),
            (e.subtreeFlags = 0),
            (e.deletions = null),
            (e.memoizedProps = n.memoizedProps),
            (e.memoizedState = n.memoizedState),
            (e.updateQueue = n.updateQueue),
            (e.type = n.type),
            (t = n.dependencies),
            (e.dependencies =
              t === null ? null : { lanes: t.lanes, firstContext: t.firstContext })),
        e
      );
    }
    function vi(e, t, n, r, a, o) {
      var s = 0;
      if (((r = e), typeof e == `function`)) hi(e) && (s = 1);
      else if (typeof e == `string`)
        s = Wf(e, n, he.current) ? 26 : e === `html` || e === `head` || e === `body` ? 27 : 5;
      else
        a: switch (e) {
          case ie:
            return ((e = mi(31, n, t, a)), (e.elementType = ie), (e.lanes = o), e);
          case v:
            return yi(n.children, a, o, t);
          case y:
            ((s = 8), (a |= 24));
            break;
          case b:
            return ((e = mi(12, n, t, a | 2)), (e.elementType = b), (e.lanes = o), e);
          case ee:
            return ((e = mi(13, n, t, a)), (e.elementType = ee), (e.lanes = o), e);
          case te:
            return ((e = mi(19, n, t, a)), (e.elementType = te), (e.lanes = o), e);
          default:
            if (typeof e == `object` && e)
              switch (e.$$typeof) {
                case S:
                  s = 10;
                  break a;
                case x:
                  s = 9;
                  break a;
                case C:
                  s = 11;
                  break a;
                case re:
                  s = 14;
                  break a;
                case w:
                  ((s = 16), (r = null));
                  break a;
              }
            ((s = 29), (n = Error(i(130, e === null ? `null` : typeof e, ``))), (r = null));
        }
      return ((t = mi(s, n, t, a)), (t.elementType = e), (t.type = r), (t.lanes = o), t);
    }
    function yi(e, t, n, r) {
      return ((e = mi(7, e, r, t)), (e.lanes = n), e);
    }
    function bi(e, t, n) {
      return ((e = mi(6, e, null, t)), (e.lanes = n), e);
    }
    function xi(e) {
      var t = mi(18, null, null, 0);
      return ((t.stateNode = e), t);
    }
    function Si(e, t, n) {
      return (
        (t = mi(4, e.children === null ? [] : e.children, e.key, t)),
        (t.lanes = n),
        (t.stateNode = {
          containerInfo: e.containerInfo,
          pendingChildren: null,
          implementation: e.implementation,
        }),
        t
      );
    }
    var Ci = new WeakMap();
    function wi(e, t) {
      if (typeof e == `object` && e) {
        var n = Ci.get(e);
        return n === void 0 ? ((t = { value: e, source: t, stack: De(t) }), Ci.set(e, t), t) : n;
      }
      return { value: e, source: t, stack: De(t) };
    }
    var Ti = [],
      Ei = 0,
      Di = null,
      Oi = 0,
      ki = [],
      Ai = 0,
      ji = null,
      Mi = 1,
      Ni = ``;
    function Pi(e, t) {
      ((Ti[Ei++] = Oi), (Ti[Ei++] = Di), (Di = e), (Oi = t));
    }
    function Fi(e, t, n) {
      ((ki[Ai++] = Mi), (ki[Ai++] = Ni), (ki[Ai++] = ji), (ji = e));
      var r = Mi;
      e = Ni;
      var i = 32 - Ge(r) - 1;
      ((r &= ~(1 << i)), (n += 1));
      var a = 32 - Ge(t) + i;
      if (30 < a) {
        var o = i - (i % 5);
        ((a = (r & ((1 << o) - 1)).toString(32)),
          (r >>= o),
          (i -= o),
          (Mi = (1 << (32 - Ge(t) + i)) | (n << i) | r),
          (Ni = a + e));
      } else ((Mi = (1 << a) | (n << i) | r), (Ni = e));
    }
    function Ii(e) {
      e.return !== null && (Pi(e, 1), Fi(e, 1, 0));
    }
    function Li(e) {
      for (; e === Di;) ((Di = Ti[--Ei]), (Ti[Ei] = null), (Oi = Ti[--Ei]), (Ti[Ei] = null));
      for (; e === ji;)
        ((ji = ki[--Ai]),
          (ki[Ai] = null),
          (Ni = ki[--Ai]),
          (ki[Ai] = null),
          (Mi = ki[--Ai]),
          (ki[Ai] = null));
    }
    function Ri(e, t) {
      ((ki[Ai++] = Mi), (ki[Ai++] = Ni), (ki[Ai++] = ji), (Mi = t.id), (Ni = t.overflow), (ji = e));
    }
    var zi = null,
      P = null,
      F = !1,
      Bi = null,
      Vi = !1,
      Hi = Error(i(519));
    function Ui(e) {
      throw (
        Yi(
          wi(
            Error(
              i(
                418,
                1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? `text` : `HTML`,
                ``,
              ),
            ),
            e,
          ),
        ),
        Hi
      );
    }
    function Wi(e) {
      var t = e.stateNode,
        n = e.type,
        r = e.memoizedProps;
      switch (((t[mt] = e), (t[ht] = r), n)) {
        case `dialog`:
          (Q(`cancel`, t), Q(`close`, t));
          break;
        case `iframe`:
        case `object`:
        case `embed`:
          Q(`load`, t);
          break;
        case `video`:
        case `audio`:
          for (n = 0; n < vd.length; n++) Q(vd[n], t);
          break;
        case `source`:
          Q(`error`, t);
          break;
        case `img`:
        case `image`:
        case `link`:
          (Q(`error`, t), Q(`load`, t));
          break;
        case `details`:
          Q(`toggle`, t);
          break;
        case `input`:
          (Q(`invalid`, t),
            Jt(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0));
          break;
        case `select`:
          Q(`invalid`, t);
          break;
        case `textarea`:
          (Q(`invalid`, t), Qt(t, r.value, r.defaultValue, r.children));
      }
      ((n = r.children),
        (typeof n != `string` && typeof n != `number` && typeof n != `bigint`) ||
        t.textContent === `` + n ||
        !0 === r.suppressHydrationWarning ||
        Nd(t.textContent, n)
          ? (r.popover != null && (Q(`beforetoggle`, t), Q(`toggle`, t)),
            r.onScroll != null && Q(`scroll`, t),
            r.onScrollEnd != null && Q(`scrollend`, t),
            r.onClick != null && (t.onclick = cn),
            (t = !0))
          : (t = !1),
        t || Ui(e, !0));
    }
    function Gi(e) {
      for (zi = e.return; zi;)
        switch (zi.tag) {
          case 5:
          case 31:
          case 13:
            Vi = !1;
            return;
          case 27:
          case 3:
            Vi = !0;
            return;
          default:
            zi = zi.return;
        }
    }
    function Ki(e) {
      if (e !== zi) return !1;
      if (!F) return (Gi(e), (F = !0), !1);
      var t = e.tag,
        n;
      if (
        ((n = t !== 3 && t !== 27) &&
          ((n = t === 5) &&
            ((n = e.type), (n = !(n !== `form` && n !== `button`) || Wd(e.type, e.memoizedProps))),
          (n = !n)),
        n && P && Ui(e),
        Gi(e),
        t === 13)
      ) {
        if (((e = e.memoizedState), (e = e === null ? null : e.dehydrated), !e))
          throw Error(i(317));
        P = df(e);
      } else if (t === 31) {
        if (((e = e.memoizedState), (e = e === null ? null : e.dehydrated), !e))
          throw Error(i(317));
        P = df(e);
      } else
        t === 27
          ? ((t = P), Qd(e.type) ? ((e = uf), (uf = null), (P = e)) : (P = t))
          : (P = zi ? lf(e.stateNode.nextSibling) : null);
      return !0;
    }
    function qi() {
      ((P = zi = null), (F = !1));
    }
    function Ji() {
      var e = Bi;
      return (e !== null && (Ql === null ? (Ql = e) : Ql.push.apply(Ql, e), (Bi = null)), e);
    }
    function Yi(e) {
      Bi === null ? (Bi = [e]) : Bi.push(e);
    }
    var Xi = me(null),
      Zi = null,
      Qi = null;
    function $i(e, t, n) {
      (k(Xi, t._currentValue), (t._currentValue = n));
    }
    function ea(e) {
      ((e._currentValue = Xi.current), O(Xi));
    }
    function ta(e, t, n) {
      for (; e !== null;) {
        var r = e.alternate;
        if (
          ((e.childLanes & t) === t
            ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t)
            : ((e.childLanes |= t), r !== null && (r.childLanes |= t)),
          e === n)
        )
          break;
        e = e.return;
      }
    }
    function na(e, t, n, r) {
      var a = e.child;
      for (a !== null && (a.return = e); a !== null;) {
        var o = a.dependencies;
        if (o !== null) {
          var s = a.child;
          o = o.firstContext;
          a: for (; o !== null;) {
            var c = o;
            o = a;
            for (var l = 0; l < t.length; l++)
              if (c.context === t[l]) {
                ((o.lanes |= n),
                  (c = o.alternate),
                  c !== null && (c.lanes |= n),
                  ta(o.return, n, e),
                  r || (s = null));
                break a;
              }
            o = c.next;
          }
        } else if (a.tag === 18) {
          if (((s = a.return), s === null)) throw Error(i(341));
          ((s.lanes |= n),
            (o = s.alternate),
            o !== null && (o.lanes |= n),
            ta(s, n, e),
            (s = null));
        } else s = a.child;
        if (s !== null) s.return = a;
        else
          for (s = a; s !== null;) {
            if (s === e) {
              s = null;
              break;
            }
            if (((a = s.sibling), a !== null)) {
              ((a.return = s.return), (s = a));
              break;
            }
            s = s.return;
          }
        a = s;
      }
    }
    function ra(e, t, n, r) {
      e = null;
      for (var a = t, o = !1; a !== null;) {
        if (!o) {
          if (a.flags & 524288) o = !0;
          else if (a.flags & 262144) break;
        }
        if (a.tag === 10) {
          var s = a.alternate;
          if (s === null) throw Error(i(387));
          if (((s = s.memoizedProps), s !== null)) {
            var c = a.type;
            Or(a.pendingProps.value, s.value) || (e === null ? (e = [c]) : e.push(c));
          }
        } else if (a === ve.current) {
          if (((s = a.alternate), s === null)) throw Error(i(387));
          s.memoizedState.memoizedState !== a.memoizedState.memoizedState &&
            (e === null ? (e = [$f]) : e.push($f));
        }
        a = a.return;
      }
      (e !== null && na(t, e, n, r), (t.flags |= 262144));
    }
    function ia(e) {
      for (e = e.firstContext; e !== null;) {
        if (!Or(e.context._currentValue, e.memoizedValue)) return !0;
        e = e.next;
      }
      return !1;
    }
    function aa(e) {
      ((Zi = e), (Qi = null), (e = e.dependencies), e !== null && (e.firstContext = null));
    }
    function oa(e) {
      return ca(Zi, e);
    }
    function sa(e, t) {
      return (Zi === null && aa(e), ca(e, t));
    }
    function ca(e, t) {
      var n = t._currentValue;
      if (((t = { context: t, memoizedValue: n, next: null }), Qi === null)) {
        if (e === null) throw Error(i(308));
        ((Qi = t), (e.dependencies = { lanes: 0, firstContext: t }), (e.flags |= 524288));
      } else Qi = Qi.next = t;
      return n;
    }
    var la =
        typeof AbortController < `u`
          ? AbortController
          : function () {
              var e = [],
                t = (this.signal = {
                  aborted: !1,
                  addEventListener: function (t, n) {
                    e.push(n);
                  },
                });
              this.abort = function () {
                ((t.aborted = !0),
                  e.forEach(function (e) {
                    return e();
                  }));
              };
            },
      ua = t.unstable_scheduleCallback,
      da = t.unstable_NormalPriority,
      fa = {
        $$typeof: S,
        Consumer: null,
        Provider: null,
        _currentValue: null,
        _currentValue2: null,
        _threadCount: 0,
      };
    function pa() {
      return { controller: new la(), data: new Map(), refCount: 0 };
    }
    function ma(e) {
      (e.refCount--,
        e.refCount === 0 &&
          ua(da, function () {
            e.controller.abort();
          }));
    }
    var ha = null,
      ga = 0,
      _a = 0,
      va = null;
    function ya(e, t) {
      if (ha === null) {
        var n = (ha = []);
        ((ga = 0),
          (_a = fd()),
          (va = {
            status: `pending`,
            value: void 0,
            then: function (e) {
              n.push(e);
            },
          }));
      }
      return (ga++, t.then(ba, ba), t);
    }
    function ba() {
      if (--ga === 0 && ha !== null) {
        va !== null && (va.status = `fulfilled`);
        var e = ha;
        ((ha = null), (_a = 0), (va = null));
        for (var t = 0; t < e.length; t++) (0, e[t])();
      }
    }
    function xa(e, t) {
      var n = [],
        r = {
          status: `pending`,
          value: null,
          reason: null,
          then: function (e) {
            n.push(e);
          },
        };
      return (
        e.then(
          function () {
            ((r.status = `fulfilled`), (r.value = t));
            for (var e = 0; e < n.length; e++) (0, n[e])(t);
          },
          function (e) {
            for (r.status = `rejected`, r.reason = e, e = 0; e < n.length; e++) (0, n[e])(void 0);
          },
        ),
        r
      );
    }
    var Sa = E.S;
    E.S = function (e, t) {
      ((tu = Ne()),
        typeof t == `object` && t && typeof t.then == `function` && ya(e, t),
        Sa !== null && Sa(e, t));
    };
    var Ca = me(null);
    function wa() {
      var e = Ca.current;
      return e === null ? q.pooledCache : e;
    }
    function Ta(e, t) {
      t === null ? k(Ca, Ca.current) : k(Ca, t.pool);
    }
    function Ea() {
      var e = wa();
      return e === null ? null : { parent: fa._currentValue, pool: e };
    }
    var Da = Error(i(460)),
      Oa = Error(i(474)),
      ka = Error(i(542)),
      Aa = { then: function () {} };
    function ja(e) {
      return ((e = e.status), e === `fulfilled` || e === `rejected`);
    }
    function Ma(e, t, n) {
      switch (
        ((n = e[n]), n === void 0 ? e.push(t) : n !== t && (t.then(cn, cn), (t = n)), t.status)
      ) {
        case `fulfilled`:
          return t.value;
        case `rejected`:
          throw ((e = t.reason), Ia(e), e);
        default:
          if (typeof t.status == `string`) t.then(cn, cn);
          else {
            if (((e = q), e !== null && 100 < e.shellSuspendCounter)) throw Error(i(482));
            ((e = t),
              (e.status = `pending`),
              e.then(
                function (e) {
                  if (t.status === `pending`) {
                    var n = t;
                    ((n.status = `fulfilled`), (n.value = e));
                  }
                },
                function (e) {
                  if (t.status === `pending`) {
                    var n = t;
                    ((n.status = `rejected`), (n.reason = e));
                  }
                },
              ));
          }
          switch (t.status) {
            case `fulfilled`:
              return t.value;
            case `rejected`:
              throw ((e = t.reason), Ia(e), e);
          }
          throw ((Pa = t), Da);
      }
    }
    function Na(e) {
      try {
        var t = e._init;
        return t(e._payload);
      } catch (e) {
        throw typeof e == `object` && e && typeof e.then == `function` ? ((Pa = e), Da) : e;
      }
    }
    var Pa = null;
    function Fa() {
      if (Pa === null) throw Error(i(459));
      var e = Pa;
      return ((Pa = null), e);
    }
    function Ia(e) {
      if (e === Da || e === ka) throw Error(i(483));
    }
    var La = null,
      Ra = 0;
    function za(e) {
      var t = Ra;
      return ((Ra += 1), La === null && (La = []), Ma(La, e, t));
    }
    function Ba(e, t) {
      ((t = t.props.ref), (e.ref = t === void 0 ? null : t));
    }
    function Va(e, t) {
      throw t.$$typeof === h
        ? Error(i(525))
        : ((e = Object.prototype.toString.call(t)),
          Error(
            i(
              31,
              e === `[object Object]` ? `object with keys {` + Object.keys(t).join(`, `) + `}` : e,
            ),
          ));
    }
    function Ha(e) {
      function t(t, n) {
        if (e) {
          var r = t.deletions;
          r === null ? ((t.deletions = [n]), (t.flags |= 16)) : r.push(n);
        }
      }
      function n(n, r) {
        if (!e) return null;
        for (; r !== null;) (t(n, r), (r = r.sibling));
        return null;
      }
      function r(e) {
        for (var t = new Map(); e !== null;)
          (e.key === null ? t.set(e.index, e) : t.set(e.key, e), (e = e.sibling));
        return t;
      }
      function a(e, t) {
        return ((e = gi(e, t)), (e.index = 0), (e.sibling = null), e);
      }
      function o(t, n, r) {
        return (
          (t.index = r),
          e
            ? ((r = t.alternate),
              r === null
                ? ((t.flags |= 67108866), n)
                : ((r = r.index), r < n ? ((t.flags |= 67108866), n) : r))
            : ((t.flags |= 1048576), n)
        );
      }
      function s(t) {
        return (e && t.alternate === null && (t.flags |= 67108866), t);
      }
      function c(e, t, n, r) {
        return t === null || t.tag !== 6
          ? ((t = bi(n, e.mode, r)), (t.return = e), t)
          : ((t = a(t, n)), (t.return = e), t);
      }
      function l(e, t, n, r) {
        var i = n.type;
        return i === v
          ? d(e, t, n.props.children, r, n.key)
          : t !== null &&
              (t.elementType === i ||
                (typeof i == `object` && i && i.$$typeof === w && Na(i) === t.type))
            ? ((t = a(t, n.props)), Ba(t, n), (t.return = e), t)
            : ((t = vi(n.type, n.key, n.props, null, e.mode, r)), Ba(t, n), (t.return = e), t);
      }
      function u(e, t, n, r) {
        return t === null ||
          t.tag !== 4 ||
          t.stateNode.containerInfo !== n.containerInfo ||
          t.stateNode.implementation !== n.implementation
          ? ((t = Si(n, e.mode, r)), (t.return = e), t)
          : ((t = a(t, n.children || [])), (t.return = e), t);
      }
      function d(e, t, n, r, i) {
        return t === null || t.tag !== 7
          ? ((t = yi(n, e.mode, r, i)), (t.return = e), t)
          : ((t = a(t, n)), (t.return = e), t);
      }
      function f(e, t, n) {
        if ((typeof t == `string` && t !== ``) || typeof t == `number` || typeof t == `bigint`)
          return ((t = bi(`` + t, e.mode, n)), (t.return = e), t);
        if (typeof t == `object` && t) {
          switch (t.$$typeof) {
            case g:
              return (
                (n = vi(t.type, t.key, t.props, null, e.mode, n)),
                Ba(n, t),
                (n.return = e),
                n
              );
            case _:
              return ((t = Si(t, e.mode, n)), (t.return = e), t);
            case w:
              return ((t = Na(t)), f(e, t, n));
          }
          if (ue(t) || se(t)) return ((t = yi(t, e.mode, n, null)), (t.return = e), t);
          if (typeof t.then == `function`) return f(e, za(t), n);
          if (t.$$typeof === S) return f(e, sa(e, t), n);
          Va(e, t);
        }
        return null;
      }
      function p(e, t, n, r) {
        var i = t === null ? null : t.key;
        if ((typeof n == `string` && n !== ``) || typeof n == `number` || typeof n == `bigint`)
          return i === null ? c(e, t, `` + n, r) : null;
        if (typeof n == `object` && n) {
          switch (n.$$typeof) {
            case g:
              return n.key === i ? l(e, t, n, r) : null;
            case _:
              return n.key === i ? u(e, t, n, r) : null;
            case w:
              return ((n = Na(n)), p(e, t, n, r));
          }
          if (ue(n) || se(n)) return i === null ? d(e, t, n, r, null) : null;
          if (typeof n.then == `function`) return p(e, t, za(n), r);
          if (n.$$typeof === S) return p(e, t, sa(e, n), r);
          Va(e, n);
        }
        return null;
      }
      function m(e, t, n, r, i) {
        if ((typeof r == `string` && r !== ``) || typeof r == `number` || typeof r == `bigint`)
          return ((e = e.get(n) || null), c(t, e, `` + r, i));
        if (typeof r == `object` && r) {
          switch (r.$$typeof) {
            case g:
              return ((e = e.get(r.key === null ? n : r.key) || null), l(t, e, r, i));
            case _:
              return ((e = e.get(r.key === null ? n : r.key) || null), u(t, e, r, i));
            case w:
              return ((r = Na(r)), m(e, t, n, r, i));
          }
          if (ue(r) || se(r)) return ((e = e.get(n) || null), d(t, e, r, i, null));
          if (typeof r.then == `function`) return m(e, t, n, za(r), i);
          if (r.$$typeof === S) return m(e, t, n, sa(t, r), i);
          Va(t, r);
        }
        return null;
      }
      function h(i, a, s, c) {
        for (
          var l = null, u = null, d = a, h = (a = 0), g = null;
          d !== null && h < s.length;
          h++
        ) {
          d.index > h ? ((g = d), (d = null)) : (g = d.sibling);
          var _ = p(i, d, s[h], c);
          if (_ === null) {
            d === null && (d = g);
            break;
          }
          (e && d && _.alternate === null && t(i, d),
            (a = o(_, a, h)),
            u === null ? (l = _) : (u.sibling = _),
            (u = _),
            (d = g));
        }
        if (h === s.length) return (n(i, d), F && Pi(i, h), l);
        if (d === null) {
          for (; h < s.length; h++)
            ((d = f(i, s[h], c)),
              d !== null && ((a = o(d, a, h)), u === null ? (l = d) : (u.sibling = d), (u = d)));
          return (F && Pi(i, h), l);
        }
        for (d = r(d); h < s.length; h++)
          ((g = m(d, i, h, s[h], c)),
            g !== null &&
              (e && g.alternate !== null && d.delete(g.key === null ? h : g.key),
              (a = o(g, a, h)),
              u === null ? (l = g) : (u.sibling = g),
              (u = g)));
        return (
          e &&
            d.forEach(function (e) {
              return t(i, e);
            }),
          F && Pi(i, h),
          l
        );
      }
      function y(a, s, c, l) {
        if (c == null) throw Error(i(151));
        for (
          var u = null, d = null, h = s, g = (s = 0), _ = null, v = c.next();
          h !== null && !v.done;
          g++, v = c.next()
        ) {
          h.index > g ? ((_ = h), (h = null)) : (_ = h.sibling);
          var y = p(a, h, v.value, l);
          if (y === null) {
            h === null && (h = _);
            break;
          }
          (e && h && y.alternate === null && t(a, h),
            (s = o(y, s, g)),
            d === null ? (u = y) : (d.sibling = y),
            (d = y),
            (h = _));
        }
        if (v.done) return (n(a, h), F && Pi(a, g), u);
        if (h === null) {
          for (; !v.done; g++, v = c.next())
            ((v = f(a, v.value, l)),
              v !== null && ((s = o(v, s, g)), d === null ? (u = v) : (d.sibling = v), (d = v)));
          return (F && Pi(a, g), u);
        }
        for (h = r(h); !v.done; g++, v = c.next())
          ((v = m(h, a, g, v.value, l)),
            v !== null &&
              (e && v.alternate !== null && h.delete(v.key === null ? g : v.key),
              (s = o(v, s, g)),
              d === null ? (u = v) : (d.sibling = v),
              (d = v)));
        return (
          e &&
            h.forEach(function (e) {
              return t(a, e);
            }),
          F && Pi(a, g),
          u
        );
      }
      function b(e, r, o, c) {
        if (
          (typeof o == `object` && o && o.type === v && o.key === null && (o = o.props.children),
          typeof o == `object` && o)
        ) {
          switch (o.$$typeof) {
            case g:
              a: {
                for (var l = o.key; r !== null;) {
                  if (r.key === l) {
                    if (((l = o.type), l === v)) {
                      if (r.tag === 7) {
                        (n(e, r.sibling), (c = a(r, o.props.children)), (c.return = e), (e = c));
                        break a;
                      }
                    } else if (
                      r.elementType === l ||
                      (typeof l == `object` && l && l.$$typeof === w && Na(l) === r.type)
                    ) {
                      (n(e, r.sibling), (c = a(r, o.props)), Ba(c, o), (c.return = e), (e = c));
                      break a;
                    }
                    n(e, r);
                    break;
                  } else t(e, r);
                  r = r.sibling;
                }
                o.type === v
                  ? ((c = yi(o.props.children, e.mode, c, o.key)), (c.return = e), (e = c))
                  : ((c = vi(o.type, o.key, o.props, null, e.mode, c)),
                    Ba(c, o),
                    (c.return = e),
                    (e = c));
              }
              return s(e);
            case _:
              a: {
                for (l = o.key; r !== null;) {
                  if (r.key === l)
                    if (
                      r.tag === 4 &&
                      r.stateNode.containerInfo === o.containerInfo &&
                      r.stateNode.implementation === o.implementation
                    ) {
                      (n(e, r.sibling), (c = a(r, o.children || [])), (c.return = e), (e = c));
                      break a;
                    } else {
                      n(e, r);
                      break;
                    }
                  else t(e, r);
                  r = r.sibling;
                }
                ((c = Si(o, e.mode, c)), (c.return = e), (e = c));
              }
              return s(e);
            case w:
              return ((o = Na(o)), b(e, r, o, c));
          }
          if (ue(o)) return h(e, r, o, c);
          if (se(o)) {
            if (((l = se(o)), typeof l != `function`)) throw Error(i(150));
            return ((o = l.call(o)), y(e, r, o, c));
          }
          if (typeof o.then == `function`) return b(e, r, za(o), c);
          if (o.$$typeof === S) return b(e, r, sa(e, o), c);
          Va(e, o);
        }
        return (typeof o == `string` && o !== ``) || typeof o == `number` || typeof o == `bigint`
          ? ((o = `` + o),
            r !== null && r.tag === 6
              ? (n(e, r.sibling), (c = a(r, o)), (c.return = e), (e = c))
              : (n(e, r), (c = bi(o, e.mode, c)), (c.return = e), (e = c)),
            s(e))
          : n(e, r);
      }
      return function (e, t, n, r) {
        try {
          Ra = 0;
          var i = b(e, t, n, r);
          return ((La = null), i);
        } catch (t) {
          if (t === Da || t === ka) throw t;
          var a = mi(29, t, null, e.mode);
          return ((a.lanes = r), (a.return = e), a);
        }
      };
    }
    var Ua = Ha(!0),
      Wa = Ha(!1),
      I = !1;
    function Ga(e) {
      e.updateQueue = {
        baseState: e.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: { pending: null, lanes: 0, hiddenCallbacks: null },
        callbacks: null,
      };
    }
    function Ka(e, t) {
      ((e = e.updateQueue),
        t.updateQueue === e &&
          (t.updateQueue = {
            baseState: e.baseState,
            firstBaseUpdate: e.firstBaseUpdate,
            lastBaseUpdate: e.lastBaseUpdate,
            shared: e.shared,
            callbacks: null,
          }));
    }
    function qa(e) {
      return { lane: e, tag: 0, payload: null, callback: null, next: null };
    }
    function Ja(e, t, n) {
      var r = e.updateQueue;
      if (r === null) return null;
      if (((r = r.shared), K & 2)) {
        var i = r.pending;
        return (
          i === null ? (t.next = t) : ((t.next = i.next), (i.next = t)),
          (r.pending = t),
          (t = di(e)),
          ui(e, null, n),
          t
        );
      }
      return (si(e, r, t, n), di(e));
    }
    function Ya(e, t, n) {
      if (((t = t.updateQueue), t !== null && ((t = t.shared), n & 4194048))) {
        var r = t.lanes;
        ((r &= e.pendingLanes), (n |= r), (t.lanes = n), st(e, n));
      }
    }
    function Xa(e, t) {
      var n = e.updateQueue,
        r = e.alternate;
      if (r !== null && ((r = r.updateQueue), n === r)) {
        var i = null,
          a = null;
        if (((n = n.firstBaseUpdate), n !== null)) {
          do {
            var o = { lane: n.lane, tag: n.tag, payload: n.payload, callback: null, next: null };
            (a === null ? (i = a = o) : (a = a.next = o), (n = n.next));
          } while (n !== null);
          a === null ? (i = a = t) : (a = a.next = t);
        } else i = a = t;
        ((n = {
          baseState: r.baseState,
          firstBaseUpdate: i,
          lastBaseUpdate: a,
          shared: r.shared,
          callbacks: r.callbacks,
        }),
          (e.updateQueue = n));
        return;
      }
      ((e = n.lastBaseUpdate),
        e === null ? (n.firstBaseUpdate = t) : (e.next = t),
        (n.lastBaseUpdate = t));
    }
    var Za = !1;
    function Qa() {
      if (Za) {
        var e = va;
        if (e !== null) throw e;
      }
    }
    function $a(e, t, n, r) {
      Za = !1;
      var i = e.updateQueue;
      I = !1;
      var a = i.firstBaseUpdate,
        o = i.lastBaseUpdate,
        s = i.shared.pending;
      if (s !== null) {
        i.shared.pending = null;
        var c = s,
          l = c.next;
        ((c.next = null), o === null ? (a = l) : (o.next = l), (o = c));
        var u = e.alternate;
        u !== null &&
          ((u = u.updateQueue),
          (s = u.lastBaseUpdate),
          s !== o && (s === null ? (u.firstBaseUpdate = l) : (s.next = l), (u.lastBaseUpdate = c)));
      }
      if (a !== null) {
        var d = i.baseState;
        ((o = 0), (u = l = c = null), (s = a));
        do {
          var f = s.lane & -536870913,
            p = f !== s.lane;
          if (p ? (Y & f) === f : (r & f) === f) {
            (f !== 0 && f === _a && (Za = !0),
              u !== null &&
                (u = u.next =
                  { lane: 0, tag: s.tag, payload: s.payload, callback: null, next: null }));
            a: {
              var h = e,
                g = s;
              f = t;
              var _ = n;
              switch (g.tag) {
                case 1:
                  if (((h = g.payload), typeof h == `function`)) {
                    d = h.call(_, d, f);
                    break a;
                  }
                  d = h;
                  break a;
                case 3:
                  h.flags = (h.flags & -65537) | 128;
                case 0:
                  if (
                    ((h = g.payload), (f = typeof h == `function` ? h.call(_, d, f) : h), f == null)
                  )
                    break a;
                  d = m({}, d, f);
                  break a;
                case 2:
                  I = !0;
              }
            }
            ((f = s.callback),
              f !== null &&
                ((e.flags |= 64),
                p && (e.flags |= 8192),
                (p = i.callbacks),
                p === null ? (i.callbacks = [f]) : p.push(f)));
          } else
            ((p = { lane: f, tag: s.tag, payload: s.payload, callback: s.callback, next: null }),
              u === null ? ((l = u = p), (c = d)) : (u = u.next = p),
              (o |= f));
          if (((s = s.next), s === null)) {
            if (((s = i.shared.pending), s === null)) break;
            ((p = s),
              (s = p.next),
              (p.next = null),
              (i.lastBaseUpdate = p),
              (i.shared.pending = null));
          }
        } while (1);
        (u === null && (c = d),
          (i.baseState = c),
          (i.firstBaseUpdate = l),
          (i.lastBaseUpdate = u),
          a === null && (i.shared.lanes = 0),
          (Kl |= o),
          (e.lanes = o),
          (e.memoizedState = d));
      }
    }
    function eo(e, t) {
      if (typeof e != `function`) throw Error(i(191, e));
      e.call(t);
    }
    function to(e, t) {
      var n = e.callbacks;
      if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) eo(n[e], t);
    }
    var no = me(null),
      ro = me(0);
    function io(e, t) {
      ((e = Wl), k(ro, e), k(no, t), (Wl = e | t.baseLanes));
    }
    function ao() {
      (k(ro, Wl), k(no, no.current));
    }
    function oo() {
      ((Wl = ro.current), O(no), O(ro));
    }
    var so = me(null),
      co = null;
    function lo(e) {
      var t = e.alternate;
      (k(ho, ho.current & 1),
        k(so, e),
        co === null && (t === null || no.current !== null || t.memoizedState !== null) && (co = e));
    }
    function uo(e) {
      (k(ho, ho.current), k(so, e), co === null && (co = e));
    }
    function fo(e) {
      e.tag === 22 ? (k(ho, ho.current), k(so, e), co === null && (co = e)) : po(e);
    }
    function po() {
      (k(ho, ho.current), k(so, so.current));
    }
    function mo(e) {
      (O(so), co === e && (co = null), O(ho));
    }
    var ho = me(0);
    function go(e) {
      for (var t = e; t !== null;) {
        if (t.tag === 13) {
          var n = t.memoizedState;
          if (n !== null && ((n = n.dehydrated), n === null || of(n) || sf(n))) return t;
        } else if (
          t.tag === 19 &&
          (t.memoizedProps.revealOrder === `forwards` ||
            t.memoizedProps.revealOrder === `backwards` ||
            t.memoizedProps.revealOrder === `unstable_legacy-backwards` ||
            t.memoizedProps.revealOrder === `together`)
        ) {
          if (t.flags & 128) return t;
        } else if (t.child !== null) {
          ((t.child.return = t), (t = t.child));
          continue;
        }
        if (t === e) break;
        for (; t.sibling === null;) {
          if (t.return === null || t.return === e) return null;
          t = t.return;
        }
        ((t.sibling.return = t.return), (t = t.sibling));
      }
      return null;
    }
    var _o = 0,
      L = null,
      R = null,
      vo = null,
      yo = !1,
      bo = !1,
      xo = !1,
      So = 0,
      Co = 0,
      z = null,
      wo = 0;
    function To() {
      throw Error(i(321));
    }
    function Eo(e, t) {
      if (t === null) return !1;
      for (var n = 0; n < t.length && n < e.length; n++) if (!Or(e[n], t[n])) return !1;
      return !0;
    }
    function Do(e, t, n, r, i, a) {
      return (
        (_o = a),
        (L = t),
        (t.memoizedState = null),
        (t.updateQueue = null),
        (t.lanes = 0),
        (E.H = e === null || e.memoizedState === null ? Bs : Vs),
        (xo = !1),
        (a = n(r, i)),
        (xo = !1),
        bo && (a = ko(t, n, r, i)),
        Oo(e),
        a
      );
    }
    function Oo(e) {
      E.H = U;
      var t = R !== null && R.next !== null;
      if (((_o = 0), (vo = R = L = null), (yo = !1), (Co = 0), (z = null), t)) throw Error(i(300));
      e === null || ic || ((e = e.dependencies), e !== null && ia(e) && (ic = !0));
    }
    function ko(e, t, n, r) {
      L = e;
      var a = 0;
      do {
        if ((bo && (z = null), (Co = 0), (bo = !1), 25 <= a)) throw Error(i(301));
        if (((a += 1), (vo = R = null), e.updateQueue != null)) {
          var o = e.updateQueue;
          ((o.lastEffect = null),
            (o.events = null),
            (o.stores = null),
            o.memoCache != null && (o.memoCache.index = 0));
        }
        ((E.H = Hs), (o = t(n, r)));
      } while (bo);
      return o;
    }
    function Ao() {
      var e = E.H,
        t = e.useState()[0];
      return (
        (t = typeof t.then == `function` ? Io(t) : t),
        (e = e.useState()[0]),
        (R === null ? null : R.memoizedState) !== e && (L.flags |= 1024),
        t
      );
    }
    function jo() {
      var e = So !== 0;
      return ((So = 0), e);
    }
    function Mo(e, t, n) {
      ((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~n));
    }
    function No(e) {
      if (yo) {
        for (e = e.memoizedState; e !== null;) {
          var t = e.queue;
          (t !== null && (t.pending = null), (e = e.next));
        }
        yo = !1;
      }
      ((_o = 0), (vo = R = L = null), (bo = !1), (Co = So = 0), (z = null));
    }
    function Po() {
      var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
      return (vo === null ? (L.memoizedState = vo = e) : (vo = vo.next = e), vo);
    }
    function B() {
      if (R === null) {
        var e = L.alternate;
        e = e === null ? null : e.memoizedState;
      } else e = R.next;
      var t = vo === null ? L.memoizedState : vo.next;
      if (t !== null) ((vo = t), (R = e));
      else {
        if (e === null) throw L.alternate === null ? Error(i(467)) : Error(i(310));
        ((R = e),
          (e = {
            memoizedState: R.memoizedState,
            baseState: R.baseState,
            baseQueue: R.baseQueue,
            queue: R.queue,
            next: null,
          }),
          vo === null ? (L.memoizedState = vo = e) : (vo = vo.next = e));
      }
      return vo;
    }
    function Fo() {
      return { lastEffect: null, events: null, stores: null, memoCache: null };
    }
    function Io(e) {
      var t = Co;
      return (
        (Co += 1),
        z === null && (z = []),
        (e = Ma(z, e, t)),
        (t = L),
        (vo === null ? t.memoizedState : vo.next) === null &&
          ((t = t.alternate), (E.H = t === null || t.memoizedState === null ? Bs : Vs)),
        e
      );
    }
    function Lo(e) {
      if (typeof e == `object` && e) {
        if (typeof e.then == `function`) return Io(e);
        if (e.$$typeof === S) return oa(e);
      }
      throw Error(i(438, String(e)));
    }
    function Ro(e) {
      var t = null,
        n = L.updateQueue;
      if ((n !== null && (t = n.memoCache), t == null)) {
        var r = L.alternate;
        r !== null &&
          ((r = r.updateQueue),
          r !== null &&
            ((r = r.memoCache),
            r != null &&
              (t = {
                data: r.data.map(function (e) {
                  return e.slice();
                }),
                index: 0,
              })));
      }
      if (
        ((t ??= { data: [], index: 0 }),
        n === null && ((n = Fo()), (L.updateQueue = n)),
        (n.memoCache = t),
        (n = t.data[t.index]),
        n === void 0)
      )
        for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = ae;
      return (t.index++, n);
    }
    function zo(e, t) {
      return typeof t == `function` ? t(e) : t;
    }
    function Bo(e) {
      return Vo(B(), R, e);
    }
    function Vo(e, t, n) {
      var r = e.queue;
      if (r === null) throw Error(i(311));
      r.lastRenderedReducer = n;
      var a = e.baseQueue,
        o = r.pending;
      if (o !== null) {
        if (a !== null) {
          var s = a.next;
          ((a.next = o.next), (o.next = s));
        }
        ((t.baseQueue = a = o), (r.pending = null));
      }
      if (((o = e.baseState), a === null)) e.memoizedState = o;
      else {
        t = a.next;
        var c = (s = null),
          l = null,
          u = t,
          d = !1;
        do {
          var f = u.lane & -536870913;
          if (f === u.lane ? (_o & f) === f : (Y & f) === f) {
            var p = u.revertLane;
            if (p === 0)
              (l !== null &&
                (l = l.next =
                  {
                    lane: 0,
                    revertLane: 0,
                    gesture: null,
                    action: u.action,
                    hasEagerState: u.hasEagerState,
                    eagerState: u.eagerState,
                    next: null,
                  }),
                f === _a && (d = !0));
            else if ((_o & p) === p) {
              ((u = u.next), p === _a && (d = !0));
              continue;
            } else
              ((f = {
                lane: 0,
                revertLane: u.revertLane,
                gesture: null,
                action: u.action,
                hasEagerState: u.hasEagerState,
                eagerState: u.eagerState,
                next: null,
              }),
                l === null ? ((c = l = f), (s = o)) : (l = l.next = f),
                (L.lanes |= p),
                (Kl |= p));
            ((f = u.action), xo && n(o, f), (o = u.hasEagerState ? u.eagerState : n(o, f)));
          } else
            ((p = {
              lane: f,
              revertLane: u.revertLane,
              gesture: u.gesture,
              action: u.action,
              hasEagerState: u.hasEagerState,
              eagerState: u.eagerState,
              next: null,
            }),
              l === null ? ((c = l = p), (s = o)) : (l = l.next = p),
              (L.lanes |= f),
              (Kl |= f));
          u = u.next;
        } while (u !== null && u !== t);
        if (
          (l === null ? (s = o) : (l.next = c),
          !Or(o, e.memoizedState) && ((ic = !0), d && ((n = va), n !== null)))
        )
          throw n;
        ((e.memoizedState = o), (e.baseState = s), (e.baseQueue = l), (r.lastRenderedState = o));
      }
      return (a === null && (r.lanes = 0), [e.memoizedState, r.dispatch]);
    }
    function Ho(e) {
      var t = B(),
        n = t.queue;
      if (n === null) throw Error(i(311));
      n.lastRenderedReducer = e;
      var r = n.dispatch,
        a = n.pending,
        o = t.memoizedState;
      if (a !== null) {
        n.pending = null;
        var s = (a = a.next);
        do ((o = e(o, s.action)), (s = s.next));
        while (s !== a);
        (Or(o, t.memoizedState) || (ic = !0),
          (t.memoizedState = o),
          t.baseQueue === null && (t.baseState = o),
          (n.lastRenderedState = o));
      }
      return [o, r];
    }
    function Uo(e, t, n) {
      var r = L,
        a = B(),
        o = F;
      if (o) {
        if (n === void 0) throw Error(i(407));
        n = n();
      } else n = t();
      var s = !Or((R || a).memoizedState, n);
      if (
        (s && ((a.memoizedState = n), (ic = !0)),
        (a = a.queue),
        ms(Ko.bind(null, r, a, e), [e]),
        a.getSnapshot !== t || s || (vo !== null && vo.memoizedState.tag & 1))
      ) {
        if (
          ((r.flags |= 2048),
          ls(9, { destroy: void 0 }, Go.bind(null, r, a, n, t), null),
          q === null)
        )
          throw Error(i(349));
        o || _o & 127 || Wo(r, t, n);
      }
      return n;
    }
    function Wo(e, t, n) {
      ((e.flags |= 16384),
        (e = { getSnapshot: t, value: n }),
        (t = L.updateQueue),
        t === null
          ? ((t = Fo()), (L.updateQueue = t), (t.stores = [e]))
          : ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e)));
    }
    function Go(e, t, n, r) {
      ((t.value = n), (t.getSnapshot = r), qo(t) && Jo(e));
    }
    function Ko(e, t, n) {
      return n(function () {
        qo(t) && Jo(e);
      });
    }
    function qo(e) {
      var t = e.getSnapshot;
      e = e.value;
      try {
        var n = t();
        return !Or(e, n);
      } catch {
        return !0;
      }
    }
    function Jo(e) {
      var t = li(e, 2);
      t !== null && gu(t, e, 2);
    }
    function Yo(e) {
      var t = Po();
      if (typeof e == `function`) {
        var n = e;
        if (((e = n()), xo)) {
          We(!0);
          try {
            n();
          } finally {
            We(!1);
          }
        }
      }
      return (
        (t.memoizedState = t.baseState = e),
        (t.queue = {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: zo,
          lastRenderedState: e,
        }),
        t
      );
    }
    function Xo(e, t, n, r) {
      return ((e.baseState = n), Vo(e, R, typeof r == `function` ? r : zo));
    }
    function Zo(e, t, n, r, a) {
      if (Ls(e)) throw Error(i(485));
      if (((e = t.action), e !== null)) {
        var o = {
          payload: a,
          action: e,
          next: null,
          isTransition: !0,
          status: `pending`,
          value: null,
          reason: null,
          listeners: [],
          then: function (e) {
            o.listeners.push(e);
          },
        };
        (E.T === null ? (o.isTransition = !1) : n(!0),
          r(o),
          (n = t.pending),
          n === null
            ? ((o.next = t.pending = o), Qo(t, o))
            : ((o.next = n.next), (t.pending = n.next = o)));
      }
    }
    function Qo(e, t) {
      var n = t.action,
        r = t.payload,
        i = e.state;
      if (t.isTransition) {
        var a = E.T,
          o = {};
        E.T = o;
        try {
          var s = n(i, r),
            c = E.S;
          (c !== null && c(o, s), $o(e, t, s));
        } catch (n) {
          ts(e, t, n);
        } finally {
          (a !== null && o.types !== null && (a.types = o.types), (E.T = a));
        }
      } else
        try {
          ((a = n(i, r)), $o(e, t, a));
        } catch (n) {
          ts(e, t, n);
        }
    }
    function $o(e, t, n) {
      typeof n == `object` && n && typeof n.then == `function`
        ? n.then(
            function (n) {
              es(e, t, n);
            },
            function (n) {
              return ts(e, t, n);
            },
          )
        : es(e, t, n);
    }
    function es(e, t, n) {
      ((t.status = `fulfilled`),
        (t.value = n),
        ns(t),
        (e.state = n),
        (t = e.pending),
        t !== null &&
          ((n = t.next), n === t ? (e.pending = null) : ((n = n.next), (t.next = n), Qo(e, n))));
    }
    function ts(e, t, n) {
      var r = e.pending;
      if (((e.pending = null), r !== null)) {
        r = r.next;
        do ((t.status = `rejected`), (t.reason = n), ns(t), (t = t.next));
        while (t !== r);
      }
      e.action = null;
    }
    function ns(e) {
      e = e.listeners;
      for (var t = 0; t < e.length; t++) (0, e[t])();
    }
    function rs(e, t) {
      return t;
    }
    function is(e, t) {
      if (F) {
        var n = q.formState;
        if (n !== null) {
          a: {
            var r = L;
            if (F) {
              if (P) {
                b: {
                  for (var i = P, a = Vi; i.nodeType !== 8;) {
                    if (!a) {
                      i = null;
                      break b;
                    }
                    if (((i = lf(i.nextSibling)), i === null)) {
                      i = null;
                      break b;
                    }
                  }
                  ((a = i.data), (i = a === `F!` || a === `F` ? i : null));
                }
                if (i) {
                  ((P = lf(i.nextSibling)), (r = i.data === `F!`));
                  break a;
                }
              }
              Ui(r);
            }
            r = !1;
          }
          r && (t = n[0]);
        }
      }
      return (
        (n = Po()),
        (n.memoizedState = n.baseState = t),
        (r = {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: rs,
          lastRenderedState: t,
        }),
        (n.queue = r),
        (n = Ps.bind(null, L, r)),
        (r.dispatch = n),
        (r = Yo(!1)),
        (a = Is.bind(null, L, !1, r.queue)),
        (r = Po()),
        (i = { state: t, dispatch: null, action: e, pending: null }),
        (r.queue = i),
        (n = Zo.bind(null, L, i, a, n)),
        (i.dispatch = n),
        (r.memoizedState = e),
        [t, n, !1]
      );
    }
    function as(e) {
      return os(B(), R, e);
    }
    function os(e, t, n) {
      if (
        ((t = Vo(e, t, rs)[0]),
        (e = Bo(zo)[0]),
        typeof t == `object` && t && typeof t.then == `function`)
      )
        try {
          var r = Io(t);
        } catch (e) {
          throw e === Da ? ka : e;
        }
      else r = t;
      t = B();
      var i = t.queue,
        a = i.dispatch;
      return (
        n !== t.memoizedState &&
          ((L.flags |= 2048), ls(9, { destroy: void 0 }, ss.bind(null, i, n), null)),
        [r, a, e]
      );
    }
    function ss(e, t) {
      e.action = t;
    }
    function cs(e) {
      var t = B(),
        n = R;
      if (n !== null) return os(t, n, e);
      (B(), (t = t.memoizedState), (n = B()));
      var r = n.queue.dispatch;
      return ((n.memoizedState = e), [t, r, !1]);
    }
    function ls(e, t, n, r) {
      return (
        (e = { tag: e, create: n, deps: r, inst: t, next: null }),
        (t = L.updateQueue),
        t === null && ((t = Fo()), (L.updateQueue = t)),
        (n = t.lastEffect),
        n === null
          ? (t.lastEffect = e.next = e)
          : ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e)),
        e
      );
    }
    function us() {
      return B().memoizedState;
    }
    function ds(e, t, n, r) {
      var i = Po();
      ((L.flags |= e),
        (i.memoizedState = ls(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r)));
    }
    function fs(e, t, n, r) {
      var i = B();
      r = r === void 0 ? null : r;
      var a = i.memoizedState.inst;
      R !== null && r !== null && Eo(r, R.memoizedState.deps)
        ? (i.memoizedState = ls(t, a, n, r))
        : ((L.flags |= e), (i.memoizedState = ls(1 | t, a, n, r)));
    }
    function ps(e, t) {
      ds(8390656, 8, e, t);
    }
    function ms(e, t) {
      fs(2048, 8, e, t);
    }
    function hs(e) {
      L.flags |= 4;
      var t = L.updateQueue;
      if (t === null) ((t = Fo()), (L.updateQueue = t), (t.events = [e]));
      else {
        var n = t.events;
        n === null ? (t.events = [e]) : n.push(e);
      }
    }
    function gs(e) {
      var t = B().memoizedState;
      return (
        hs({ ref: t, nextImpl: e }),
        function () {
          if (K & 2) throw Error(i(440));
          return t.impl.apply(void 0, arguments);
        }
      );
    }
    function _s(e, t) {
      return fs(4, 2, e, t);
    }
    function vs(e, t) {
      return fs(4, 4, e, t);
    }
    function ys(e, t) {
      if (typeof t == `function`) {
        e = e();
        var n = t(e);
        return function () {
          typeof n == `function` ? n() : t(null);
        };
      }
      if (t != null)
        return (
          (e = e()),
          (t.current = e),
          function () {
            t.current = null;
          }
        );
    }
    function bs(e, t, n) {
      ((n = n == null ? null : n.concat([e])), fs(4, 4, ys.bind(null, t, e), n));
    }
    function xs() {}
    function V(e, t) {
      var n = B();
      t = t === void 0 ? null : t;
      var r = n.memoizedState;
      return t !== null && Eo(t, r[1]) ? r[0] : ((n.memoizedState = [e, t]), e);
    }
    function Ss(e, t) {
      var n = B();
      t = t === void 0 ? null : t;
      var r = n.memoizedState;
      if (t !== null && Eo(t, r[1])) return r[0];
      if (((r = e()), xo)) {
        We(!0);
        try {
          e();
        } finally {
          We(!1);
        }
      }
      return ((n.memoizedState = [r, t]), r);
    }
    function Cs(e, t, n) {
      return n === void 0 || (_o & 1073741824 && !(Y & 261930))
        ? (e.memoizedState = t)
        : ((e.memoizedState = n), (e = hu()), (L.lanes |= e), (Kl |= e), n);
    }
    function ws(e, t, n, r) {
      return Or(n, t)
        ? n
        : no.current === null
          ? !(_o & 42) || (_o & 1073741824 && !(Y & 261930))
            ? ((ic = !0), (e.memoizedState = n))
            : ((e = hu()), (L.lanes |= e), (Kl |= e), t)
          : ((e = Cs(e, n, r)), Or(e, t) || (ic = !0), e);
    }
    function Ts(e, t, n, r, i) {
      var a = D.p;
      D.p = a !== 0 && 8 > a ? a : 8;
      var o = E.T,
        s = {};
      ((E.T = s), Is(e, !1, t, n));
      try {
        var c = i(),
          l = E.S;
        (l !== null && l(s, c),
          typeof c == `object` && c && typeof c.then == `function`
            ? Fs(e, t, xa(c, r), mu(e))
            : Fs(e, t, r, mu(e)));
      } catch (n) {
        Fs(e, t, { then: function () {}, status: `rejected`, reason: n }, mu());
      } finally {
        ((D.p = a), o !== null && s.types !== null && (o.types = s.types), (E.T = o));
      }
    }
    function Es() {}
    function H(e, t, n, r) {
      if (e.tag !== 5) throw Error(i(476));
      var a = Ds(e).queue;
      Ts(
        e,
        a,
        t,
        de,
        n === null
          ? Es
          : function () {
              return (Os(e), n(r));
            },
      );
    }
    function Ds(e) {
      var t = e.memoizedState;
      if (t !== null) return t;
      t = {
        memoizedState: de,
        baseState: de,
        baseQueue: null,
        queue: {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: zo,
          lastRenderedState: de,
        },
        next: null,
      };
      var n = {};
      return (
        (t.next = {
          memoizedState: n,
          baseState: n,
          baseQueue: null,
          queue: {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: zo,
            lastRenderedState: n,
          },
          next: null,
        }),
        (e.memoizedState = t),
        (e = e.alternate),
        e !== null && (e.memoizedState = t),
        t
      );
    }
    function Os(e) {
      var t = Ds(e);
      (t.next === null && (t = e.alternate.memoizedState), Fs(e, t.next.queue, {}, mu()));
    }
    function ks() {
      return oa($f);
    }
    function As() {
      return B().memoizedState;
    }
    function js() {
      return B().memoizedState;
    }
    function Ms(e) {
      for (var t = e.return; t !== null;) {
        switch (t.tag) {
          case 24:
          case 3:
            var n = mu();
            e = qa(n);
            var r = Ja(t, e, n);
            (r !== null && (gu(r, t, n), Ya(r, t, n)), (t = { cache: pa() }), (e.payload = t));
            return;
        }
        t = t.return;
      }
    }
    function Ns(e, t, n) {
      var r = mu();
      ((n = {
        lane: r,
        revertLane: 0,
        gesture: null,
        action: n,
        hasEagerState: !1,
        eagerState: null,
        next: null,
      }),
        Ls(e) ? Rs(t, n) : ((n = ci(e, t, n, r)), n !== null && (gu(n, e, r), zs(n, t, r))));
    }
    function Ps(e, t, n) {
      Fs(e, t, n, mu());
    }
    function Fs(e, t, n, r) {
      var i = {
        lane: r,
        revertLane: 0,
        gesture: null,
        action: n,
        hasEagerState: !1,
        eagerState: null,
        next: null,
      };
      if (Ls(e)) Rs(t, i);
      else {
        var a = e.alternate;
        if (
          e.lanes === 0 &&
          (a === null || a.lanes === 0) &&
          ((a = t.lastRenderedReducer), a !== null)
        )
          try {
            var o = t.lastRenderedState,
              s = a(o, n);
            if (((i.hasEagerState = !0), (i.eagerState = s), Or(s, o)))
              return (si(e, t, i, 0), q === null && oi(), !1);
          } catch {}
        if (((n = ci(e, t, i, r)), n !== null)) return (gu(n, e, r), zs(n, t, r), !0);
      }
      return !1;
    }
    function Is(e, t, n, r) {
      if (
        ((r = {
          lane: 2,
          revertLane: fd(),
          gesture: null,
          action: r,
          hasEagerState: !1,
          eagerState: null,
          next: null,
        }),
        Ls(e))
      ) {
        if (t) throw Error(i(479));
      } else ((t = ci(e, n, r, 2)), t !== null && gu(t, e, 2));
    }
    function Ls(e) {
      var t = e.alternate;
      return e === L || (t !== null && t === L);
    }
    function Rs(e, t) {
      bo = yo = !0;
      var n = e.pending;
      (n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)), (e.pending = t));
    }
    function zs(e, t, n) {
      if (n & 4194048) {
        var r = t.lanes;
        ((r &= e.pendingLanes), (n |= r), (t.lanes = n), st(e, n));
      }
    }
    var U = {
      readContext: oa,
      use: Lo,
      useCallback: To,
      useContext: To,
      useEffect: To,
      useImperativeHandle: To,
      useLayoutEffect: To,
      useInsertionEffect: To,
      useMemo: To,
      useReducer: To,
      useRef: To,
      useState: To,
      useDebugValue: To,
      useDeferredValue: To,
      useTransition: To,
      useSyncExternalStore: To,
      useId: To,
      useHostTransitionStatus: To,
      useFormState: To,
      useActionState: To,
      useOptimistic: To,
      useMemoCache: To,
      useCacheRefresh: To,
    };
    U.useEffectEvent = To;
    var Bs = {
        readContext: oa,
        use: Lo,
        useCallback: function (e, t) {
          return ((Po().memoizedState = [e, t === void 0 ? null : t]), e);
        },
        useContext: oa,
        useEffect: ps,
        useImperativeHandle: function (e, t, n) {
          ((n = n == null ? null : n.concat([e])), ds(4194308, 4, ys.bind(null, t, e), n));
        },
        useLayoutEffect: function (e, t) {
          return ds(4194308, 4, e, t);
        },
        useInsertionEffect: function (e, t) {
          ds(4, 2, e, t);
        },
        useMemo: function (e, t) {
          var n = Po();
          t = t === void 0 ? null : t;
          var r = e();
          if (xo) {
            We(!0);
            try {
              e();
            } finally {
              We(!1);
            }
          }
          return ((n.memoizedState = [r, t]), r);
        },
        useReducer: function (e, t, n) {
          var r = Po();
          if (n !== void 0) {
            var i = n(t);
            if (xo) {
              We(!0);
              try {
                n(t);
              } finally {
                We(!1);
              }
            }
          } else i = t;
          return (
            (r.memoizedState = r.baseState = i),
            (e = {
              pending: null,
              lanes: 0,
              dispatch: null,
              lastRenderedReducer: e,
              lastRenderedState: i,
            }),
            (r.queue = e),
            (e = e.dispatch = Ns.bind(null, L, e)),
            [r.memoizedState, e]
          );
        },
        useRef: function (e) {
          var t = Po();
          return ((e = { current: e }), (t.memoizedState = e));
        },
        useState: function (e) {
          e = Yo(e);
          var t = e.queue,
            n = Ps.bind(null, L, t);
          return ((t.dispatch = n), [e.memoizedState, n]);
        },
        useDebugValue: xs,
        useDeferredValue: function (e, t) {
          return Cs(Po(), e, t);
        },
        useTransition: function () {
          var e = Yo(!1);
          return ((e = Ts.bind(null, L, e.queue, !0, !1)), (Po().memoizedState = e), [!1, e]);
        },
        useSyncExternalStore: function (e, t, n) {
          var r = L,
            a = Po();
          if (F) {
            if (n === void 0) throw Error(i(407));
            n = n();
          } else {
            if (((n = t()), q === null)) throw Error(i(349));
            Y & 127 || Wo(r, t, n);
          }
          a.memoizedState = n;
          var o = { value: n, getSnapshot: t };
          return (
            (a.queue = o),
            ps(Ko.bind(null, r, o, e), [e]),
            (r.flags |= 2048),
            ls(9, { destroy: void 0 }, Go.bind(null, r, o, n, t), null),
            n
          );
        },
        useId: function () {
          var e = Po(),
            t = q.identifierPrefix;
          if (F) {
            var n = Ni,
              r = Mi;
            ((n = (r & ~(1 << (32 - Ge(r) - 1))).toString(32) + n),
              (t = `_` + t + `R_` + n),
              (n = So++),
              0 < n && (t += `H` + n.toString(32)),
              (t += `_`));
          } else ((n = wo++), (t = `_` + t + `r_` + n.toString(32) + `_`));
          return (e.memoizedState = t);
        },
        useHostTransitionStatus: ks,
        useFormState: is,
        useActionState: is,
        useOptimistic: function (e) {
          var t = Po();
          t.memoizedState = t.baseState = e;
          var n = {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: null,
            lastRenderedState: null,
          };
          return ((t.queue = n), (t = Is.bind(null, L, !0, n)), (n.dispatch = t), [e, t]);
        },
        useMemoCache: Ro,
        useCacheRefresh: function () {
          return (Po().memoizedState = Ms.bind(null, L));
        },
        useEffectEvent: function (e) {
          var t = Po(),
            n = { impl: e };
          return (
            (t.memoizedState = n),
            function () {
              if (K & 2) throw Error(i(440));
              return n.impl.apply(void 0, arguments);
            }
          );
        },
      },
      Vs = {
        readContext: oa,
        use: Lo,
        useCallback: V,
        useContext: oa,
        useEffect: ms,
        useImperativeHandle: bs,
        useInsertionEffect: _s,
        useLayoutEffect: vs,
        useMemo: Ss,
        useReducer: Bo,
        useRef: us,
        useState: function () {
          return Bo(zo);
        },
        useDebugValue: xs,
        useDeferredValue: function (e, t) {
          return ws(B(), R.memoizedState, e, t);
        },
        useTransition: function () {
          var e = Bo(zo)[0],
            t = B().memoizedState;
          return [typeof e == `boolean` ? e : Io(e), t];
        },
        useSyncExternalStore: Uo,
        useId: As,
        useHostTransitionStatus: ks,
        useFormState: as,
        useActionState: as,
        useOptimistic: function (e, t) {
          return Xo(B(), R, e, t);
        },
        useMemoCache: Ro,
        useCacheRefresh: js,
      };
    Vs.useEffectEvent = gs;
    var Hs = {
      readContext: oa,
      use: Lo,
      useCallback: V,
      useContext: oa,
      useEffect: ms,
      useImperativeHandle: bs,
      useInsertionEffect: _s,
      useLayoutEffect: vs,
      useMemo: Ss,
      useReducer: Ho,
      useRef: us,
      useState: function () {
        return Ho(zo);
      },
      useDebugValue: xs,
      useDeferredValue: function (e, t) {
        var n = B();
        return R === null ? Cs(n, e, t) : ws(n, R.memoizedState, e, t);
      },
      useTransition: function () {
        var e = Ho(zo)[0],
          t = B().memoizedState;
        return [typeof e == `boolean` ? e : Io(e), t];
      },
      useSyncExternalStore: Uo,
      useId: As,
      useHostTransitionStatus: ks,
      useFormState: cs,
      useActionState: cs,
      useOptimistic: function (e, t) {
        var n = B();
        return R === null ? ((n.baseState = e), [e, n.queue.dispatch]) : Xo(n, R, e, t);
      },
      useMemoCache: Ro,
      useCacheRefresh: js,
    };
    Hs.useEffectEvent = gs;
    function Us(e, t, n, r) {
      ((t = e.memoizedState),
        (n = n(r, t)),
        (n = n == null ? t : m({}, t, n)),
        (e.memoizedState = n),
        e.lanes === 0 && (e.updateQueue.baseState = n));
    }
    var Ws = {
      enqueueSetState: function (e, t, n) {
        e = e._reactInternals;
        var r = mu(),
          i = qa(r);
        ((i.payload = t),
          n != null && (i.callback = n),
          (t = Ja(e, i, r)),
          t !== null && (gu(t, e, r), Ya(t, e, r)));
      },
      enqueueReplaceState: function (e, t, n) {
        e = e._reactInternals;
        var r = mu(),
          i = qa(r);
        ((i.tag = 1),
          (i.payload = t),
          n != null && (i.callback = n),
          (t = Ja(e, i, r)),
          t !== null && (gu(t, e, r), Ya(t, e, r)));
      },
      enqueueForceUpdate: function (e, t) {
        e = e._reactInternals;
        var n = mu(),
          r = qa(n);
        ((r.tag = 2),
          t != null && (r.callback = t),
          (t = Ja(e, r, n)),
          t !== null && (gu(t, e, n), Ya(t, e, n)));
      },
    };
    function Gs(e, t, n, r, i, a, o) {
      return (
        (e = e.stateNode),
        typeof e.shouldComponentUpdate == `function`
          ? e.shouldComponentUpdate(r, a, o)
          : t.prototype && t.prototype.isPureReactComponent
            ? !kr(n, r) || !kr(i, a)
            : !0
      );
    }
    function Ks(e, t, n, r) {
      ((e = t.state),
        typeof t.componentWillReceiveProps == `function` && t.componentWillReceiveProps(n, r),
        typeof t.UNSAFE_componentWillReceiveProps == `function` &&
          t.UNSAFE_componentWillReceiveProps(n, r),
        t.state !== e && Ws.enqueueReplaceState(t, t.state, null));
    }
    function qs(e, t) {
      var n = t;
      if (`ref` in t) for (var r in ((n = {}), t)) r !== `ref` && (n[r] = t[r]);
      if ((e = e.defaultProps))
        for (var i in (n === t && (n = m({}, n)), e)) n[i] === void 0 && (n[i] = e[i]);
      return n;
    }
    function Js(e) {
      ni(e);
    }
    function Ys(e) {
      console.error(e);
    }
    function Xs(e) {
      ni(e);
    }
    function Zs(e, t) {
      try {
        var n = e.onUncaughtError;
        n(t.value, { componentStack: t.stack });
      } catch (e) {
        setTimeout(function () {
          throw e;
        });
      }
    }
    function Qs(e, t, n) {
      try {
        var r = e.onCaughtError;
        r(n.value, { componentStack: n.stack, errorBoundary: t.tag === 1 ? t.stateNode : null });
      } catch (e) {
        setTimeout(function () {
          throw e;
        });
      }
    }
    function $s(e, t, n) {
      return (
        (n = qa(n)),
        (n.tag = 3),
        (n.payload = { element: null }),
        (n.callback = function () {
          Zs(e, t);
        }),
        n
      );
    }
    function ec(e) {
      return ((e = qa(e)), (e.tag = 3), e);
    }
    function tc(e, t, n, r) {
      var i = n.type.getDerivedStateFromError;
      if (typeof i == `function`) {
        var a = r.value;
        ((e.payload = function () {
          return i(a);
        }),
          (e.callback = function () {
            Qs(t, n, r);
          }));
      }
      var o = n.stateNode;
      o !== null &&
        typeof o.componentDidCatch == `function` &&
        (e.callback = function () {
          (Qs(t, n, r),
            typeof i != `function` && (iu === null ? (iu = new Set([this])) : iu.add(this)));
          var e = r.stack;
          this.componentDidCatch(r.value, { componentStack: e === null ? `` : e });
        });
    }
    function nc(e, t, n, r, a) {
      if (((n.flags |= 32768), typeof r == `object` && r && typeof r.then == `function`)) {
        if (((t = n.alternate), t !== null && ra(t, n, a, !0), (n = so.current), n !== null)) {
          switch (n.tag) {
            case 31:
            case 13:
              return (
                co === null ? Ou() : n.alternate === null && Gl === 0 && (Gl = 3),
                (n.flags &= -257),
                (n.flags |= 65536),
                (n.lanes = a),
                r === Aa
                  ? (n.flags |= 16384)
                  : ((t = n.updateQueue),
                    t === null ? (n.updateQueue = new Set([r])) : t.add(r),
                    Ku(e, r, a)),
                !1
              );
            case 22:
              return (
                (n.flags |= 65536),
                r === Aa
                  ? (n.flags |= 16384)
                  : ((t = n.updateQueue),
                    t === null
                      ? ((t = {
                          transitions: null,
                          markerInstances: null,
                          retryQueue: new Set([r]),
                        }),
                        (n.updateQueue = t))
                      : ((n = t.retryQueue), n === null ? (t.retryQueue = new Set([r])) : n.add(r)),
                    Ku(e, r, a)),
                !1
              );
          }
          throw Error(i(435, n.tag));
        }
        return (Ku(e, r, a), Ou(), !1);
      }
      if (F)
        return (
          (t = so.current),
          t === null
            ? (r !== Hi && ((t = Error(i(423), { cause: r })), Yi(wi(t, n))),
              (e = e.current.alternate),
              (e.flags |= 65536),
              (a &= -a),
              (e.lanes |= a),
              (r = wi(r, n)),
              (a = $s(e.stateNode, r, a)),
              Xa(e, a),
              Gl !== 4 && (Gl = 2))
            : (!(t.flags & 65536) && (t.flags |= 256),
              (t.flags |= 65536),
              (t.lanes = a),
              r !== Hi && ((e = Error(i(422), { cause: r })), Yi(wi(e, n)))),
          !1
        );
      var o = Error(i(520), { cause: r });
      if (((o = wi(o, n)), Zl === null ? (Zl = [o]) : Zl.push(o), Gl !== 4 && (Gl = 2), t === null))
        return !0;
      ((r = wi(r, n)), (n = t));
      do {
        switch (n.tag) {
          case 3:
            return (
              (n.flags |= 65536),
              (e = a & -a),
              (n.lanes |= e),
              (e = $s(n.stateNode, r, e)),
              Xa(n, e),
              !1
            );
          case 1:
            if (
              ((t = n.type),
              (o = n.stateNode),
              !(n.flags & 128) &&
                (typeof t.getDerivedStateFromError == `function` ||
                  (o !== null &&
                    typeof o.componentDidCatch == `function` &&
                    (iu === null || !iu.has(o)))))
            )
              return (
                (n.flags |= 65536),
                (a &= -a),
                (n.lanes |= a),
                (a = ec(a)),
                tc(a, e, n, r),
                Xa(n, a),
                !1
              );
        }
        n = n.return;
      } while (n !== null);
      return !1;
    }
    var rc = Error(i(461)),
      ic = !1;
    function ac(e, t, n, r) {
      t.child = e === null ? Wa(t, null, n, r) : Ua(t, e.child, n, r);
    }
    function oc(e, t, n, r, i) {
      n = n.render;
      var a = t.ref;
      if (`ref` in r) {
        var o = {};
        for (var s in r) s !== `ref` && (o[s] = r[s]);
      } else o = r;
      return (
        aa(t),
        (r = Do(e, t, n, o, a, i)),
        (s = jo()),
        e !== null && !ic
          ? (Mo(e, t, i), Ac(e, t, i))
          : (F && s && Ii(t), (t.flags |= 1), ac(e, t, r, i), t.child)
      );
    }
    function sc(e, t, n, r, i) {
      if (e === null) {
        var a = n.type;
        return typeof a == `function` && !hi(a) && a.defaultProps === void 0 && n.compare === null
          ? ((t.tag = 15), (t.type = a), cc(e, t, a, r, i))
          : ((e = vi(n.type, null, r, t, t.mode, i)),
            (e.ref = t.ref),
            (e.return = t),
            (t.child = e));
      }
      if (((a = e.child), !jc(e, i))) {
        var o = a.memoizedProps;
        if (((n = n.compare), (n = n === null ? kr : n), n(o, r) && e.ref === t.ref))
          return Ac(e, t, i);
      }
      return ((t.flags |= 1), (e = gi(a, r)), (e.ref = t.ref), (e.return = t), (t.child = e));
    }
    function cc(e, t, n, r, i) {
      if (e !== null) {
        var a = e.memoizedProps;
        if (kr(a, r) && e.ref === t.ref)
          if (((ic = !1), (t.pendingProps = r = a), jc(e, i))) e.flags & 131072 && (ic = !0);
          else return ((t.lanes = e.lanes), Ac(e, t, i));
      }
      return gc(e, t, n, r, i);
    }
    function lc(e, t, n, r) {
      var i = r.children,
        a = e === null ? null : e.memoizedState;
      if (
        (e === null &&
          t.stateNode === null &&
          (t.stateNode = {
            _visibility: 1,
            _pendingMarkers: null,
            _retryCache: null,
            _transitions: null,
          }),
        r.mode === `hidden`)
      ) {
        if (t.flags & 128) {
          if (((a = a === null ? n : a.baseLanes | n), e !== null)) {
            for (r = t.child = e.child, i = 0; r !== null;)
              ((i = i | r.lanes | r.childLanes), (r = r.sibling));
            r = i & ~a;
          } else ((r = 0), (t.child = null));
          return dc(e, t, a, n, r);
        }
        if (n & 536870912)
          ((t.memoizedState = { baseLanes: 0, cachePool: null }),
            e !== null && Ta(t, a === null ? null : a.cachePool),
            a === null ? ao() : io(t, a),
            fo(t));
        else return ((r = t.lanes = 536870912), dc(e, t, a === null ? n : a.baseLanes | n, n, r));
      } else
        a === null
          ? (e !== null && Ta(t, null), ao(), po(t))
          : (Ta(t, a.cachePool), io(t, a), po(t), (t.memoizedState = null));
      return (ac(e, t, i, n), t.child);
    }
    function uc(e, t) {
      return (
        (e !== null && e.tag === 22) ||
          t.stateNode !== null ||
          (t.stateNode = {
            _visibility: 1,
            _pendingMarkers: null,
            _retryCache: null,
            _transitions: null,
          }),
        t.sibling
      );
    }
    function dc(e, t, n, r, i) {
      var a = wa();
      return (
        (a = a === null ? null : { parent: fa._currentValue, pool: a }),
        (t.memoizedState = { baseLanes: n, cachePool: a }),
        e !== null && Ta(t, null),
        ao(),
        fo(t),
        e !== null && ra(e, t, r, !0),
        (t.childLanes = i),
        null
      );
    }
    function fc(e, t) {
      return (
        (t = Tc({ mode: t.mode, children: t.children }, e.mode)),
        (t.ref = e.ref),
        (e.child = t),
        (t.return = e),
        t
      );
    }
    function pc(e, t, n) {
      return (
        Ua(t, e.child, null, n),
        (e = fc(t, t.pendingProps)),
        (e.flags |= 2),
        mo(t),
        (t.memoizedState = null),
        e
      );
    }
    function mc(e, t, n) {
      var r = t.pendingProps,
        a = (t.flags & 128) != 0;
      if (((t.flags &= -129), e === null)) {
        if (F) {
          if (r.mode === `hidden`) return ((e = fc(t, r)), (t.lanes = 536870912), uc(null, e));
          if (
            (uo(t),
            (e = P)
              ? ((e = af(e, Vi)),
                (e = e !== null && e.data === `&` ? e : null),
                e !== null &&
                  ((t.memoizedState = {
                    dehydrated: e,
                    treeContext: ji === null ? null : { id: Mi, overflow: Ni },
                    retryLane: 536870912,
                    hydrationErrors: null,
                  }),
                  (n = xi(e)),
                  (n.return = t),
                  (t.child = n),
                  (zi = t),
                  (P = null)))
              : (e = null),
            e === null)
          )
            throw Ui(t);
          return ((t.lanes = 536870912), null);
        }
        return fc(t, r);
      }
      var o = e.memoizedState;
      if (o !== null) {
        var s = o.dehydrated;
        if ((uo(t), a))
          if (t.flags & 256) ((t.flags &= -257), (t = pc(e, t, n)));
          else if (t.memoizedState !== null) ((t.child = e.child), (t.flags |= 128), (t = null));
          else throw Error(i(558));
        else if ((ic || ra(e, t, n, !1), (a = (n & e.childLanes) !== 0), ic || a)) {
          if (((r = q), r !== null && ((s = ct(r, n)), s !== 0 && s !== o.retryLane)))
            throw ((o.retryLane = s), li(e, s), gu(r, e, s), rc);
          (Ou(), (t = pc(e, t, n)));
        } else
          ((e = o.treeContext),
            (P = lf(s.nextSibling)),
            (zi = t),
            (F = !0),
            (Bi = null),
            (Vi = !1),
            e !== null && Ri(t, e),
            (t = fc(t, r)),
            (t.flags |= 4096));
        return t;
      }
      return (
        (e = gi(e.child, { mode: r.mode, children: r.children })),
        (e.ref = t.ref),
        (t.child = e),
        (e.return = t),
        e
      );
    }
    function hc(e, t) {
      var n = t.ref;
      if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
      else {
        if (typeof n != `function` && typeof n != `object`) throw Error(i(284));
        (e === null || e.ref !== n) && (t.flags |= 4194816);
      }
    }
    function gc(e, t, n, r, i) {
      return (
        aa(t),
        (n = Do(e, t, n, r, void 0, i)),
        (r = jo()),
        e !== null && !ic
          ? (Mo(e, t, i), Ac(e, t, i))
          : (F && r && Ii(t), (t.flags |= 1), ac(e, t, n, i), t.child)
      );
    }
    function _c(e, t, n, r, i, a) {
      return (
        aa(t),
        (t.updateQueue = null),
        (n = ko(t, r, n, i)),
        Oo(e),
        (r = jo()),
        e !== null && !ic
          ? (Mo(e, t, a), Ac(e, t, a))
          : (F && r && Ii(t), (t.flags |= 1), ac(e, t, n, a), t.child)
      );
    }
    function vc(e, t, n, r, i) {
      if ((aa(t), t.stateNode === null)) {
        var a = fi,
          o = n.contextType;
        (typeof o == `object` && o && (a = oa(o)),
          (a = new n(r, a)),
          (t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null),
          (a.updater = Ws),
          (t.stateNode = a),
          (a._reactInternals = t),
          (a = t.stateNode),
          (a.props = r),
          (a.state = t.memoizedState),
          (a.refs = {}),
          Ga(t),
          (o = n.contextType),
          (a.context = typeof o == `object` && o ? oa(o) : fi),
          (a.state = t.memoizedState),
          (o = n.getDerivedStateFromProps),
          typeof o == `function` && (Us(t, n, o, r), (a.state = t.memoizedState)),
          typeof n.getDerivedStateFromProps == `function` ||
            typeof a.getSnapshotBeforeUpdate == `function` ||
            (typeof a.UNSAFE_componentWillMount != `function` &&
              typeof a.componentWillMount != `function`) ||
            ((o = a.state),
            typeof a.componentWillMount == `function` && a.componentWillMount(),
            typeof a.UNSAFE_componentWillMount == `function` && a.UNSAFE_componentWillMount(),
            o !== a.state && Ws.enqueueReplaceState(a, a.state, null),
            $a(t, r, a, i),
            Qa(),
            (a.state = t.memoizedState)),
          typeof a.componentDidMount == `function` && (t.flags |= 4194308),
          (r = !0));
      } else if (e === null) {
        a = t.stateNode;
        var s = t.memoizedProps,
          c = qs(n, s);
        a.props = c;
        var l = a.context,
          u = n.contextType;
        ((o = fi), typeof u == `object` && u && (o = oa(u)));
        var d = n.getDerivedStateFromProps;
        ((u = typeof d == `function` || typeof a.getSnapshotBeforeUpdate == `function`),
          (s = t.pendingProps !== s),
          u ||
            (typeof a.UNSAFE_componentWillReceiveProps != `function` &&
              typeof a.componentWillReceiveProps != `function`) ||
            ((s || l !== o) && Ks(t, a, r, o)),
          (I = !1));
        var f = t.memoizedState;
        ((a.state = f),
          $a(t, r, a, i),
          Qa(),
          (l = t.memoizedState),
          s || f !== l || I
            ? (typeof d == `function` && (Us(t, n, d, r), (l = t.memoizedState)),
              (c = I || Gs(t, n, c, r, f, l, o))
                ? (u ||
                    (typeof a.UNSAFE_componentWillMount != `function` &&
                      typeof a.componentWillMount != `function`) ||
                    (typeof a.componentWillMount == `function` && a.componentWillMount(),
                    typeof a.UNSAFE_componentWillMount == `function` &&
                      a.UNSAFE_componentWillMount()),
                  typeof a.componentDidMount == `function` && (t.flags |= 4194308))
                : (typeof a.componentDidMount == `function` && (t.flags |= 4194308),
                  (t.memoizedProps = r),
                  (t.memoizedState = l)),
              (a.props = r),
              (a.state = l),
              (a.context = o),
              (r = c))
            : (typeof a.componentDidMount == `function` && (t.flags |= 4194308), (r = !1)));
      } else {
        ((a = t.stateNode),
          Ka(e, t),
          (o = t.memoizedProps),
          (u = qs(n, o)),
          (a.props = u),
          (d = t.pendingProps),
          (f = a.context),
          (l = n.contextType),
          (c = fi),
          typeof l == `object` && l && (c = oa(l)),
          (s = n.getDerivedStateFromProps),
          (l = typeof s == `function` || typeof a.getSnapshotBeforeUpdate == `function`) ||
            (typeof a.UNSAFE_componentWillReceiveProps != `function` &&
              typeof a.componentWillReceiveProps != `function`) ||
            ((o !== d || f !== c) && Ks(t, a, r, c)),
          (I = !1),
          (f = t.memoizedState),
          (a.state = f),
          $a(t, r, a, i),
          Qa());
        var p = t.memoizedState;
        o !== d || f !== p || I || (e !== null && e.dependencies !== null && ia(e.dependencies))
          ? (typeof s == `function` && (Us(t, n, s, r), (p = t.memoizedState)),
            (u =
              I ||
              Gs(t, n, u, r, f, p, c) ||
              (e !== null && e.dependencies !== null && ia(e.dependencies)))
              ? (l ||
                  (typeof a.UNSAFE_componentWillUpdate != `function` &&
                    typeof a.componentWillUpdate != `function`) ||
                  (typeof a.componentWillUpdate == `function` && a.componentWillUpdate(r, p, c),
                  typeof a.UNSAFE_componentWillUpdate == `function` &&
                    a.UNSAFE_componentWillUpdate(r, p, c)),
                typeof a.componentDidUpdate == `function` && (t.flags |= 4),
                typeof a.getSnapshotBeforeUpdate == `function` && (t.flags |= 1024))
              : (typeof a.componentDidUpdate != `function` ||
                  (o === e.memoizedProps && f === e.memoizedState) ||
                  (t.flags |= 4),
                typeof a.getSnapshotBeforeUpdate != `function` ||
                  (o === e.memoizedProps && f === e.memoizedState) ||
                  (t.flags |= 1024),
                (t.memoizedProps = r),
                (t.memoizedState = p)),
            (a.props = r),
            (a.state = p),
            (a.context = c),
            (r = u))
          : (typeof a.componentDidUpdate != `function` ||
              (o === e.memoizedProps && f === e.memoizedState) ||
              (t.flags |= 4),
            typeof a.getSnapshotBeforeUpdate != `function` ||
              (o === e.memoizedProps && f === e.memoizedState) ||
              (t.flags |= 1024),
            (r = !1));
      }
      return (
        (a = r),
        hc(e, t),
        (r = (t.flags & 128) != 0),
        a || r
          ? ((a = t.stateNode),
            (n = r && typeof n.getDerivedStateFromError != `function` ? null : a.render()),
            (t.flags |= 1),
            e !== null && r
              ? ((t.child = Ua(t, e.child, null, i)), (t.child = Ua(t, null, n, i)))
              : ac(e, t, n, i),
            (t.memoizedState = a.state),
            (e = t.child))
          : (e = Ac(e, t, i)),
        e
      );
    }
    function yc(e, t, n, r) {
      return (qi(), (t.flags |= 256), ac(e, t, n, r), t.child);
    }
    var bc = { dehydrated: null, treeContext: null, retryLane: 0, hydrationErrors: null };
    function xc(e) {
      return { baseLanes: e, cachePool: Ea() };
    }
    function Sc(e, t, n) {
      return ((e = e === null ? 0 : e.childLanes & ~n), t && (e |= Yl), e);
    }
    function Cc(e, t, n) {
      var r = t.pendingProps,
        a = !1,
        o = (t.flags & 128) != 0,
        s;
      if (
        ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : (ho.current & 2) != 0),
        s && ((a = !0), (t.flags &= -129)),
        (s = (t.flags & 32) != 0),
        (t.flags &= -33),
        e === null)
      ) {
        if (F) {
          if (
            (a ? lo(t) : po(t),
            (e = P)
              ? ((e = af(e, Vi)),
                (e = e !== null && e.data !== `&` ? e : null),
                e !== null &&
                  ((t.memoizedState = {
                    dehydrated: e,
                    treeContext: ji === null ? null : { id: Mi, overflow: Ni },
                    retryLane: 536870912,
                    hydrationErrors: null,
                  }),
                  (n = xi(e)),
                  (n.return = t),
                  (t.child = n),
                  (zi = t),
                  (P = null)))
              : (e = null),
            e === null)
          )
            throw Ui(t);
          return (sf(e) ? (t.lanes = 32) : (t.lanes = 536870912), null);
        }
        var c = r.children;
        return (
          (r = r.fallback),
          a
            ? (po(t),
              (a = t.mode),
              (c = Tc({ mode: `hidden`, children: c }, a)),
              (r = yi(r, a, n, null)),
              (c.return = t),
              (r.return = t),
              (c.sibling = r),
              (t.child = c),
              (r = t.child),
              (r.memoizedState = xc(n)),
              (r.childLanes = Sc(e, s, n)),
              (t.memoizedState = bc),
              uc(null, r))
            : (lo(t), wc(t, c))
        );
      }
      var l = e.memoizedState;
      if (l !== null && ((c = l.dehydrated), c !== null)) {
        if (o)
          t.flags & 256
            ? (lo(t), (t.flags &= -257), (t = Ec(e, t, n)))
            : t.memoizedState === null
              ? (po(t),
                (c = r.fallback),
                (a = t.mode),
                (r = Tc({ mode: `visible`, children: r.children }, a)),
                (c = yi(c, a, n, null)),
                (c.flags |= 2),
                (r.return = t),
                (c.return = t),
                (r.sibling = c),
                (t.child = r),
                Ua(t, e.child, null, n),
                (r = t.child),
                (r.memoizedState = xc(n)),
                (r.childLanes = Sc(e, s, n)),
                (t.memoizedState = bc),
                (t = uc(null, r)))
              : (po(t), (t.child = e.child), (t.flags |= 128), (t = null));
        else if ((lo(t), sf(c))) {
          if (((s = c.nextSibling && c.nextSibling.dataset), s)) var u = s.dgst;
          ((s = u),
            (r = Error(i(419))),
            (r.stack = ``),
            (r.digest = s),
            Yi({ value: r, source: null, stack: null }),
            (t = Ec(e, t, n)));
        } else if ((ic || ra(e, t, n, !1), (s = (n & e.childLanes) !== 0), ic || s)) {
          if (((s = q), s !== null && ((r = ct(s, n)), r !== 0 && r !== l.retryLane)))
            throw ((l.retryLane = r), li(e, r), gu(s, e, r), rc);
          (of(c) || Ou(), (t = Ec(e, t, n)));
        } else
          of(c)
            ? ((t.flags |= 192), (t.child = e.child), (t = null))
            : ((e = l.treeContext),
              (P = lf(c.nextSibling)),
              (zi = t),
              (F = !0),
              (Bi = null),
              (Vi = !1),
              e !== null && Ri(t, e),
              (t = wc(t, r.children)),
              (t.flags |= 4096));
        return t;
      }
      return a
        ? (po(t),
          (c = r.fallback),
          (a = t.mode),
          (l = e.child),
          (u = l.sibling),
          (r = gi(l, { mode: `hidden`, children: r.children })),
          (r.subtreeFlags = l.subtreeFlags & 65011712),
          u === null ? ((c = yi(c, a, n, null)), (c.flags |= 2)) : (c = gi(u, c)),
          (c.return = t),
          (r.return = t),
          (r.sibling = c),
          (t.child = r),
          uc(null, r),
          (r = t.child),
          (c = e.child.memoizedState),
          c === null
            ? (c = xc(n))
            : ((a = c.cachePool),
              a === null
                ? (a = Ea())
                : ((l = fa._currentValue), (a = a.parent === l ? a : { parent: l, pool: l })),
              (c = { baseLanes: c.baseLanes | n, cachePool: a })),
          (r.memoizedState = c),
          (r.childLanes = Sc(e, s, n)),
          (t.memoizedState = bc),
          uc(e.child, r))
        : (lo(t),
          (n = e.child),
          (e = n.sibling),
          (n = gi(n, { mode: `visible`, children: r.children })),
          (n.return = t),
          (n.sibling = null),
          e !== null &&
            ((s = t.deletions), s === null ? ((t.deletions = [e]), (t.flags |= 16)) : s.push(e)),
          (t.child = n),
          (t.memoizedState = null),
          n);
    }
    function wc(e, t) {
      return ((t = Tc({ mode: `visible`, children: t }, e.mode)), (t.return = e), (e.child = t));
    }
    function Tc(e, t) {
      return ((e = mi(22, e, null, t)), (e.lanes = 0), e);
    }
    function Ec(e, t, n) {
      return (
        Ua(t, e.child, null, n),
        (e = wc(t, t.pendingProps.children)),
        (e.flags |= 2),
        (t.memoizedState = null),
        e
      );
    }
    function Dc(e, t, n) {
      e.lanes |= t;
      var r = e.alternate;
      (r !== null && (r.lanes |= t), ta(e.return, t, n));
    }
    function Oc(e, t, n, r, i, a) {
      var o = e.memoizedState;
      o === null
        ? (e.memoizedState = {
            isBackwards: t,
            rendering: null,
            renderingStartTime: 0,
            last: r,
            tail: n,
            tailMode: i,
            treeForkCount: a,
          })
        : ((o.isBackwards = t),
          (o.rendering = null),
          (o.renderingStartTime = 0),
          (o.last = r),
          (o.tail = n),
          (o.tailMode = i),
          (o.treeForkCount = a));
    }
    function kc(e, t, n) {
      var r = t.pendingProps,
        i = r.revealOrder,
        a = r.tail;
      r = r.children;
      var o = ho.current,
        s = (o & 2) != 0;
      if (
        (s ? ((o = (o & 1) | 2), (t.flags |= 128)) : (o &= 1),
        k(ho, o),
        ac(e, t, r, n),
        (r = F ? Oi : 0),
        !s && e !== null && e.flags & 128)
      )
        a: for (e = t.child; e !== null;) {
          if (e.tag === 13) e.memoizedState !== null && Dc(e, n, t);
          else if (e.tag === 19) Dc(e, n, t);
          else if (e.child !== null) {
            ((e.child.return = e), (e = e.child));
            continue;
          }
          if (e === t) break a;
          for (; e.sibling === null;) {
            if (e.return === null || e.return === t) break a;
            e = e.return;
          }
          ((e.sibling.return = e.return), (e = e.sibling));
        }
      switch (i) {
        case `forwards`:
          for (n = t.child, i = null; n !== null;)
            ((e = n.alternate), e !== null && go(e) === null && (i = n), (n = n.sibling));
          ((n = i),
            n === null ? ((i = t.child), (t.child = null)) : ((i = n.sibling), (n.sibling = null)),
            Oc(t, !1, i, n, a, r));
          break;
        case `backwards`:
        case `unstable_legacy-backwards`:
          for (n = null, i = t.child, t.child = null; i !== null;) {
            if (((e = i.alternate), e !== null && go(e) === null)) {
              t.child = i;
              break;
            }
            ((e = i.sibling), (i.sibling = n), (n = i), (i = e));
          }
          Oc(t, !0, n, null, a, r);
          break;
        case `together`:
          Oc(t, !1, null, null, void 0, r);
          break;
        default:
          t.memoizedState = null;
      }
      return t.child;
    }
    function Ac(e, t, n) {
      if (
        (e !== null && (t.dependencies = e.dependencies), (Kl |= t.lanes), (n & t.childLanes) === 0)
      )
        if (e !== null) {
          if ((ra(e, t, n, !1), (n & t.childLanes) === 0)) return null;
        } else return null;
      if (e !== null && t.child !== e.child) throw Error(i(153));
      if (t.child !== null) {
        for (e = t.child, n = gi(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;)
          ((e = e.sibling), (n = n.sibling = gi(e, e.pendingProps)), (n.return = t));
        n.sibling = null;
      }
      return t.child;
    }
    function jc(e, t) {
      return (e.lanes & t) === 0 ? ((e = e.dependencies), !!(e !== null && ia(e))) : !0;
    }
    function Mc(e, t, n) {
      switch (t.tag) {
        case 3:
          (ye(t, t.stateNode.containerInfo), $i(t, fa, e.memoizedState.cache), qi());
          break;
        case 27:
        case 5:
          j(t);
          break;
        case 4:
          ye(t, t.stateNode.containerInfo);
          break;
        case 10:
          $i(t, t.type, t.memoizedProps.value);
          break;
        case 31:
          if (t.memoizedState !== null) return ((t.flags |= 128), uo(t), null);
          break;
        case 13:
          var r = t.memoizedState;
          if (r !== null)
            return r.dehydrated === null
              ? (n & t.child.childLanes) === 0
                ? (lo(t), (e = Ac(e, t, n)), e === null ? null : e.sibling)
                : Cc(e, t, n)
              : (lo(t), (t.flags |= 128), null);
          lo(t);
          break;
        case 19:
          var i = (e.flags & 128) != 0;
          if (
            ((r = (n & t.childLanes) !== 0), (r ||= (ra(e, t, n, !1), (n & t.childLanes) !== 0)), i)
          ) {
            if (r) return kc(e, t, n);
            t.flags |= 128;
          }
          if (
            ((i = t.memoizedState),
            i !== null && ((i.rendering = null), (i.tail = null), (i.lastEffect = null)),
            k(ho, ho.current),
            r)
          )
            break;
          return null;
        case 22:
          return ((t.lanes = 0), lc(e, t, n, t.pendingProps));
        case 24:
          $i(t, fa, e.memoizedState.cache);
      }
      return Ac(e, t, n);
    }
    function Nc(e, t, n) {
      if (e !== null)
        if (e.memoizedProps !== t.pendingProps) ic = !0;
        else {
          if (!jc(e, n) && !(t.flags & 128)) return ((ic = !1), Mc(e, t, n));
          ic = !!(e.flags & 131072);
        }
      else ((ic = !1), F && t.flags & 1048576 && Fi(t, Oi, t.index));
      switch (((t.lanes = 0), t.tag)) {
        case 16:
          a: {
            var r = t.pendingProps;
            if (((e = Na(t.elementType)), (t.type = e), typeof e == `function`))
              hi(e)
                ? ((r = qs(e, r)), (t.tag = 1), (t = vc(null, t, e, r, n)))
                : ((t.tag = 0), (t = gc(null, t, e, r, n)));
            else {
              if (e != null) {
                var a = e.$$typeof;
                if (a === C) {
                  ((t.tag = 11), (t = oc(null, t, e, r, n)));
                  break a;
                } else if (a === re) {
                  ((t.tag = 14), (t = sc(null, t, e, r, n)));
                  break a;
                }
              }
              throw ((t = le(e) || e), Error(i(306, t, ``)));
            }
          }
          return t;
        case 0:
          return gc(e, t, t.type, t.pendingProps, n);
        case 1:
          return ((r = t.type), (a = qs(r, t.pendingProps)), vc(e, t, r, a, n));
        case 3:
          a: {
            if ((ye(t, t.stateNode.containerInfo), e === null)) throw Error(i(387));
            r = t.pendingProps;
            var o = t.memoizedState;
            ((a = o.element), Ka(e, t), $a(t, r, null, n));
            var s = t.memoizedState;
            if (
              ((r = s.cache),
              $i(t, fa, r),
              r !== o.cache && na(t, [fa], n, !0),
              Qa(),
              (r = s.element),
              o.isDehydrated)
            )
              if (
                ((o = { element: r, isDehydrated: !1, cache: s.cache }),
                (t.updateQueue.baseState = o),
                (t.memoizedState = o),
                t.flags & 256)
              ) {
                t = yc(e, t, r, n);
                break a;
              } else if (r !== a) {
                ((a = wi(Error(i(424)), t)), Yi(a), (t = yc(e, t, r, n)));
                break a;
              } else {
                switch (((e = t.stateNode.containerInfo), e.nodeType)) {
                  case 9:
                    e = e.body;
                    break;
                  default:
                    e = e.nodeName === `HTML` ? e.ownerDocument.body : e;
                }
                for (
                  P = lf(e.firstChild),
                    zi = t,
                    F = !0,
                    Bi = null,
                    Vi = !0,
                    n = Wa(t, null, r, n),
                    t.child = n;
                  n;
                )
                  ((n.flags = (n.flags & -3) | 4096), (n = n.sibling));
              }
            else {
              if ((qi(), r === a)) {
                t = Ac(e, t, n);
                break a;
              }
              ac(e, t, r, n);
            }
            t = t.child;
          }
          return t;
        case 26:
          return (
            hc(e, t),
            e === null
              ? (n = Af(t.type, null, t.pendingProps, null))
                ? (t.memoizedState = n)
                : F ||
                  ((n = t.type),
                  (e = t.pendingProps),
                  (r = Vd(_e.current).createElement(n)),
                  (r[mt] = t),
                  (r[ht] = e),
                  Fd(r, n, e),
                  Dt(r),
                  (t.stateNode = r))
              : (t.memoizedState = Af(t.type, e.memoizedProps, t.pendingProps, e.memoizedState)),
            null
          );
        case 27:
          return (
            j(t),
            e === null &&
              F &&
              ((r = t.stateNode = pf(t.type, t.pendingProps, _e.current)),
              (zi = t),
              (Vi = !0),
              (a = P),
              Qd(t.type) ? ((uf = a), (P = lf(r.firstChild))) : (P = a)),
            ac(e, t, t.pendingProps.children, n),
            hc(e, t),
            e === null && (t.flags |= 4194304),
            t.child
          );
        case 5:
          return (
            e === null &&
              F &&
              ((a = r = P) &&
                ((r = nf(r, t.type, t.pendingProps, Vi)),
                r === null
                  ? (a = !1)
                  : ((t.stateNode = r), (zi = t), (P = lf(r.firstChild)), (Vi = !1), (a = !0))),
              a || Ui(t)),
            j(t),
            (a = t.type),
            (o = t.pendingProps),
            (s = e === null ? null : e.memoizedProps),
            (r = o.children),
            Wd(a, o) ? (r = null) : s !== null && Wd(a, s) && (t.flags |= 32),
            t.memoizedState !== null && ((a = Do(e, t, Ao, null, null, n)), ($f._currentValue = a)),
            hc(e, t),
            ac(e, t, r, n),
            t.child
          );
        case 6:
          return (
            e === null &&
              F &&
              ((e = n = P) &&
                ((n = rf(n, t.pendingProps, Vi)),
                n === null ? (e = !1) : ((t.stateNode = n), (zi = t), (P = null), (e = !0))),
              e || Ui(t)),
            null
          );
        case 13:
          return Cc(e, t, n);
        case 4:
          return (
            ye(t, t.stateNode.containerInfo),
            (r = t.pendingProps),
            e === null ? (t.child = Ua(t, null, r, n)) : ac(e, t, r, n),
            t.child
          );
        case 11:
          return oc(e, t, t.type, t.pendingProps, n);
        case 7:
          return (ac(e, t, t.pendingProps, n), t.child);
        case 8:
          return (ac(e, t, t.pendingProps.children, n), t.child);
        case 12:
          return (ac(e, t, t.pendingProps.children, n), t.child);
        case 10:
          return ((r = t.pendingProps), $i(t, t.type, r.value), ac(e, t, r.children, n), t.child);
        case 9:
          return (
            (a = t.type._context),
            (r = t.pendingProps.children),
            aa(t),
            (a = oa(a)),
            (r = r(a)),
            (t.flags |= 1),
            ac(e, t, r, n),
            t.child
          );
        case 14:
          return sc(e, t, t.type, t.pendingProps, n);
        case 15:
          return cc(e, t, t.type, t.pendingProps, n);
        case 19:
          return kc(e, t, n);
        case 31:
          return mc(e, t, n);
        case 22:
          return lc(e, t, n, t.pendingProps);
        case 24:
          return (
            aa(t),
            (r = oa(fa)),
            e === null
              ? ((a = wa()),
                a === null &&
                  ((a = q),
                  (o = pa()),
                  (a.pooledCache = o),
                  o.refCount++,
                  o !== null && (a.pooledCacheLanes |= n),
                  (a = o)),
                (t.memoizedState = { parent: r, cache: a }),
                Ga(t),
                $i(t, fa, a))
              : ((e.lanes & n) !== 0 && (Ka(e, t), $a(t, null, null, n), Qa()),
                (a = e.memoizedState),
                (o = t.memoizedState),
                a.parent === r
                  ? ((r = o.cache), $i(t, fa, r), r !== a.cache && na(t, [fa], n, !0))
                  : ((a = { parent: r, cache: r }),
                    (t.memoizedState = a),
                    t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = a),
                    $i(t, fa, r))),
            ac(e, t, t.pendingProps.children, n),
            t.child
          );
        case 29:
          throw t.pendingProps;
      }
      throw Error(i(156, t.tag));
    }
    function Pc(e) {
      e.flags |= 4;
    }
    function Fc(e, t, n, r, i) {
      if (((t = (e.mode & 32) != 0) && (t = !1), t)) {
        if (((e.flags |= 16777216), (i & 335544128) === i))
          if (e.stateNode.complete) e.flags |= 8192;
          else if (Tu()) e.flags |= 8192;
          else throw ((Pa = Aa), Oa);
      } else e.flags &= -16777217;
    }
    function Ic(e, t) {
      if (t.type !== `stylesheet` || t.state.loading & 4) e.flags &= -16777217;
      else if (((e.flags |= 16777216), !Gf(t)))
        if (Tu()) e.flags |= 8192;
        else throw ((Pa = Aa), Oa);
    }
    function Lc(e, t) {
      (t !== null && (e.flags |= 4),
        e.flags & 16384 && ((t = e.tag === 22 ? 536870912 : nt()), (e.lanes |= t), (Xl |= t)));
    }
    function Rc(e, t) {
      if (!F)
        switch (e.tailMode) {
          case `hidden`:
            t = e.tail;
            for (var n = null; t !== null;) (t.alternate !== null && (n = t), (t = t.sibling));
            n === null ? (e.tail = null) : (n.sibling = null);
            break;
          case `collapsed`:
            n = e.tail;
            for (var r = null; n !== null;) (n.alternate !== null && (r = n), (n = n.sibling));
            r === null
              ? t || e.tail === null
                ? (e.tail = null)
                : (e.tail.sibling = null)
              : (r.sibling = null);
        }
    }
    function W(e) {
      var t = e.alternate !== null && e.alternate.child === e.child,
        n = 0,
        r = 0;
      if (t)
        for (var i = e.child; i !== null;)
          ((n |= i.lanes | i.childLanes),
            (r |= i.subtreeFlags & 65011712),
            (r |= i.flags & 65011712),
            (i.return = e),
            (i = i.sibling));
      else
        for (i = e.child; i !== null;)
          ((n |= i.lanes | i.childLanes),
            (r |= i.subtreeFlags),
            (r |= i.flags),
            (i.return = e),
            (i = i.sibling));
      return ((e.subtreeFlags |= r), (e.childLanes = n), t);
    }
    function zc(e, t, n) {
      var r = t.pendingProps;
      switch ((Li(t), t.tag)) {
        case 16:
        case 15:
        case 0:
        case 11:
        case 7:
        case 8:
        case 12:
        case 9:
        case 14:
          return (W(t), null);
        case 1:
          return (W(t), null);
        case 3:
          return (
            (n = t.stateNode),
            (r = null),
            e !== null && (r = e.memoizedState.cache),
            t.memoizedState.cache !== r && (t.flags |= 2048),
            ea(fa),
            A(),
            n.pendingContext && ((n.context = n.pendingContext), (n.pendingContext = null)),
            (e === null || e.child === null) &&
              (Ki(t)
                ? Pc(t)
                : e === null ||
                  (e.memoizedState.isDehydrated && !(t.flags & 256)) ||
                  ((t.flags |= 1024), Ji())),
            W(t),
            null
          );
        case 26:
          var a = t.type,
            o = t.memoizedState;
          return (
            e === null
              ? (Pc(t), o === null ? (W(t), Fc(t, a, null, r, n)) : (W(t), Ic(t, o)))
              : o
                ? o === e.memoizedState
                  ? (W(t), (t.flags &= -16777217))
                  : (Pc(t), W(t), Ic(t, o))
                : ((e = e.memoizedProps), e !== r && Pc(t), W(t), Fc(t, a, e, r, n)),
            null
          );
        case 27:
          if ((be(t), (n = _e.current), (a = t.type), e !== null && t.stateNode != null))
            e.memoizedProps !== r && Pc(t);
          else {
            if (!r) {
              if (t.stateNode === null) throw Error(i(166));
              return (W(t), null);
            }
            ((e = he.current), Ki(t) ? Wi(t, e) : ((e = pf(a, r, n)), (t.stateNode = e), Pc(t)));
          }
          return (W(t), null);
        case 5:
          if ((be(t), (a = t.type), e !== null && t.stateNode != null))
            e.memoizedProps !== r && Pc(t);
          else {
            if (!r) {
              if (t.stateNode === null) throw Error(i(166));
              return (W(t), null);
            }
            if (((o = he.current), Ki(t))) Wi(t, o);
            else {
              var s = Vd(_e.current);
              switch (o) {
                case 1:
                  o = s.createElementNS(`http://www.w3.org/2000/svg`, a);
                  break;
                case 2:
                  o = s.createElementNS(`http://www.w3.org/1998/Math/MathML`, a);
                  break;
                default:
                  switch (a) {
                    case `svg`:
                      o = s.createElementNS(`http://www.w3.org/2000/svg`, a);
                      break;
                    case `math`:
                      o = s.createElementNS(`http://www.w3.org/1998/Math/MathML`, a);
                      break;
                    case `script`:
                      ((o = s.createElement(`div`)),
                        (o.innerHTML = `<script><\/script>`),
                        (o = o.removeChild(o.firstChild)));
                      break;
                    case `select`:
                      ((o =
                        typeof r.is == `string`
                          ? s.createElement(`select`, { is: r.is })
                          : s.createElement(`select`)),
                        r.multiple ? (o.multiple = !0) : r.size && (o.size = r.size));
                      break;
                    default:
                      o =
                        typeof r.is == `string`
                          ? s.createElement(a, { is: r.is })
                          : s.createElement(a);
                  }
              }
              ((o[mt] = t), (o[ht] = r));
              a: for (s = t.child; s !== null;) {
                if (s.tag === 5 || s.tag === 6) o.appendChild(s.stateNode);
                else if (s.tag !== 4 && s.tag !== 27 && s.child !== null) {
                  ((s.child.return = s), (s = s.child));
                  continue;
                }
                if (s === t) break a;
                for (; s.sibling === null;) {
                  if (s.return === null || s.return === t) break a;
                  s = s.return;
                }
                ((s.sibling.return = s.return), (s = s.sibling));
              }
              t.stateNode = o;
              a: switch ((Fd(o, a, r), a)) {
                case `button`:
                case `input`:
                case `select`:
                case `textarea`:
                  r = !!r.autoFocus;
                  break a;
                case `img`:
                  r = !0;
                  break a;
                default:
                  r = !1;
              }
              r && Pc(t);
            }
          }
          return (
            W(t),
            Fc(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n),
            null
          );
        case 6:
          if (e && t.stateNode != null) e.memoizedProps !== r && Pc(t);
          else {
            if (typeof r != `string` && t.stateNode === null) throw Error(i(166));
            if (((e = _e.current), Ki(t))) {
              if (((e = t.stateNode), (n = t.memoizedProps), (r = null), (a = zi), a !== null))
                switch (a.tag) {
                  case 27:
                  case 5:
                    r = a.memoizedProps;
                }
              ((e[mt] = t),
                (e = !!(
                  e.nodeValue === n ||
                  (r !== null && !0 === r.suppressHydrationWarning) ||
                  Nd(e.nodeValue, n)
                )),
                e || Ui(t, !0));
            } else ((e = Vd(e).createTextNode(r)), (e[mt] = t), (t.stateNode = e));
          }
          return (W(t), null);
        case 31:
          if (((n = t.memoizedState), e === null || e.memoizedState !== null)) {
            if (((r = Ki(t)), n !== null)) {
              if (e === null) {
                if (!r) throw Error(i(318));
                if (((e = t.memoizedState), (e = e === null ? null : e.dehydrated), !e))
                  throw Error(i(557));
                e[mt] = t;
              } else (qi(), !(t.flags & 128) && (t.memoizedState = null), (t.flags |= 4));
              (W(t), (e = !1));
            } else
              ((n = Ji()),
                e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n),
                (e = !0));
            if (!e) return t.flags & 256 ? (mo(t), t) : (mo(t), null);
            if (t.flags & 128) throw Error(i(558));
          }
          return (W(t), null);
        case 13:
          if (
            ((r = t.memoizedState),
            e === null || (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
          ) {
            if (((a = Ki(t)), r !== null && r.dehydrated !== null)) {
              if (e === null) {
                if (!a) throw Error(i(318));
                if (((a = t.memoizedState), (a = a === null ? null : a.dehydrated), !a))
                  throw Error(i(317));
                a[mt] = t;
              } else (qi(), !(t.flags & 128) && (t.memoizedState = null), (t.flags |= 4));
              (W(t), (a = !1));
            } else
              ((a = Ji()),
                e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = a),
                (a = !0));
            if (!a) return t.flags & 256 ? (mo(t), t) : (mo(t), null);
          }
          return (
            mo(t),
            t.flags & 128
              ? ((t.lanes = n), t)
              : ((n = r !== null),
                (e = e !== null && e.memoizedState !== null),
                n &&
                  ((r = t.child),
                  (a = null),
                  r.alternate !== null &&
                    r.alternate.memoizedState !== null &&
                    r.alternate.memoizedState.cachePool !== null &&
                    (a = r.alternate.memoizedState.cachePool.pool),
                  (o = null),
                  r.memoizedState !== null &&
                    r.memoizedState.cachePool !== null &&
                    (o = r.memoizedState.cachePool.pool),
                  o !== a && (r.flags |= 2048)),
                n !== e && n && (t.child.flags |= 8192),
                Lc(t, t.updateQueue),
                W(t),
                null)
          );
        case 4:
          return (A(), e === null && Cd(t.stateNode.containerInfo), W(t), null);
        case 10:
          return (ea(t.type), W(t), null);
        case 19:
          if ((O(ho), (r = t.memoizedState), r === null)) return (W(t), null);
          if (((a = (t.flags & 128) != 0), (o = r.rendering), o === null))
            if (a) Rc(r, !1);
            else {
              if (Gl !== 0 || (e !== null && e.flags & 128))
                for (e = t.child; e !== null;) {
                  if (((o = go(e)), o !== null)) {
                    for (
                      t.flags |= 128,
                        Rc(r, !1),
                        e = o.updateQueue,
                        t.updateQueue = e,
                        Lc(t, e),
                        t.subtreeFlags = 0,
                        e = n,
                        n = t.child;
                      n !== null;
                    )
                      (_i(n, e), (n = n.sibling));
                    return (k(ho, (ho.current & 1) | 2), F && Pi(t, r.treeForkCount), t.child);
                  }
                  e = e.sibling;
                }
              r.tail !== null &&
                Ne() > nu &&
                ((t.flags |= 128), (a = !0), Rc(r, !1), (t.lanes = 4194304));
            }
          else {
            if (!a)
              if (((e = go(o)), e !== null)) {
                if (
                  ((t.flags |= 128),
                  (a = !0),
                  (e = e.updateQueue),
                  (t.updateQueue = e),
                  Lc(t, e),
                  Rc(r, !0),
                  r.tail === null && r.tailMode === `hidden` && !o.alternate && !F)
                )
                  return (W(t), null);
              } else
                2 * Ne() - r.renderingStartTime > nu &&
                  n !== 536870912 &&
                  ((t.flags |= 128), (a = !0), Rc(r, !1), (t.lanes = 4194304));
            r.isBackwards
              ? ((o.sibling = t.child), (t.child = o))
              : ((e = r.last), e === null ? (t.child = o) : (e.sibling = o), (r.last = o));
          }
          return r.tail === null
            ? (W(t), null)
            : ((e = r.tail),
              (r.rendering = e),
              (r.tail = e.sibling),
              (r.renderingStartTime = Ne()),
              (e.sibling = null),
              (n = ho.current),
              k(ho, a ? (n & 1) | 2 : n & 1),
              F && Pi(t, r.treeForkCount),
              e);
        case 22:
        case 23:
          return (
            mo(t),
            oo(),
            (r = t.memoizedState !== null),
            e === null
              ? r && (t.flags |= 8192)
              : (e.memoizedState !== null) !== r && (t.flags |= 8192),
            r
              ? n & 536870912 && !(t.flags & 128) && (W(t), t.subtreeFlags & 6 && (t.flags |= 8192))
              : W(t),
            (n = t.updateQueue),
            n !== null && Lc(t, n.retryQueue),
            (n = null),
            e !== null &&
              e.memoizedState !== null &&
              e.memoizedState.cachePool !== null &&
              (n = e.memoizedState.cachePool.pool),
            (r = null),
            t.memoizedState !== null &&
              t.memoizedState.cachePool !== null &&
              (r = t.memoizedState.cachePool.pool),
            r !== n && (t.flags |= 2048),
            e !== null && O(Ca),
            null
          );
        case 24:
          return (
            (n = null),
            e !== null && (n = e.memoizedState.cache),
            t.memoizedState.cache !== n && (t.flags |= 2048),
            ea(fa),
            W(t),
            null
          );
        case 25:
          return null;
        case 30:
          return null;
      }
      throw Error(i(156, t.tag));
    }
    function Bc(e, t) {
      switch ((Li(t), t.tag)) {
        case 1:
          return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null);
        case 3:
          return (
            ea(fa),
            A(),
            (e = t.flags),
            e & 65536 && !(e & 128) ? ((t.flags = (e & -65537) | 128), t) : null
          );
        case 26:
        case 27:
        case 5:
          return (be(t), null);
        case 31:
          if (t.memoizedState !== null) {
            if ((mo(t), t.alternate === null)) throw Error(i(340));
            qi();
          }
          return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null);
        case 13:
          if ((mo(t), (e = t.memoizedState), e !== null && e.dehydrated !== null)) {
            if (t.alternate === null) throw Error(i(340));
            qi();
          }
          return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null);
        case 19:
          return (O(ho), null);
        case 4:
          return (A(), null);
        case 10:
          return (ea(t.type), null);
        case 22:
        case 23:
          return (
            mo(t),
            oo(),
            e !== null && O(Ca),
            (e = t.flags),
            e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
          );
        case 24:
          return (ea(fa), null);
        case 25:
          return null;
        default:
          return null;
      }
    }
    function Vc(e, t) {
      switch ((Li(t), t.tag)) {
        case 3:
          (ea(fa), A());
          break;
        case 26:
        case 27:
        case 5:
          be(t);
          break;
        case 4:
          A();
          break;
        case 31:
          t.memoizedState !== null && mo(t);
          break;
        case 13:
          mo(t);
          break;
        case 19:
          O(ho);
          break;
        case 10:
          ea(t.type);
          break;
        case 22:
        case 23:
          (mo(t), oo(), e !== null && O(Ca));
          break;
        case 24:
          ea(fa);
      }
    }
    function Hc(e, t) {
      try {
        var n = t.updateQueue,
          r = n === null ? null : n.lastEffect;
        if (r !== null) {
          var i = r.next;
          n = i;
          do {
            if ((n.tag & e) === e) {
              r = void 0;
              var a = n.create,
                o = n.inst;
              ((r = a()), (o.destroy = r));
            }
            n = n.next;
          } while (n !== i);
        }
      } catch (e) {
        Z(t, t.return, e);
      }
    }
    function Uc(e, t, n) {
      try {
        var r = t.updateQueue,
          i = r === null ? null : r.lastEffect;
        if (i !== null) {
          var a = i.next;
          r = a;
          do {
            if ((r.tag & e) === e) {
              var o = r.inst,
                s = o.destroy;
              if (s !== void 0) {
                ((o.destroy = void 0), (i = t));
                var c = n,
                  l = s;
                try {
                  l();
                } catch (e) {
                  Z(i, c, e);
                }
              }
            }
            r = r.next;
          } while (r !== a);
        }
      } catch (e) {
        Z(t, t.return, e);
      }
    }
    function Wc(e) {
      var t = e.updateQueue;
      if (t !== null) {
        var n = e.stateNode;
        try {
          to(t, n);
        } catch (t) {
          Z(e, e.return, t);
        }
      }
    }
    function Gc(e, t, n) {
      ((n.props = qs(e.type, e.memoizedProps)), (n.state = e.memoizedState));
      try {
        n.componentWillUnmount();
      } catch (n) {
        Z(e, t, n);
      }
    }
    function Kc(e, t) {
      try {
        var n = e.ref;
        if (n !== null) {
          switch (e.tag) {
            case 26:
            case 27:
            case 5:
              var r = e.stateNode;
              break;
            case 30:
              r = e.stateNode;
              break;
            default:
              r = e.stateNode;
          }
          typeof n == `function` ? (e.refCleanup = n(r)) : (n.current = r);
        }
      } catch (n) {
        Z(e, t, n);
      }
    }
    function qc(e, t) {
      var n = e.ref,
        r = e.refCleanup;
      if (n !== null)
        if (typeof r == `function`)
          try {
            r();
          } catch (n) {
            Z(e, t, n);
          } finally {
            ((e.refCleanup = null), (e = e.alternate), e != null && (e.refCleanup = null));
          }
        else if (typeof n == `function`)
          try {
            n(null);
          } catch (n) {
            Z(e, t, n);
          }
        else n.current = null;
    }
    function Jc(e) {
      var t = e.type,
        n = e.memoizedProps,
        r = e.stateNode;
      try {
        a: switch (t) {
          case `button`:
          case `input`:
          case `select`:
          case `textarea`:
            n.autoFocus && r.focus();
            break a;
          case `img`:
            n.src ? (r.src = n.src) : n.srcSet && (r.srcset = n.srcSet);
        }
      } catch (t) {
        Z(e, e.return, t);
      }
    }
    function Yc(e, t, n) {
      try {
        var r = e.stateNode;
        (Id(r, e.type, n, t), (r[ht] = t));
      } catch (t) {
        Z(e, e.return, t);
      }
    }
    function Xc(e) {
      return (
        e.tag === 5 || e.tag === 3 || e.tag === 26 || (e.tag === 27 && Qd(e.type)) || e.tag === 4
      );
    }
    function Zc(e) {
      a: for (;;) {
        for (; e.sibling === null;) {
          if (e.return === null || Xc(e.return)) return null;
          e = e.return;
        }
        for (
          e.sibling.return = e.return, e = e.sibling;
          e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
        ) {
          if ((e.tag === 27 && Qd(e.type)) || e.flags & 2 || e.child === null || e.tag === 4)
            continue a;
          ((e.child.return = e), (e = e.child));
        }
        if (!(e.flags & 2)) return e.stateNode;
      }
    }
    function Qc(e, t, n) {
      var r = e.tag;
      if (r === 5 || r === 6)
        ((e = e.stateNode),
          t
            ? (n.nodeType === 9
                ? n.body
                : n.nodeName === `HTML`
                  ? n.ownerDocument.body
                  : n
              ).insertBefore(e, t)
            : ((t = n.nodeType === 9 ? n.body : n.nodeName === `HTML` ? n.ownerDocument.body : n),
              t.appendChild(e),
              (n = n._reactRootContainer),
              n != null || t.onclick !== null || (t.onclick = cn)));
      else if (
        r !== 4 &&
        (r === 27 && Qd(e.type) && ((n = e.stateNode), (t = null)), (e = e.child), e !== null)
      )
        for (Qc(e, t, n), e = e.sibling; e !== null;) (Qc(e, t, n), (e = e.sibling));
    }
    function $c(e, t, n) {
      var r = e.tag;
      if (r === 5 || r === 6) ((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e));
      else if (r !== 4 && (r === 27 && Qd(e.type) && (n = e.stateNode), (e = e.child), e !== null))
        for ($c(e, t, n), e = e.sibling; e !== null;) ($c(e, t, n), (e = e.sibling));
    }
    function el(e) {
      var t = e.stateNode,
        n = e.memoizedProps;
      try {
        for (var r = e.type, i = t.attributes; i.length;) t.removeAttributeNode(i[0]);
        (Fd(t, r, n), (t[mt] = e), (t[ht] = n));
      } catch (t) {
        Z(e, e.return, t);
      }
    }
    var tl = !1,
      nl = !1,
      rl = !1,
      il = typeof WeakSet == `function` ? WeakSet : Set,
      al = null;
    function ol(e, t) {
      if (((e = e.containerInfo), (zd = cp), (e = Nr(e)), Pr(e))) {
        if (`selectionStart` in e) var n = { start: e.selectionStart, end: e.selectionEnd };
        else
          a: {
            n = ((n = e.ownerDocument) && n.defaultView) || window;
            var r = n.getSelection && n.getSelection();
            if (r && r.rangeCount !== 0) {
              n = r.anchorNode;
              var a = r.anchorOffset,
                o = r.focusNode;
              r = r.focusOffset;
              try {
                (n.nodeType, o.nodeType);
              } catch {
                n = null;
                break a;
              }
              var s = 0,
                c = -1,
                l = -1,
                u = 0,
                d = 0,
                f = e,
                p = null;
              b: for (;;) {
                for (
                  var m;
                  f !== n || (a !== 0 && f.nodeType !== 3) || (c = s + a),
                    f !== o || (r !== 0 && f.nodeType !== 3) || (l = s + r),
                    f.nodeType === 3 && (s += f.nodeValue.length),
                    (m = f.firstChild) !== null;
                )
                  ((p = f), (f = m));
                for (;;) {
                  if (f === e) break b;
                  if (
                    (p === n && ++u === a && (c = s),
                    p === o && ++d === r && (l = s),
                    (m = f.nextSibling) !== null)
                  )
                    break;
                  ((f = p), (p = f.parentNode));
                }
                f = m;
              }
              n = c === -1 || l === -1 ? null : { start: c, end: l };
            } else n = null;
          }
        n ||= { start: 0, end: 0 };
      } else n = null;
      for (Bd = { focusedElem: e, selectionRange: n }, cp = !1, al = t; al !== null;)
        if (((t = al), (e = t.child), t.subtreeFlags & 1028 && e !== null))
          ((e.return = t), (al = e));
        else
          for (; al !== null;) {
            switch (((t = al), (o = t.alternate), (e = t.flags), t.tag)) {
              case 0:
                if (e & 4 && ((e = t.updateQueue), (e = e === null ? null : e.events), e !== null))
                  for (n = 0; n < e.length; n++) ((a = e[n]), (a.ref.impl = a.nextImpl));
                break;
              case 11:
              case 15:
                break;
              case 1:
                if (e & 1024 && o !== null) {
                  ((e = void 0),
                    (n = t),
                    (a = o.memoizedProps),
                    (o = o.memoizedState),
                    (r = n.stateNode));
                  try {
                    var h = qs(n.type, a);
                    ((e = r.getSnapshotBeforeUpdate(h, o)),
                      (r.__reactInternalSnapshotBeforeUpdate = e));
                  } catch (e) {
                    Z(n, n.return, e);
                  }
                }
                break;
              case 3:
                if (e & 1024) {
                  if (((e = t.stateNode.containerInfo), (n = e.nodeType), n === 9)) tf(e);
                  else if (n === 1)
                    switch (e.nodeName) {
                      case `HEAD`:
                      case `HTML`:
                      case `BODY`:
                        tf(e);
                        break;
                      default:
                        e.textContent = ``;
                    }
                }
                break;
              case 5:
              case 26:
              case 27:
              case 6:
              case 4:
              case 17:
                break;
              default:
                if (e & 1024) throw Error(i(163));
            }
            if (((e = t.sibling), e !== null)) {
              ((e.return = t.return), (al = e));
              break;
            }
            al = t.return;
          }
    }
    function sl(e, t, n) {
      var r = n.flags;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          (xl(e, n), r & 4 && Hc(5, n));
          break;
        case 1:
          if ((xl(e, n), r & 4))
            if (((e = n.stateNode), t === null))
              try {
                e.componentDidMount();
              } catch (e) {
                Z(n, n.return, e);
              }
            else {
              var i = qs(n.type, t.memoizedProps);
              t = t.memoizedState;
              try {
                e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
              } catch (e) {
                Z(n, n.return, e);
              }
            }
          (r & 64 && Wc(n), r & 512 && Kc(n, n.return));
          break;
        case 3:
          if ((xl(e, n), r & 64 && ((e = n.updateQueue), e !== null))) {
            if (((t = null), n.child !== null))
              switch (n.child.tag) {
                case 27:
                case 5:
                  t = n.child.stateNode;
                  break;
                case 1:
                  t = n.child.stateNode;
              }
            try {
              to(e, t);
            } catch (e) {
              Z(n, n.return, e);
            }
          }
          break;
        case 27:
          t === null && r & 4 && el(n);
        case 26:
        case 5:
          (xl(e, n), t === null && r & 4 && Jc(n), r & 512 && Kc(n, n.return));
          break;
        case 12:
          xl(e, n);
          break;
        case 31:
          (xl(e, n), r & 4 && fl(e, n));
          break;
        case 13:
          (xl(e, n),
            r & 4 && pl(e, n),
            r & 64 &&
              ((e = n.memoizedState),
              e !== null &&
                ((e = e.dehydrated), e !== null && ((n = Yu.bind(null, n)), cf(e, n)))));
          break;
        case 22:
          if (((r = n.memoizedState !== null || tl), !r)) {
            ((t = (t !== null && t.memoizedState !== null) || nl), (i = tl));
            var a = nl;
            ((tl = r),
              (nl = t) && !a ? Cl(e, n, (n.subtreeFlags & 8772) != 0) : xl(e, n),
              (tl = i),
              (nl = a));
          }
          break;
        case 30:
          break;
        default:
          xl(e, n);
      }
    }
    function cl(e) {
      var t = e.alternate;
      (t !== null && ((e.alternate = null), cl(t)),
        (e.child = null),
        (e.deletions = null),
        (e.sibling = null),
        e.tag === 5 && ((t = e.stateNode), t !== null && St(t)),
        (e.stateNode = null),
        (e.return = null),
        (e.dependencies = null),
        (e.memoizedProps = null),
        (e.memoizedState = null),
        (e.pendingProps = null),
        (e.stateNode = null),
        (e.updateQueue = null));
    }
    var G = null,
      ll = !1;
    function ul(e, t, n) {
      for (n = n.child; n !== null;) (dl(e, t, n), (n = n.sibling));
    }
    function dl(e, t, n) {
      if (Ue && typeof Ue.onCommitFiberUnmount == `function`)
        try {
          Ue.onCommitFiberUnmount(He, n);
        } catch {}
      switch (n.tag) {
        case 26:
          (nl || qc(n, t),
            ul(e, t, n),
            n.memoizedState
              ? n.memoizedState.count--
              : n.stateNode && ((n = n.stateNode), n.parentNode.removeChild(n)));
          break;
        case 27:
          nl || qc(n, t);
          var r = G,
            i = ll;
          (Qd(n.type) && ((G = n.stateNode), (ll = !1)),
            ul(e, t, n),
            mf(n.stateNode),
            (G = r),
            (ll = i));
          break;
        case 5:
          nl || qc(n, t);
        case 6:
          if (((r = G), (i = ll), (G = null), ul(e, t, n), (G = r), (ll = i), G !== null))
            if (ll)
              try {
                (G.nodeType === 9
                  ? G.body
                  : G.nodeName === `HTML`
                    ? G.ownerDocument.body
                    : G
                ).removeChild(n.stateNode);
              } catch (e) {
                Z(n, t, e);
              }
            else
              try {
                G.removeChild(n.stateNode);
              } catch (e) {
                Z(n, t, e);
              }
          break;
        case 18:
          G !== null &&
            (ll
              ? ((e = G),
                $d(
                  e.nodeType === 9 ? e.body : e.nodeName === `HTML` ? e.ownerDocument.body : e,
                  n.stateNode,
                ),
                Pp(e))
              : $d(G, n.stateNode));
          break;
        case 4:
          ((r = G),
            (i = ll),
            (G = n.stateNode.containerInfo),
            (ll = !0),
            ul(e, t, n),
            (G = r),
            (ll = i));
          break;
        case 0:
        case 11:
        case 14:
        case 15:
          (Uc(2, n, t), nl || Uc(4, n, t), ul(e, t, n));
          break;
        case 1:
          (nl ||
            (qc(n, t),
            (r = n.stateNode),
            typeof r.componentWillUnmount == `function` && Gc(n, t, r)),
            ul(e, t, n));
          break;
        case 21:
          ul(e, t, n);
          break;
        case 22:
          ((nl = (r = nl) || n.memoizedState !== null), ul(e, t, n), (nl = r));
          break;
        default:
          ul(e, t, n);
      }
    }
    function fl(e, t) {
      if (
        t.memoizedState === null &&
        ((e = t.alternate), e !== null && ((e = e.memoizedState), e !== null))
      ) {
        e = e.dehydrated;
        try {
          Pp(e);
        } catch (e) {
          Z(t, t.return, e);
        }
      }
    }
    function pl(e, t) {
      if (
        t.memoizedState === null &&
        ((e = t.alternate),
        e !== null && ((e = e.memoizedState), e !== null && ((e = e.dehydrated), e !== null)))
      )
        try {
          Pp(e);
        } catch (e) {
          Z(t, t.return, e);
        }
    }
    function ml(e) {
      switch (e.tag) {
        case 31:
        case 13:
        case 19:
          var t = e.stateNode;
          return (t === null && (t = e.stateNode = new il()), t);
        case 22:
          return (
            (e = e.stateNode),
            (t = e._retryCache),
            t === null && (t = e._retryCache = new il()),
            t
          );
        default:
          throw Error(i(435, e.tag));
      }
    }
    function hl(e, t) {
      var n = ml(e);
      t.forEach(function (t) {
        if (!n.has(t)) {
          n.add(t);
          var r = Xu.bind(null, e, t);
          t.then(r, r);
        }
      });
    }
    function gl(e, t) {
      var n = t.deletions;
      if (n !== null)
        for (var r = 0; r < n.length; r++) {
          var a = n[r],
            o = e,
            s = t,
            c = s;
          a: for (; c !== null;) {
            switch (c.tag) {
              case 27:
                if (Qd(c.type)) {
                  ((G = c.stateNode), (ll = !1));
                  break a;
                }
                break;
              case 5:
                ((G = c.stateNode), (ll = !1));
                break a;
              case 3:
              case 4:
                ((G = c.stateNode.containerInfo), (ll = !0));
                break a;
            }
            c = c.return;
          }
          if (G === null) throw Error(i(160));
          (dl(o, s, a),
            (G = null),
            (ll = !1),
            (o = a.alternate),
            o !== null && (o.return = null),
            (a.return = null));
        }
      if (t.subtreeFlags & 13886) for (t = t.child; t !== null;) (vl(t, e), (t = t.sibling));
    }
    var _l = null;
    function vl(e, t) {
      var n = e.alternate,
        r = e.flags;
      switch (e.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          (gl(t, e), yl(e), r & 4 && (Uc(3, e, e.return), Hc(3, e), Uc(5, e, e.return)));
          break;
        case 1:
          (gl(t, e),
            yl(e),
            r & 512 && (nl || n === null || qc(n, n.return)),
            r & 64 &&
              tl &&
              ((e = e.updateQueue),
              e !== null &&
                ((r = e.callbacks),
                r !== null &&
                  ((n = e.shared.hiddenCallbacks),
                  (e.shared.hiddenCallbacks = n === null ? r : n.concat(r))))));
          break;
        case 26:
          var a = _l;
          if ((gl(t, e), yl(e), r & 512 && (nl || n === null || qc(n, n.return)), r & 4)) {
            var o = n === null ? null : n.memoizedState;
            if (((r = e.memoizedState), n === null))
              if (r === null)
                if (e.stateNode === null) {
                  a: {
                    ((r = e.type), (n = e.memoizedProps), (a = a.ownerDocument || a));
                    b: switch (r) {
                      case `title`:
                        ((o = a.getElementsByTagName(`title`)[0]),
                          (!o ||
                            o[xt] ||
                            o[mt] ||
                            o.namespaceURI === `http://www.w3.org/2000/svg` ||
                            o.hasAttribute(`itemprop`)) &&
                            ((o = a.createElement(r)),
                            a.head.insertBefore(o, a.querySelector(`head > title`))),
                          Fd(o, r, n),
                          (o[mt] = e),
                          Dt(o),
                          (r = o));
                        break a;
                      case `link`:
                        var s = Hf(`link`, `href`, a).get(r + (n.href || ``));
                        if (s) {
                          for (var c = 0; c < s.length; c++)
                            if (
                              ((o = s[c]),
                              o.getAttribute(`href`) ===
                                (n.href == null || n.href === `` ? null : n.href) &&
                                o.getAttribute(`rel`) === (n.rel == null ? null : n.rel) &&
                                o.getAttribute(`title`) === (n.title == null ? null : n.title) &&
                                o.getAttribute(`crossorigin`) ===
                                  (n.crossOrigin == null ? null : n.crossOrigin))
                            ) {
                              s.splice(c, 1);
                              break b;
                            }
                        }
                        ((o = a.createElement(r)), Fd(o, r, n), a.head.appendChild(o));
                        break;
                      case `meta`:
                        if ((s = Hf(`meta`, `content`, a).get(r + (n.content || ``)))) {
                          for (c = 0; c < s.length; c++)
                            if (
                              ((o = s[c]),
                              o.getAttribute(`content`) ===
                                (n.content == null ? null : `` + n.content) &&
                                o.getAttribute(`name`) === (n.name == null ? null : n.name) &&
                                o.getAttribute(`property`) ===
                                  (n.property == null ? null : n.property) &&
                                o.getAttribute(`http-equiv`) ===
                                  (n.httpEquiv == null ? null : n.httpEquiv) &&
                                o.getAttribute(`charset`) ===
                                  (n.charSet == null ? null : n.charSet))
                            ) {
                              s.splice(c, 1);
                              break b;
                            }
                        }
                        ((o = a.createElement(r)), Fd(o, r, n), a.head.appendChild(o));
                        break;
                      default:
                        throw Error(i(468, r));
                    }
                    ((o[mt] = e), Dt(o), (r = o));
                  }
                  e.stateNode = r;
                } else Uf(a, e.type, e.stateNode);
              else e.stateNode = Lf(a, r, e.memoizedProps);
            else
              o === r
                ? r === null && e.stateNode !== null && Yc(e, e.memoizedProps, n.memoizedProps)
                : (o === null
                    ? n.stateNode !== null && ((n = n.stateNode), n.parentNode.removeChild(n))
                    : o.count--,
                  r === null ? Uf(a, e.type, e.stateNode) : Lf(a, r, e.memoizedProps));
          }
          break;
        case 27:
          (gl(t, e),
            yl(e),
            r & 512 && (nl || n === null || qc(n, n.return)),
            n !== null && r & 4 && Yc(e, e.memoizedProps, n.memoizedProps));
          break;
        case 5:
          if ((gl(t, e), yl(e), r & 512 && (nl || n === null || qc(n, n.return)), e.flags & 32)) {
            a = e.stateNode;
            try {
              $t(a, ``);
            } catch (t) {
              Z(e, e.return, t);
            }
          }
          (r & 4 &&
            e.stateNode != null &&
            ((a = e.memoizedProps), Yc(e, a, n === null ? a : n.memoizedProps)),
            r & 1024 && (rl = !0));
          break;
        case 6:
          if ((gl(t, e), yl(e), r & 4)) {
            if (e.stateNode === null) throw Error(i(162));
            ((r = e.memoizedProps), (n = e.stateNode));
            try {
              n.nodeValue = r;
            } catch (t) {
              Z(e, e.return, t);
            }
          }
          break;
        case 3:
          if (
            ((Vf = null),
            (a = _l),
            (_l = _f(t.containerInfo)),
            gl(t, e),
            (_l = a),
            yl(e),
            r & 4 && n !== null && n.memoizedState.isDehydrated)
          )
            try {
              Pp(t.containerInfo);
            } catch (t) {
              Z(e, e.return, t);
            }
          rl && ((rl = !1), bl(e));
          break;
        case 4:
          ((r = _l), (_l = _f(e.stateNode.containerInfo)), gl(t, e), yl(e), (_l = r));
          break;
        case 12:
          (gl(t, e), yl(e));
          break;
        case 31:
          (gl(t, e),
            yl(e),
            r & 4 && ((r = e.updateQueue), r !== null && ((e.updateQueue = null), hl(e, r))));
          break;
        case 13:
          (gl(t, e),
            yl(e),
            e.child.flags & 8192 &&
              (e.memoizedState !== null) != (n !== null && n.memoizedState !== null) &&
              (eu = Ne()),
            r & 4 && ((r = e.updateQueue), r !== null && ((e.updateQueue = null), hl(e, r))));
          break;
        case 22:
          a = e.memoizedState !== null;
          var l = n !== null && n.memoizedState !== null,
            u = tl,
            d = nl;
          if (((tl = u || a), (nl = d || l), gl(t, e), (nl = d), (tl = u), yl(e), r & 8192))
            a: for (
              t = e.stateNode,
                t._visibility = a ? t._visibility & -2 : t._visibility | 1,
                a && (n === null || l || tl || nl || Sl(e)),
                n = null,
                t = e;
              ;
            ) {
              if (t.tag === 5 || t.tag === 26) {
                if (n === null) {
                  l = n = t;
                  try {
                    if (((o = l.stateNode), a))
                      ((s = o.style),
                        typeof s.setProperty == `function`
                          ? s.setProperty(`display`, `none`, `important`)
                          : (s.display = `none`));
                    else {
                      c = l.stateNode;
                      var f = l.memoizedProps.style,
                        p = f != null && f.hasOwnProperty(`display`) ? f.display : null;
                      c.style.display = p == null || typeof p == `boolean` ? `` : (`` + p).trim();
                    }
                  } catch (e) {
                    Z(l, l.return, e);
                  }
                }
              } else if (t.tag === 6) {
                if (n === null) {
                  l = t;
                  try {
                    l.stateNode.nodeValue = a ? `` : l.memoizedProps;
                  } catch (e) {
                    Z(l, l.return, e);
                  }
                }
              } else if (t.tag === 18) {
                if (n === null) {
                  l = t;
                  try {
                    var m = l.stateNode;
                    a ? ef(m, !0) : ef(l.stateNode, !1);
                  } catch (e) {
                    Z(l, l.return, e);
                  }
                }
              } else if (
                ((t.tag !== 22 && t.tag !== 23) || t.memoizedState === null || t === e) &&
                t.child !== null
              ) {
                ((t.child.return = t), (t = t.child));
                continue;
              }
              if (t === e) break a;
              for (; t.sibling === null;) {
                if (t.return === null || t.return === e) break a;
                (n === t && (n = null), (t = t.return));
              }
              (n === t && (n = null), (t.sibling.return = t.return), (t = t.sibling));
            }
          r & 4 &&
            ((r = e.updateQueue),
            r !== null && ((n = r.retryQueue), n !== null && ((r.retryQueue = null), hl(e, n))));
          break;
        case 19:
          (gl(t, e),
            yl(e),
            r & 4 && ((r = e.updateQueue), r !== null && ((e.updateQueue = null), hl(e, r))));
          break;
        case 30:
          break;
        case 21:
          break;
        default:
          (gl(t, e), yl(e));
      }
    }
    function yl(e) {
      var t = e.flags;
      if (t & 2) {
        try {
          for (var n, r = e.return; r !== null;) {
            if (Xc(r)) {
              n = r;
              break;
            }
            r = r.return;
          }
          if (n == null) throw Error(i(160));
          switch (n.tag) {
            case 27:
              var a = n.stateNode;
              $c(e, Zc(e), a);
              break;
            case 5:
              var o = n.stateNode;
              (n.flags & 32 && ($t(o, ``), (n.flags &= -33)), $c(e, Zc(e), o));
              break;
            case 3:
            case 4:
              var s = n.stateNode.containerInfo;
              Qc(e, Zc(e), s);
              break;
            default:
              throw Error(i(161));
          }
        } catch (t) {
          Z(e, e.return, t);
        }
        e.flags &= -3;
      }
      t & 4096 && (e.flags &= -4097);
    }
    function bl(e) {
      if (e.subtreeFlags & 1024)
        for (e = e.child; e !== null;) {
          var t = e;
          (bl(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), (e = e.sibling));
        }
    }
    function xl(e, t) {
      if (t.subtreeFlags & 8772)
        for (t = t.child; t !== null;) (sl(e, t.alternate, t), (t = t.sibling));
    }
    function Sl(e) {
      for (e = e.child; e !== null;) {
        var t = e;
        switch (t.tag) {
          case 0:
          case 11:
          case 14:
          case 15:
            (Uc(4, t, t.return), Sl(t));
            break;
          case 1:
            qc(t, t.return);
            var n = t.stateNode;
            (typeof n.componentWillUnmount == `function` && Gc(t, t.return, n), Sl(t));
            break;
          case 27:
            mf(t.stateNode);
          case 26:
          case 5:
            (qc(t, t.return), Sl(t));
            break;
          case 22:
            t.memoizedState === null && Sl(t);
            break;
          case 30:
            Sl(t);
            break;
          default:
            Sl(t);
        }
        e = e.sibling;
      }
    }
    function Cl(e, t, n) {
      for (n &&= (t.subtreeFlags & 8772) != 0, t = t.child; t !== null;) {
        var r = t.alternate,
          i = e,
          a = t,
          o = a.flags;
        switch (a.tag) {
          case 0:
          case 11:
          case 15:
            (Cl(i, a, n), Hc(4, a));
            break;
          case 1:
            if ((Cl(i, a, n), (r = a), (i = r.stateNode), typeof i.componentDidMount == `function`))
              try {
                i.componentDidMount();
              } catch (e) {
                Z(r, r.return, e);
              }
            if (((r = a), (i = r.updateQueue), i !== null)) {
              var s = r.stateNode;
              try {
                var c = i.shared.hiddenCallbacks;
                if (c !== null)
                  for (i.shared.hiddenCallbacks = null, i = 0; i < c.length; i++) eo(c[i], s);
              } catch (e) {
                Z(r, r.return, e);
              }
            }
            (n && o & 64 && Wc(a), Kc(a, a.return));
            break;
          case 27:
            el(a);
          case 26:
          case 5:
            (Cl(i, a, n), n && r === null && o & 4 && Jc(a), Kc(a, a.return));
            break;
          case 12:
            Cl(i, a, n);
            break;
          case 31:
            (Cl(i, a, n), n && o & 4 && fl(i, a));
            break;
          case 13:
            (Cl(i, a, n), n && o & 4 && pl(i, a));
            break;
          case 22:
            (a.memoizedState === null && Cl(i, a, n), Kc(a, a.return));
            break;
          case 30:
            break;
          default:
            Cl(i, a, n);
        }
        t = t.sibling;
      }
    }
    function wl(e, t) {
      var n = null;
      (e !== null &&
        e.memoizedState !== null &&
        e.memoizedState.cachePool !== null &&
        (n = e.memoizedState.cachePool.pool),
        (e = null),
        t.memoizedState !== null &&
          t.memoizedState.cachePool !== null &&
          (e = t.memoizedState.cachePool.pool),
        e !== n && (e != null && e.refCount++, n != null && ma(n)));
    }
    function Tl(e, t) {
      ((e = null),
        t.alternate !== null && (e = t.alternate.memoizedState.cache),
        (t = t.memoizedState.cache),
        t !== e && (t.refCount++, e != null && ma(e)));
    }
    function El(e, t, n, r) {
      if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) (Dl(e, t, n, r), (t = t.sibling));
    }
    function Dl(e, t, n, r) {
      var i = t.flags;
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          (El(e, t, n, r), i & 2048 && Hc(9, t));
          break;
        case 1:
          El(e, t, n, r);
          break;
        case 3:
          (El(e, t, n, r),
            i & 2048 &&
              ((e = null),
              t.alternate !== null && (e = t.alternate.memoizedState.cache),
              (t = t.memoizedState.cache),
              t !== e && (t.refCount++, e != null && ma(e))));
          break;
        case 12:
          if (i & 2048) {
            (El(e, t, n, r), (e = t.stateNode));
            try {
              var a = t.memoizedProps,
                o = a.id,
                s = a.onPostCommit;
              typeof s == `function` &&
                s(o, t.alternate === null ? `mount` : `update`, e.passiveEffectDuration, -0);
            } catch (e) {
              Z(t, t.return, e);
            }
          } else El(e, t, n, r);
          break;
        case 31:
          El(e, t, n, r);
          break;
        case 13:
          El(e, t, n, r);
          break;
        case 23:
          break;
        case 22:
          ((a = t.stateNode),
            (o = t.alternate),
            t.memoizedState === null
              ? a._visibility & 2
                ? El(e, t, n, r)
                : ((a._visibility |= 2), Ol(e, t, n, r, (t.subtreeFlags & 10256) != 0 || !1))
              : a._visibility & 2
                ? El(e, t, n, r)
                : kl(e, t),
            i & 2048 && wl(o, t));
          break;
        case 24:
          (El(e, t, n, r), i & 2048 && Tl(t.alternate, t));
          break;
        default:
          El(e, t, n, r);
      }
    }
    function Ol(e, t, n, r, i) {
      for (i &&= (t.subtreeFlags & 10256) != 0 || !1, t = t.child; t !== null;) {
        var a = e,
          o = t,
          s = n,
          c = r,
          l = o.flags;
        switch (o.tag) {
          case 0:
          case 11:
          case 15:
            (Ol(a, o, s, c, i), Hc(8, o));
            break;
          case 23:
            break;
          case 22:
            var u = o.stateNode;
            (o.memoizedState === null
              ? ((u._visibility |= 2), Ol(a, o, s, c, i))
              : u._visibility & 2
                ? Ol(a, o, s, c, i)
                : kl(a, o),
              i && l & 2048 && wl(o.alternate, o));
            break;
          case 24:
            (Ol(a, o, s, c, i), i && l & 2048 && Tl(o.alternate, o));
            break;
          default:
            Ol(a, o, s, c, i);
        }
        t = t.sibling;
      }
    }
    function kl(e, t) {
      if (t.subtreeFlags & 10256)
        for (t = t.child; t !== null;) {
          var n = e,
            r = t,
            i = r.flags;
          switch (r.tag) {
            case 22:
              (kl(n, r), i & 2048 && wl(r.alternate, r));
              break;
            case 24:
              (kl(n, r), i & 2048 && Tl(r.alternate, r));
              break;
            default:
              kl(n, r);
          }
          t = t.sibling;
        }
    }
    var Al = 8192;
    function jl(e, t, n) {
      if (e.subtreeFlags & Al) for (e = e.child; e !== null;) (Ml(e, t, n), (e = e.sibling));
    }
    function Ml(e, t, n) {
      switch (e.tag) {
        case 26:
          (jl(e, t, n),
            e.flags & Al &&
              e.memoizedState !== null &&
              Kf(n, _l, e.memoizedState, e.memoizedProps));
          break;
        case 5:
          jl(e, t, n);
          break;
        case 3:
        case 4:
          var r = _l;
          ((_l = _f(e.stateNode.containerInfo)), jl(e, t, n), (_l = r));
          break;
        case 22:
          e.memoizedState === null &&
            ((r = e.alternate),
            r !== null && r.memoizedState !== null
              ? ((r = Al), (Al = 16777216), jl(e, t, n), (Al = r))
              : jl(e, t, n));
          break;
        default:
          jl(e, t, n);
      }
    }
    function Nl(e) {
      var t = e.alternate;
      if (t !== null && ((e = t.child), e !== null)) {
        t.child = null;
        do ((t = e.sibling), (e.sibling = null), (e = t));
        while (e !== null);
      }
    }
    function Pl(e) {
      var t = e.deletions;
      if (e.flags & 16) {
        if (t !== null)
          for (var n = 0; n < t.length; n++) {
            var r = t[n];
            ((al = r), Ll(r, e));
          }
        Nl(e);
      }
      if (e.subtreeFlags & 10256) for (e = e.child; e !== null;) (Fl(e), (e = e.sibling));
    }
    function Fl(e) {
      switch (e.tag) {
        case 0:
        case 11:
        case 15:
          (Pl(e), e.flags & 2048 && Uc(9, e, e.return));
          break;
        case 3:
          Pl(e);
          break;
        case 12:
          Pl(e);
          break;
        case 22:
          var t = e.stateNode;
          e.memoizedState !== null &&
          t._visibility & 2 &&
          (e.return === null || e.return.tag !== 13)
            ? ((t._visibility &= -3), Il(e))
            : Pl(e);
          break;
        default:
          Pl(e);
      }
    }
    function Il(e) {
      var t = e.deletions;
      if (e.flags & 16) {
        if (t !== null)
          for (var n = 0; n < t.length; n++) {
            var r = t[n];
            ((al = r), Ll(r, e));
          }
        Nl(e);
      }
      for (e = e.child; e !== null;) {
        switch (((t = e), t.tag)) {
          case 0:
          case 11:
          case 15:
            (Uc(8, t, t.return), Il(t));
            break;
          case 22:
            ((n = t.stateNode), n._visibility & 2 && ((n._visibility &= -3), Il(t)));
            break;
          default:
            Il(t);
        }
        e = e.sibling;
      }
    }
    function Ll(e, t) {
      for (; al !== null;) {
        var n = al;
        switch (n.tag) {
          case 0:
          case 11:
          case 15:
            Uc(8, n, t);
            break;
          case 23:
          case 22:
            if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
              var r = n.memoizedState.cachePool.pool;
              r != null && r.refCount++;
            }
            break;
          case 24:
            ma(n.memoizedState.cache);
        }
        if (((r = n.child), r !== null)) ((r.return = n), (al = r));
        else
          a: for (n = e; al !== null;) {
            r = al;
            var i = r.sibling,
              a = r.return;
            if ((cl(r), r === n)) {
              al = null;
              break a;
            }
            if (i !== null) {
              ((i.return = a), (al = i));
              break a;
            }
            al = a;
          }
      }
    }
    var Rl = {
        getCacheForType: function (e) {
          var t = oa(fa),
            n = t.data.get(e);
          return (n === void 0 && ((n = e()), t.data.set(e, n)), n);
        },
        cacheSignal: function () {
          return oa(fa).controller.signal;
        },
      },
      zl = typeof WeakMap == `function` ? WeakMap : Map,
      K = 0,
      q = null,
      J = null,
      Y = 0,
      X = 0,
      Bl = null,
      Vl = !1,
      Hl = !1,
      Ul = !1,
      Wl = 0,
      Gl = 0,
      Kl = 0,
      ql = 0,
      Jl = 0,
      Yl = 0,
      Xl = 0,
      Zl = null,
      Ql = null,
      $l = !1,
      eu = 0,
      tu = 0,
      nu = 1 / 0,
      ru = null,
      iu = null,
      au = 0,
      ou = null,
      su = null,
      cu = 0,
      lu = 0,
      uu = null,
      du = null,
      fu = 0,
      pu = null;
    function mu() {
      return K & 2 && Y !== 0 ? Y & -Y : E.T === null ? dt() : fd();
    }
    function hu() {
      if (Yl === 0)
        if (!(Y & 536870912) || F) {
          var e = Xe;
          ((Xe <<= 1), !(Xe & 3932160) && (Xe = 262144), (Yl = e));
        } else Yl = 536870912;
      return ((e = so.current), e !== null && (e.flags |= 32), Yl);
    }
    function gu(e, t, n) {
      (((e === q && (X === 2 || X === 9)) || e.cancelPendingCommit !== null) &&
        (Cu(e, 0), bu(e, Y, Yl, !1)),
        it(e, n),
        (!(K & 2) || e !== q) &&
          (e === q && (!(K & 2) && (ql |= n), Gl === 4 && bu(e, Y, Yl, !1)), id(e)));
    }
    function _u(e, t, n) {
      if (K & 6) throw Error(i(327));
      var r = (!n && (t & 127) == 0 && (t & e.expiredLanes) === 0) || et(e, t),
        a = r ? ju(e, t) : ku(e, t, !0),
        o = r;
      do {
        if (a === 0) {
          Hl && !r && bu(e, t, 0, !1);
          break;
        } else {
          if (((n = e.current.alternate), o && !yu(n))) {
            ((a = ku(e, t, !1)), (o = !1));
            continue;
          }
          if (a === 2) {
            if (((o = t), e.errorRecoveryDisabledLanes & o)) var s = 0;
            else
              ((s = e.pendingLanes & -536870913),
                (s = s === 0 ? (s & 536870912 ? 536870912 : 0) : s));
            if (s !== 0) {
              t = s;
              a: {
                var c = e;
                a = Zl;
                var l = c.current.memoizedState.isDehydrated;
                if ((l && (Cu(c, s).flags |= 256), (s = ku(c, s, !1)), s !== 2)) {
                  if (Ul && !l) {
                    ((c.errorRecoveryDisabledLanes |= o), (ql |= o), (a = 4));
                    break a;
                  }
                  ((o = Ql),
                    (Ql = a),
                    o !== null && (Ql === null ? (Ql = o) : Ql.push.apply(Ql, o)));
                }
                a = s;
              }
              if (((o = !1), a !== 2)) continue;
            }
          }
          if (a === 1) {
            (Cu(e, 0), bu(e, t, 0, !0));
            break;
          }
          a: {
            switch (((r = e), (o = a), o)) {
              case 0:
              case 1:
                throw Error(i(345));
              case 4:
                if ((t & 4194048) !== t) break;
              case 6:
                bu(r, t, Yl, !Vl);
                break a;
              case 2:
                Ql = null;
                break;
              case 3:
              case 5:
                break;
              default:
                throw Error(i(329));
            }
            if ((t & 62914560) === t && ((a = eu + 300 - Ne()), 10 < a)) {
              if ((bu(r, t, Yl, !Vl), $e(r, 0, !0) !== 0)) break a;
              ((cu = t),
                (r.timeoutHandle = qd(
                  vu.bind(null, r, n, Ql, ru, $l, t, Yl, ql, Xl, Vl, o, `Throttled`, -0, 0),
                  a,
                )));
              break a;
            }
            vu(r, n, Ql, ru, $l, t, Yl, ql, Xl, Vl, o, null, -0, 0);
          }
        }
        break;
      } while (1);
      id(e);
    }
    function vu(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
      if (((e.timeoutHandle = -1), (d = t.subtreeFlags), d & 8192 || (d & 16785408) == 16785408)) {
        ((d = {
          stylesheets: null,
          count: 0,
          imgCount: 0,
          imgBytes: 0,
          suspenseyImages: [],
          waitingForImages: !0,
          waitingForViewTransition: !1,
          unsuspend: cn,
        }),
          Ml(t, a, d));
        var m = (a & 62914560) === a ? eu - Ne() : (a & 4194048) === a ? tu - Ne() : 0;
        if (((m = Jf(d, m)), m !== null)) {
          ((cu = a),
            (e.cancelPendingCommit = m(Ru.bind(null, e, t, a, n, r, i, o, s, c, u, d, null, f, p))),
            bu(e, a, o, !l));
          return;
        }
      }
      Ru(e, t, a, n, r, i, o, s, c);
    }
    function yu(e) {
      for (var t = e; ;) {
        var n = t.tag;
        if (
          (n === 0 || n === 11 || n === 15) &&
          t.flags & 16384 &&
          ((n = t.updateQueue), n !== null && ((n = n.stores), n !== null))
        )
          for (var r = 0; r < n.length; r++) {
            var i = n[r],
              a = i.getSnapshot;
            i = i.value;
            try {
              if (!Or(a(), i)) return !1;
            } catch {
              return !1;
            }
          }
        if (((n = t.child), t.subtreeFlags & 16384 && n !== null)) ((n.return = t), (t = n));
        else {
          if (t === e) break;
          for (; t.sibling === null;) {
            if (t.return === null || t.return === e) return !0;
            t = t.return;
          }
          ((t.sibling.return = t.return), (t = t.sibling));
        }
      }
      return !0;
    }
    function bu(e, t, n, r) {
      ((t &= ~Jl),
        (t &= ~ql),
        (e.suspendedLanes |= t),
        (e.pingedLanes &= ~t),
        r && (e.warmLanes |= t),
        (r = e.expirationTimes));
      for (var i = t; 0 < i;) {
        var a = 31 - Ge(i),
          o = 1 << a;
        ((r[a] = -1), (i &= ~o));
      }
      n !== 0 && ot(e, n, t);
    }
    function xu() {
      return K & 6 ? !0 : (ad(0, !1), !1);
    }
    function Su() {
      if (J !== null) {
        if (X === 0) var e = J.return;
        else ((e = J), (Qi = Zi = null), No(e), (La = null), (Ra = 0), (e = J));
        for (; e !== null;) (Vc(e.alternate, e), (e = e.return));
        J = null;
      }
    }
    function Cu(e, t) {
      var n = e.timeoutHandle;
      (n !== -1 && ((e.timeoutHandle = -1), Jd(n)),
        (n = e.cancelPendingCommit),
        n !== null && ((e.cancelPendingCommit = null), n()),
        (cu = 0),
        Su(),
        (q = e),
        (J = n = gi(e.current, null)),
        (Y = t),
        (X = 0),
        (Bl = null),
        (Vl = !1),
        (Hl = et(e, t)),
        (Ul = !1),
        (Xl = Yl = Jl = ql = Kl = Gl = 0),
        (Ql = Zl = null),
        ($l = !1),
        t & 8 && (t |= t & 32));
      var r = e.entangledLanes;
      if (r !== 0)
        for (e = e.entanglements, r &= t; 0 < r;) {
          var i = 31 - Ge(r),
            a = 1 << i;
          ((t |= e[i]), (r &= ~a));
        }
      return ((Wl = t), oi(), n);
    }
    function wu(e, t) {
      ((L = null),
        (E.H = U),
        t === Da || t === ka
          ? ((t = Fa()), (X = 3))
          : t === Oa
            ? ((t = Fa()), (X = 4))
            : (X = t === rc ? 8 : typeof t == `object` && t && typeof t.then == `function` ? 6 : 1),
        (Bl = t),
        J === null && ((Gl = 1), Zs(e, wi(t, e.current))));
    }
    function Tu() {
      var e = so.current;
      return e === null
        ? !0
        : (Y & 4194048) === Y
          ? co === null
          : (Y & 62914560) === Y || Y & 536870912
            ? e === co
            : !1;
    }
    function Eu() {
      var e = E.H;
      return ((E.H = U), e === null ? U : e);
    }
    function Du() {
      var e = E.A;
      return ((E.A = Rl), e);
    }
    function Ou() {
      ((Gl = 4),
        Vl || ((Y & 4194048) !== Y && so.current !== null) || (Hl = !0),
        (!(Kl & 134217727) && !(ql & 134217727)) || q === null || bu(q, Y, Yl, !1));
    }
    function ku(e, t, n) {
      var r = K;
      K |= 2;
      var i = Eu(),
        a = Du();
      ((q !== e || Y !== t) && ((ru = null), Cu(e, t)), (t = !1));
      var o = Gl;
      a: do
        try {
          if (X !== 0 && J !== null) {
            var s = J,
              c = Bl;
            switch (X) {
              case 8:
                (Su(), (o = 6));
                break a;
              case 3:
              case 2:
              case 9:
              case 6:
                so.current === null && (t = !0);
                var l = X;
                if (((X = 0), (Bl = null), Fu(e, s, c, l), n && Hl)) {
                  o = 0;
                  break a;
                }
                break;
              default:
                ((l = X), (X = 0), (Bl = null), Fu(e, s, c, l));
            }
          }
          (Au(), (o = Gl));
          break;
        } catch (t) {
          wu(e, t);
        }
      while (1);
      return (
        t && e.shellSuspendCounter++,
        (Qi = Zi = null),
        (K = r),
        (E.H = i),
        (E.A = a),
        J === null && ((q = null), (Y = 0), oi()),
        o
      );
    }
    function Au() {
      for (; J !== null;) Nu(J);
    }
    function ju(e, t) {
      var n = K;
      K |= 2;
      var r = Eu(),
        a = Du();
      q !== e || Y !== t ? ((ru = null), (nu = Ne() + 500), Cu(e, t)) : (Hl = et(e, t));
      a: do
        try {
          if (X !== 0 && J !== null) {
            t = J;
            var o = Bl;
            b: switch (X) {
              case 1:
                ((X = 0), (Bl = null), Fu(e, t, o, 1));
                break;
              case 2:
              case 9:
                if (ja(o)) {
                  ((X = 0), (Bl = null), Pu(t));
                  break;
                }
                ((t = function () {
                  ((X !== 2 && X !== 9) || q !== e || (X = 7), id(e));
                }),
                  o.then(t, t));
                break a;
              case 3:
                X = 7;
                break a;
              case 4:
                X = 5;
                break a;
              case 7:
                ja(o) ? ((X = 0), (Bl = null), Pu(t)) : ((X = 0), (Bl = null), Fu(e, t, o, 7));
                break;
              case 5:
                var s = null;
                switch (J.tag) {
                  case 26:
                    s = J.memoizedState;
                  case 5:
                  case 27:
                    var c = J;
                    if (s ? Gf(s) : c.stateNode.complete) {
                      ((X = 0), (Bl = null));
                      var l = c.sibling;
                      if (l !== null) J = l;
                      else {
                        var u = c.return;
                        u === null ? (J = null) : ((J = u), Iu(u));
                      }
                      break b;
                    }
                }
                ((X = 0), (Bl = null), Fu(e, t, o, 5));
                break;
              case 6:
                ((X = 0), (Bl = null), Fu(e, t, o, 6));
                break;
              case 8:
                (Su(), (Gl = 6));
                break a;
              default:
                throw Error(i(462));
            }
          }
          Mu();
          break;
        } catch (t) {
          wu(e, t);
        }
      while (1);
      return (
        (Qi = Zi = null),
        (E.H = r),
        (E.A = a),
        (K = n),
        J === null ? ((q = null), (Y = 0), oi(), Gl) : 0
      );
    }
    function Mu() {
      for (; J !== null && !je();) Nu(J);
    }
    function Nu(e) {
      var t = Nc(e.alternate, e, Wl);
      ((e.memoizedProps = e.pendingProps), t === null ? Iu(e) : (J = t));
    }
    function Pu(e) {
      var t = e,
        n = t.alternate;
      switch (t.tag) {
        case 15:
        case 0:
          t = _c(n, t, t.pendingProps, t.type, void 0, Y);
          break;
        case 11:
          t = _c(n, t, t.pendingProps, t.type.render, t.ref, Y);
          break;
        case 5:
          No(t);
        default:
          (Vc(n, t), (t = J = _i(t, Wl)), (t = Nc(n, t, Wl)));
      }
      ((e.memoizedProps = e.pendingProps), t === null ? Iu(e) : (J = t));
    }
    function Fu(e, t, n, r) {
      ((Qi = Zi = null), No(t), (La = null), (Ra = 0));
      var i = t.return;
      try {
        if (nc(e, i, t, n, Y)) {
          ((Gl = 1), Zs(e, wi(n, e.current)), (J = null));
          return;
        }
      } catch (t) {
        if (i !== null) throw ((J = i), t);
        ((Gl = 1), Zs(e, wi(n, e.current)), (J = null));
        return;
      }
      t.flags & 32768
        ? (F || r === 1
            ? (e = !0)
            : Hl || Y & 536870912
              ? (e = !1)
              : ((Vl = e = !0),
                (r === 2 || r === 9 || r === 3 || r === 6) &&
                  ((r = so.current), r !== null && r.tag === 13 && (r.flags |= 16384))),
          Lu(t, e))
        : Iu(t);
    }
    function Iu(e) {
      var t = e;
      do {
        if (t.flags & 32768) {
          Lu(t, Vl);
          return;
        }
        e = t.return;
        var n = zc(t.alternate, t, Wl);
        if (n !== null) {
          J = n;
          return;
        }
        if (((t = t.sibling), t !== null)) {
          J = t;
          return;
        }
        J = t = e;
      } while (t !== null);
      Gl === 0 && (Gl = 5);
    }
    function Lu(e, t) {
      do {
        var n = Bc(e.alternate, e);
        if (n !== null) {
          ((n.flags &= 32767), (J = n));
          return;
        }
        if (
          ((n = e.return),
          n !== null && ((n.flags |= 32768), (n.subtreeFlags = 0), (n.deletions = null)),
          !t && ((e = e.sibling), e !== null))
        ) {
          J = e;
          return;
        }
        J = e = n;
      } while (e !== null);
      ((Gl = 6), (J = null));
    }
    function Ru(e, t, n, r, a, o, s, c, l) {
      e.cancelPendingCommit = null;
      do Uu();
      while (au !== 0);
      if (K & 6) throw Error(i(327));
      if (t !== null) {
        if (t === e.current) throw Error(i(177));
        if (
          ((o = t.lanes | t.childLanes),
          (o |= ai),
          at(e, n, o, s, c, l),
          e === q && ((J = q = null), (Y = 0)),
          (su = t),
          (ou = e),
          (cu = n),
          (lu = o),
          (uu = a),
          (du = r),
          t.subtreeFlags & 10256 || t.flags & 10256
            ? ((e.callbackNode = null),
              (e.callbackPriority = 0),
              Zu(Le, function () {
                return (Wu(), null);
              }))
            : ((e.callbackNode = null), (e.callbackPriority = 0)),
          (r = (t.flags & 13878) != 0),
          t.subtreeFlags & 13878 || r)
        ) {
          ((r = E.T), (E.T = null), (a = D.p), (D.p = 2), (s = K), (K |= 4));
          try {
            ol(e, t, n);
          } finally {
            ((K = s), (D.p = a), (E.T = r));
          }
        }
        ((au = 1), zu(), Bu(), Vu());
      }
    }
    function zu() {
      if (au === 1) {
        au = 0;
        var e = ou,
          t = su,
          n = (t.flags & 13878) != 0;
        if (t.subtreeFlags & 13878 || n) {
          ((n = E.T), (E.T = null));
          var r = D.p;
          D.p = 2;
          var i = K;
          K |= 4;
          try {
            vl(t, e);
            var a = Bd,
              o = Nr(e.containerInfo),
              s = a.focusedElem,
              c = a.selectionRange;
            if (o !== s && s && s.ownerDocument && Mr(s.ownerDocument.documentElement, s)) {
              if (c !== null && Pr(s)) {
                var l = c.start,
                  u = c.end;
                if ((u === void 0 && (u = l), `selectionStart` in s))
                  ((s.selectionStart = l), (s.selectionEnd = Math.min(u, s.value.length)));
                else {
                  var d = s.ownerDocument || document,
                    f = (d && d.defaultView) || window;
                  if (f.getSelection) {
                    var p = f.getSelection(),
                      m = s.textContent.length,
                      h = Math.min(c.start, m),
                      g = c.end === void 0 ? h : Math.min(c.end, m);
                    !p.extend && h > g && ((o = g), (g = h), (h = o));
                    var _ = jr(s, h),
                      v = jr(s, g);
                    if (
                      _ &&
                      v &&
                      (p.rangeCount !== 1 ||
                        p.anchorNode !== _.node ||
                        p.anchorOffset !== _.offset ||
                        p.focusNode !== v.node ||
                        p.focusOffset !== v.offset)
                    ) {
                      var y = d.createRange();
                      (y.setStart(_.node, _.offset),
                        p.removeAllRanges(),
                        h > g
                          ? (p.addRange(y), p.extend(v.node, v.offset))
                          : (y.setEnd(v.node, v.offset), p.addRange(y)));
                    }
                  }
                }
              }
              for (d = [], p = s; (p = p.parentNode);)
                p.nodeType === 1 && d.push({ element: p, left: p.scrollLeft, top: p.scrollTop });
              for (typeof s.focus == `function` && s.focus(), s = 0; s < d.length; s++) {
                var b = d[s];
                ((b.element.scrollLeft = b.left), (b.element.scrollTop = b.top));
              }
            }
            ((cp = !!zd), (Bd = zd = null));
          } finally {
            ((K = i), (D.p = r), (E.T = n));
          }
        }
        ((e.current = t), (au = 2));
      }
    }
    function Bu() {
      if (au === 2) {
        au = 0;
        var e = ou,
          t = su,
          n = (t.flags & 8772) != 0;
        if (t.subtreeFlags & 8772 || n) {
          ((n = E.T), (E.T = null));
          var r = D.p;
          D.p = 2;
          var i = K;
          K |= 4;
          try {
            sl(e, t.alternate, t);
          } finally {
            ((K = i), (D.p = r), (E.T = n));
          }
        }
        au = 3;
      }
    }
    function Vu() {
      if (au === 4 || au === 3) {
        ((au = 0), Me());
        var e = ou,
          t = su,
          n = cu,
          r = du;
        t.subtreeFlags & 10256 || t.flags & 10256
          ? (au = 5)
          : ((au = 0), (su = ou = null), Hu(e, e.pendingLanes));
        var i = e.pendingLanes;
        if (
          (i === 0 && (iu = null),
          ut(n),
          (t = t.stateNode),
          Ue && typeof Ue.onCommitFiberRoot == `function`)
        )
          try {
            Ue.onCommitFiberRoot(He, t, void 0, (t.current.flags & 128) == 128);
          } catch {}
        if (r !== null) {
          ((t = E.T), (i = D.p), (D.p = 2), (E.T = null));
          try {
            for (var a = e.onRecoverableError, o = 0; o < r.length; o++) {
              var s = r[o];
              a(s.value, { componentStack: s.stack });
            }
          } finally {
            ((E.T = t), (D.p = i));
          }
        }
        (cu & 3 && Uu(),
          id(e),
          (i = e.pendingLanes),
          n & 261930 && i & 42 ? (e === pu ? fu++ : ((fu = 0), (pu = e))) : (fu = 0),
          ad(0, !1));
      }
    }
    function Hu(e, t) {
      (e.pooledCacheLanes &= t) === 0 &&
        ((t = e.pooledCache), t != null && ((e.pooledCache = null), ma(t)));
    }
    function Uu() {
      return (zu(), Bu(), Vu(), Wu());
    }
    function Wu() {
      if (au !== 5) return !1;
      var e = ou,
        t = lu;
      lu = 0;
      var n = ut(cu),
        r = E.T,
        a = D.p;
      try {
        ((D.p = 32 > n ? 32 : n), (E.T = null), (n = uu), (uu = null));
        var o = ou,
          s = cu;
        if (((au = 0), (su = ou = null), (cu = 0), K & 6)) throw Error(i(331));
        var c = K;
        if (
          ((K |= 4),
          Fl(o.current),
          Dl(o, o.current, s, n),
          (K = c),
          ad(0, !1),
          Ue && typeof Ue.onPostCommitFiberRoot == `function`)
        )
          try {
            Ue.onPostCommitFiberRoot(He, o);
          } catch {}
        return !0;
      } finally {
        ((D.p = a), (E.T = r), Hu(e, t));
      }
    }
    function Gu(e, t, n) {
      ((t = wi(n, t)),
        (t = $s(e.stateNode, t, 2)),
        (e = Ja(e, t, 2)),
        e !== null && (it(e, 2), id(e)));
    }
    function Z(e, t, n) {
      if (e.tag === 3) Gu(e, e, n);
      else
        for (; t !== null;) {
          if (t.tag === 3) {
            Gu(t, e, n);
            break;
          } else if (t.tag === 1) {
            var r = t.stateNode;
            if (
              typeof t.type.getDerivedStateFromError == `function` ||
              (typeof r.componentDidCatch == `function` && (iu === null || !iu.has(r)))
            ) {
              ((e = wi(n, e)),
                (n = ec(2)),
                (r = Ja(t, n, 2)),
                r !== null && (tc(n, r, t, e), it(r, 2), id(r)));
              break;
            }
          }
          t = t.return;
        }
    }
    function Ku(e, t, n) {
      var r = e.pingCache;
      if (r === null) {
        r = e.pingCache = new zl();
        var i = new Set();
        r.set(t, i);
      } else ((i = r.get(t)), i === void 0 && ((i = new Set()), r.set(t, i)));
      i.has(n) || ((Ul = !0), i.add(n), (e = qu.bind(null, e, t, n)), t.then(e, e));
    }
    function qu(e, t, n) {
      var r = e.pingCache;
      (r !== null && r.delete(t),
        (e.pingedLanes |= e.suspendedLanes & n),
        (e.warmLanes &= ~n),
        q === e &&
          (Y & n) === n &&
          (Gl === 4 || (Gl === 3 && (Y & 62914560) === Y && 300 > Ne() - eu)
            ? !(K & 2) && Cu(e, 0)
            : (Jl |= n),
          Xl === Y && (Xl = 0)),
        id(e));
    }
    function Ju(e, t) {
      (t === 0 && (t = nt()), (e = li(e, t)), e !== null && (it(e, t), id(e)));
    }
    function Yu(e) {
      var t = e.memoizedState,
        n = 0;
      (t !== null && (n = t.retryLane), Ju(e, n));
    }
    function Xu(e, t) {
      var n = 0;
      switch (e.tag) {
        case 31:
        case 13:
          var r = e.stateNode,
            a = e.memoizedState;
          a !== null && (n = a.retryLane);
          break;
        case 19:
          r = e.stateNode;
          break;
        case 22:
          r = e.stateNode._retryCache;
          break;
        default:
          throw Error(i(314));
      }
      (r !== null && r.delete(t), Ju(e, n));
    }
    function Zu(e, t) {
      return ke(e, t);
    }
    var Qu = null,
      $u = null,
      ed = !1,
      td = !1,
      nd = !1,
      rd = 0;
    function id(e) {
      (e !== $u && e.next === null && ($u === null ? (Qu = $u = e) : ($u = $u.next = e)),
        (td = !0),
        ed || ((ed = !0), dd()));
    }
    function ad(e, t) {
      if (!nd && td) {
        nd = !0;
        do
          for (var n = !1, r = Qu; r !== null;) {
            if (!t)
              if (e !== 0) {
                var i = r.pendingLanes;
                if (i === 0) var a = 0;
                else {
                  var o = r.suspendedLanes,
                    s = r.pingedLanes;
                  ((a = (1 << (31 - Ge(42 | e) + 1)) - 1),
                    (a &= i & ~(o & ~s)),
                    (a = a & 201326741 ? (a & 201326741) | 1 : a ? a | 2 : 0));
                }
                a !== 0 && ((n = !0), ud(r, a));
              } else
                ((a = Y),
                  (a = $e(
                    r,
                    r === q ? a : 0,
                    r.cancelPendingCommit !== null || r.timeoutHandle !== -1,
                  )),
                  !(a & 3) || et(r, a) || ((n = !0), ud(r, a)));
            r = r.next;
          }
        while (n);
        nd = !1;
      }
    }
    function od() {
      sd();
    }
    function sd() {
      td = ed = !1;
      var e = 0;
      rd !== 0 && Kd() && (e = rd);
      for (var t = Ne(), n = null, r = Qu; r !== null;) {
        var i = r.next,
          a = cd(r, t);
        (a === 0
          ? ((r.next = null), n === null ? (Qu = i) : (n.next = i), i === null && ($u = n))
          : ((n = r), (e !== 0 || a & 3) && (td = !0)),
          (r = i));
      }
      ((au !== 0 && au !== 5) || ad(e, !1), rd !== 0 && (rd = 0));
    }
    function cd(e, t) {
      for (
        var n = e.suspendedLanes,
          r = e.pingedLanes,
          i = e.expirationTimes,
          a = e.pendingLanes & -62914561;
        0 < a;
      ) {
        var o = 31 - Ge(a),
          s = 1 << o,
          c = i[o];
        (c === -1
          ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = tt(s, t))
          : c <= t && (e.expiredLanes |= s),
          (a &= ~s));
      }
      if (
        ((t = q),
        (n = Y),
        (n = $e(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1)),
        (r = e.callbackNode),
        n === 0 || (e === t && (X === 2 || X === 9)) || e.cancelPendingCommit !== null)
      )
        return (
          r !== null && r !== null && Ae(r),
          (e.callbackNode = null),
          (e.callbackPriority = 0)
        );
      if (!(n & 3) || et(e, n)) {
        if (((t = n & -n), t === e.callbackPriority)) return t;
        switch ((r !== null && Ae(r), ut(n))) {
          case 2:
          case 8:
            n = Ie;
            break;
          case 32:
            n = Le;
            break;
          case 268435456:
            n = ze;
            break;
          default:
            n = Le;
        }
        return (
          (r = ld.bind(null, e)),
          (n = ke(n, r)),
          (e.callbackPriority = t),
          (e.callbackNode = n),
          t
        );
      }
      return (
        r !== null && r !== null && Ae(r),
        (e.callbackPriority = 2),
        (e.callbackNode = null),
        2
      );
    }
    function ld(e, t) {
      if (au !== 0 && au !== 5) return ((e.callbackNode = null), (e.callbackPriority = 0), null);
      var n = e.callbackNode;
      if (Uu() && e.callbackNode !== n) return null;
      var r = Y;
      return (
        (r = $e(e, e === q ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1)),
        r === 0
          ? null
          : (_u(e, r, t),
            cd(e, Ne()),
            e.callbackNode != null && e.callbackNode === n ? ld.bind(null, e) : null)
      );
    }
    function ud(e, t) {
      if (Uu()) return null;
      _u(e, t, !0);
    }
    function dd() {
      Xd(function () {
        K & 6 ? ke(Fe, od) : sd();
      });
    }
    function fd() {
      if (rd === 0) {
        var e = _a;
        (e === 0 && ((e = Ye), (Ye <<= 1), !(Ye & 261888) && (Ye = 256)), (rd = e));
      }
      return rd;
    }
    function pd(e) {
      return e == null || typeof e == `symbol` || typeof e == `boolean`
        ? null
        : typeof e == `function`
          ? e
          : sn(`` + e);
    }
    function md(e, t) {
      var n = t.ownerDocument.createElement(`input`);
      return (
        (n.name = t.name),
        (n.value = t.value),
        e.id && n.setAttribute(`form`, e.id),
        t.parentNode.insertBefore(n, t),
        (e = new FormData(e)),
        n.parentNode.removeChild(n),
        e
      );
    }
    function hd(e, t, n, r, i) {
      if (t === `submit` && n && n.stateNode === i) {
        var a = pd((i[ht] || null).action),
          o = r.submitter;
        o &&
          ((t = (t = o[ht] || null) ? pd(t.formAction) : o.getAttribute(`formAction`)),
          t !== null && ((a = t), (o = null)));
        var s = new kn(`action`, `action`, null, r, i);
        e.push({
          event: s,
          listeners: [
            {
              instance: null,
              listener: function () {
                if (r.defaultPrevented) {
                  if (rd !== 0) {
                    var e = o ? md(i, o) : new FormData(i);
                    H(n, { pending: !0, data: e, method: i.method, action: a }, null, e);
                  }
                } else
                  typeof a == `function` &&
                    (s.preventDefault(),
                    (e = o ? md(i, o) : new FormData(i)),
                    H(n, { pending: !0, data: e, method: i.method, action: a }, a, e));
              },
              currentTarget: i,
            },
          ],
        });
      }
    }
    for (var gd = 0; gd < ei.length; gd++) {
      var _d = ei[gd];
      ti(_d.toLowerCase(), `on` + (_d[0].toUpperCase() + _d.slice(1)));
    }
    (ti(Kr, `onAnimationEnd`),
      ti(qr, `onAnimationIteration`),
      ti(Jr, `onAnimationStart`),
      ti(`dblclick`, `onDoubleClick`),
      ti(`focusin`, `onFocus`),
      ti(`focusout`, `onBlur`),
      ti(Yr, `onTransitionRun`),
      ti(Xr, `onTransitionStart`),
      ti(Zr, `onTransitionCancel`),
      ti(Qr, `onTransitionEnd`),
      jt(`onMouseEnter`, [`mouseout`, `mouseover`]),
      jt(`onMouseLeave`, [`mouseout`, `mouseover`]),
      jt(`onPointerEnter`, [`pointerout`, `pointerover`]),
      jt(`onPointerLeave`, [`pointerout`, `pointerover`]),
      At(
        `onChange`,
        `change click focusin focusout input keydown keyup selectionchange`.split(` `),
      ),
      At(
        `onSelect`,
        `focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange`.split(
          ` `,
        ),
      ),
      At(`onBeforeInput`, [`compositionend`, `keypress`, `textInput`, `paste`]),
      At(`onCompositionEnd`, `compositionend focusout keydown keypress keyup mousedown`.split(` `)),
      At(
        `onCompositionStart`,
        `compositionstart focusout keydown keypress keyup mousedown`.split(` `),
      ),
      At(
        `onCompositionUpdate`,
        `compositionupdate focusout keydown keypress keyup mousedown`.split(` `),
      ));
    var vd =
        `abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting`.split(
          ` `,
        ),
      yd = new Set(
        `beforetoggle cancel close invalid load scroll scrollend toggle`.split(` `).concat(vd),
      );
    function bd(e, t) {
      t = (t & 4) != 0;
      for (var n = 0; n < e.length; n++) {
        var r = e[n],
          i = r.event;
        r = r.listeners;
        a: {
          var a = void 0;
          if (t)
            for (var o = r.length - 1; 0 <= o; o--) {
              var s = r[o],
                c = s.instance,
                l = s.currentTarget;
              if (((s = s.listener), c !== a && i.isPropagationStopped())) break a;
              ((a = s), (i.currentTarget = l));
              try {
                a(i);
              } catch (e) {
                ni(e);
              }
              ((i.currentTarget = null), (a = c));
            }
          else
            for (o = 0; o < r.length; o++) {
              if (
                ((s = r[o]),
                (c = s.instance),
                (l = s.currentTarget),
                (s = s.listener),
                c !== a && i.isPropagationStopped())
              )
                break a;
              ((a = s), (i.currentTarget = l));
              try {
                a(i);
              } catch (e) {
                ni(e);
              }
              ((i.currentTarget = null), (a = c));
            }
        }
      }
    }
    function Q(e, t) {
      var n = t[_t];
      n === void 0 && (n = t[_t] = new Set());
      var r = e + `__bubble`;
      n.has(r) || (wd(t, e, 2, !1), n.add(r));
    }
    function xd(e, t, n) {
      var r = 0;
      (t && (r |= 4), wd(n, e, r, t));
    }
    var Sd = `_reactListening` + Math.random().toString(36).slice(2);
    function Cd(e) {
      if (!e[Sd]) {
        ((e[Sd] = !0),
          Ot.forEach(function (t) {
            t !== `selectionchange` && (yd.has(t) || xd(t, !1, e), xd(t, !0, e));
          }));
        var t = e.nodeType === 9 ? e : e.ownerDocument;
        t === null || t[Sd] || ((t[Sd] = !0), xd(`selectionchange`, !1, t));
      }
    }
    function wd(e, t, n, r) {
      switch (hp(t)) {
        case 2:
          var i = lp;
          break;
        case 8:
          i = up;
          break;
        default:
          i = dp;
      }
      ((n = i.bind(null, t, n, e)),
        (i = void 0),
        !vn || (t !== `touchstart` && t !== `touchmove` && t !== `wheel`) || (i = !0),
        r
          ? i === void 0
            ? e.addEventListener(t, n, !0)
            : e.addEventListener(t, n, { capture: !0, passive: i })
          : i === void 0
            ? e.addEventListener(t, n, !1)
            : e.addEventListener(t, n, { passive: i }));
    }
    function Td(e, t, n, r, i) {
      var a = r;
      if (!(t & 1) && !(t & 2) && r !== null)
        a: for (;;) {
          if (r === null) return;
          var o = r.tag;
          if (o === 3 || o === 4) {
            var s = r.stateNode.containerInfo;
            if (s === i) break;
            if (o === 4)
              for (o = r.return; o !== null;) {
                var l = o.tag;
                if ((l === 3 || l === 4) && o.stateNode.containerInfo === i) return;
                o = o.return;
              }
            for (; s !== null;) {
              if (((o = Ct(s)), o === null)) return;
              if (((l = o.tag), l === 5 || l === 6 || l === 26 || l === 27)) {
                r = a = o;
                continue a;
              }
              s = s.parentNode;
            }
          }
          r = r.return;
        }
      hn(function () {
        var r = a,
          i = un(n),
          o = [];
        a: {
          var s = $r.get(e);
          if (s !== void 0) {
            var l = kn,
              u = e;
            switch (e) {
              case `keypress`:
                if (wn(n) === 0) break a;
              case `keydown`:
              case `keyup`:
                l = qn;
                break;
              case `focusin`:
                ((u = `focus`), (l = Rn));
                break;
              case `focusout`:
                ((u = `blur`), (l = Rn));
                break;
              case `beforeblur`:
              case `afterblur`:
                l = Rn;
                break;
              case `click`:
                if (n.button === 2) break a;
              case `auxclick`:
              case `dblclick`:
              case `mousedown`:
              case `mousemove`:
              case `mouseup`:
              case `mouseout`:
              case `mouseover`:
              case `contextmenu`:
                l = In;
                break;
              case `drag`:
              case `dragend`:
              case `dragenter`:
              case `dragexit`:
              case `dragleave`:
              case `dragover`:
              case `dragstart`:
              case `drop`:
                l = Ln;
                break;
              case `touchcancel`:
              case `touchend`:
              case `touchmove`:
              case `touchstart`:
                l = Yn;
                break;
              case Kr:
              case qr:
              case Jr:
                l = zn;
                break;
              case Qr:
                l = Xn;
                break;
              case `scroll`:
              case `scrollend`:
                l = jn;
                break;
              case `wheel`:
                l = Zn;
                break;
              case `copy`:
              case `cut`:
              case `paste`:
                l = Bn;
                break;
              case `gotpointercapture`:
              case `lostpointercapture`:
              case `pointercancel`:
              case `pointerdown`:
              case `pointermove`:
              case `pointerout`:
              case `pointerover`:
              case `pointerup`:
                l = Jn;
                break;
              case `toggle`:
              case `beforetoggle`:
                l = Qn;
            }
            var d = (t & 4) != 0,
              f = !d && (e === `scroll` || e === `scrollend`),
              p = d ? (s === null ? null : s + `Capture`) : s;
            d = [];
            for (var m = r, h; m !== null;) {
              var g = m;
              if (
                ((h = g.stateNode),
                (g = g.tag),
                (g !== 5 && g !== 26 && g !== 27) ||
                  h === null ||
                  p === null ||
                  ((g = gn(m, p)), g != null && d.push(Ed(m, g, h))),
                f)
              )
                break;
              m = m.return;
            }
            0 < d.length && ((s = new l(s, u, null, n, i)), o.push({ event: s, listeners: d }));
          }
        }
        if (!(t & 7)) {
          a: {
            if (
              ((s = e === `mouseover` || e === `pointerover`),
              (l = e === `mouseout` || e === `pointerout`),
              s && n !== ln && (u = n.relatedTarget || n.fromElement) && (Ct(u) || u[gt]))
            )
              break a;
            if (
              (l || s) &&
              ((s =
                i.window === i
                  ? i
                  : (s = i.ownerDocument)
                    ? s.defaultView || s.parentWindow
                    : window),
              l
                ? ((u = n.relatedTarget || n.toElement),
                  (l = r),
                  (u = u ? Ct(u) : null),
                  u !== null &&
                    ((f = c(u)), (d = u.tag), u !== f || (d !== 5 && d !== 27 && d !== 6)) &&
                    (u = null))
                : ((l = null), (u = r)),
              l !== u)
            ) {
              if (
                ((d = In),
                (g = `onMouseLeave`),
                (p = `onMouseEnter`),
                (m = `mouse`),
                (e === `pointerout` || e === `pointerover`) &&
                  ((d = Jn), (g = `onPointerLeave`), (p = `onPointerEnter`), (m = `pointer`)),
                (f = l == null ? s : Tt(l)),
                (h = u == null ? s : Tt(u)),
                (s = new d(g, m + `leave`, l, n, i)),
                (s.target = f),
                (s.relatedTarget = h),
                (g = null),
                Ct(i) === r &&
                  ((d = new d(p, m + `enter`, u, n, i)),
                  (d.target = h),
                  (d.relatedTarget = f),
                  (g = d)),
                (f = g),
                l && u)
              )
                b: {
                  for (d = Od, p = l, m = u, h = 0, g = p; g; g = d(g)) h++;
                  g = 0;
                  for (var _ = m; _; _ = d(_)) g++;
                  for (; 0 < h - g;) ((p = d(p)), h--);
                  for (; 0 < g - h;) ((m = d(m)), g--);
                  for (; h--;) {
                    if (p === m || (m !== null && p === m.alternate)) {
                      d = p;
                      break b;
                    }
                    ((p = d(p)), (m = d(m)));
                  }
                  d = null;
                }
              else d = null;
              (l !== null && kd(o, s, l, d, !1), u !== null && f !== null && kd(o, f, u, d, !0));
            }
          }
          a: {
            if (
              ((s = r ? Tt(r) : window),
              (l = s.nodeName && s.nodeName.toLowerCase()),
              l === `select` || (l === `input` && s.type === `file`))
            )
              var v = N;
            else if (fr(s))
              if (_r) v = Er;
              else {
                v = wr;
                var y = Cr;
              }
            else
              ((l = s.nodeName),
                !l || l.toLowerCase() !== `input` || (s.type !== `checkbox` && s.type !== `radio`)
                  ? r && rn(r.elementType) && (v = N)
                  : (v = Tr));
            if ((v &&= v(e, r))) {
              pr(o, v, n, i);
              break a;
            }
            (y && y(e, s, r),
              e === `focusout` &&
                r &&
                s.type === `number` &&
                r.memoizedProps.value != null &&
                Yt(s, `number`, s.value));
          }
          switch (((y = r ? Tt(r) : window), e)) {
            case `focusin`:
              (fr(y) || y.contentEditable === `true`) && ((Ir = y), (Lr = r), (Rr = null));
              break;
            case `focusout`:
              Rr = Lr = Ir = null;
              break;
            case `mousedown`:
              zr = !0;
              break;
            case `contextmenu`:
            case `mouseup`:
            case `dragend`:
              ((zr = !1), Br(o, n, i));
              break;
            case `selectionchange`:
              if (Fr) break;
            case `keydown`:
            case `keyup`:
              Br(o, n, i);
          }
          var b;
          if (er)
            b: {
              switch (e) {
                case `compositionstart`:
                  var x = `onCompositionStart`;
                  break b;
                case `compositionend`:
                  x = `onCompositionEnd`;
                  break b;
                case `compositionupdate`:
                  x = `onCompositionUpdate`;
                  break b;
              }
              x = void 0;
            }
          else
            cr
              ? or(e, n) && (x = `onCompositionEnd`)
              : e === `keydown` && n.keyCode === 229 && (x = `onCompositionStart`);
          (x &&
            (rr &&
              n.locale !== `ko` &&
              (cr || x !== `onCompositionStart`
                ? x === `onCompositionEnd` && cr && (b = Cn())
                : ((bn = i), (xn = `value` in bn ? bn.value : bn.textContent), (cr = !0))),
            (y = Dd(r, x)),
            0 < y.length &&
              ((x = new Vn(x, e, null, n, i)),
              o.push({ event: x, listeners: y }),
              b ? (x.data = b) : ((b = sr(n)), b !== null && (x.data = b)))),
            (b = nr ? lr(e, n) : ur(e, n)) &&
              ((x = Dd(r, `onBeforeInput`)),
              0 < x.length &&
                ((y = new Vn(`onBeforeInput`, `beforeinput`, null, n, i)),
                o.push({ event: y, listeners: x }),
                (y.data = b))),
            hd(o, e, r, n, i));
        }
        bd(o, t);
      });
    }
    function Ed(e, t, n) {
      return { instance: e, listener: t, currentTarget: n };
    }
    function Dd(e, t) {
      for (var n = t + `Capture`, r = []; e !== null;) {
        var i = e,
          a = i.stateNode;
        if (
          ((i = i.tag),
          (i !== 5 && i !== 26 && i !== 27) ||
            a === null ||
            ((i = gn(e, n)),
            i != null && r.unshift(Ed(e, i, a)),
            (i = gn(e, t)),
            i != null && r.push(Ed(e, i, a))),
          e.tag === 3)
        )
          return r;
        e = e.return;
      }
      return [];
    }
    function Od(e) {
      if (e === null) return null;
      do e = e.return;
      while (e && e.tag !== 5 && e.tag !== 27);
      return e || null;
    }
    function kd(e, t, n, r, i) {
      for (var a = t._reactName, o = []; n !== null && n !== r;) {
        var s = n,
          c = s.alternate,
          l = s.stateNode;
        if (((s = s.tag), c !== null && c === r)) break;
        ((s !== 5 && s !== 26 && s !== 27) ||
          l === null ||
          ((c = l),
          i
            ? ((l = gn(n, a)), l != null && o.unshift(Ed(n, l, c)))
            : i || ((l = gn(n, a)), l != null && o.push(Ed(n, l, c)))),
          (n = n.return));
      }
      o.length !== 0 && e.push({ event: t, listeners: o });
    }
    var Ad = /\r\n?/g,
      jd = /\u0000|\uFFFD/g;
    function Md(e) {
      return (typeof e == `string` ? e : `` + e)
        .replace(
          Ad,
          `
`,
        )
        .replace(jd, ``);
    }
    function Nd(e, t) {
      return ((t = Md(t)), Md(e) === t);
    }
    function $(e, t, n, r, a, o) {
      switch (n) {
        case `children`:
          typeof r == `string`
            ? t === `body` || (t === `textarea` && r === ``) || $t(e, r)
            : (typeof r == `number` || typeof r == `bigint`) && t !== `body` && $t(e, `` + r);
          break;
        case `className`:
          Lt(e, `class`, r);
          break;
        case `tabIndex`:
          Lt(e, `tabindex`, r);
          break;
        case `dir`:
        case `role`:
        case `viewBox`:
        case `width`:
        case `height`:
          Lt(e, n, r);
          break;
        case `style`:
          nn(e, r, o);
          break;
        case `data`:
          if (t !== `object`) {
            Lt(e, `data`, r);
            break;
          }
        case `src`:
        case `href`:
          if (r === `` && (t !== `a` || n !== `href`)) {
            e.removeAttribute(n);
            break;
          }
          if (
            r == null ||
            typeof r == `function` ||
            typeof r == `symbol` ||
            typeof r == `boolean`
          ) {
            e.removeAttribute(n);
            break;
          }
          ((r = sn(`` + r)), e.setAttribute(n, r));
          break;
        case `action`:
        case `formAction`:
          if (typeof r == `function`) {
            e.setAttribute(
              n,
              `javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')`,
            );
            break;
          } else
            typeof o == `function` &&
              (n === `formAction`
                ? (t !== `input` && $(e, t, `name`, a.name, a, null),
                  $(e, t, `formEncType`, a.formEncType, a, null),
                  $(e, t, `formMethod`, a.formMethod, a, null),
                  $(e, t, `formTarget`, a.formTarget, a, null))
                : ($(e, t, `encType`, a.encType, a, null),
                  $(e, t, `method`, a.method, a, null),
                  $(e, t, `target`, a.target, a, null)));
          if (r == null || typeof r == `symbol` || typeof r == `boolean`) {
            e.removeAttribute(n);
            break;
          }
          ((r = sn(`` + r)), e.setAttribute(n, r));
          break;
        case `onClick`:
          r != null && (e.onclick = cn);
          break;
        case `onScroll`:
          r != null && Q(`scroll`, e);
          break;
        case `onScrollEnd`:
          r != null && Q(`scrollend`, e);
          break;
        case `dangerouslySetInnerHTML`:
          if (r != null) {
            if (typeof r != `object` || !(`__html` in r)) throw Error(i(61));
            if (((n = r.__html), n != null)) {
              if (a.children != null) throw Error(i(60));
              e.innerHTML = n;
            }
          }
          break;
        case `multiple`:
          e.multiple = r && typeof r != `function` && typeof r != `symbol`;
          break;
        case `muted`:
          e.muted = r && typeof r != `function` && typeof r != `symbol`;
          break;
        case `suppressContentEditableWarning`:
        case `suppressHydrationWarning`:
        case `defaultValue`:
        case `defaultChecked`:
        case `innerHTML`:
        case `ref`:
          break;
        case `autoFocus`:
          break;
        case `xlinkHref`:
          if (
            r == null ||
            typeof r == `function` ||
            typeof r == `boolean` ||
            typeof r == `symbol`
          ) {
            e.removeAttribute(`xlink:href`);
            break;
          }
          ((n = sn(`` + r)), e.setAttributeNS(`http://www.w3.org/1999/xlink`, `xlink:href`, n));
          break;
        case `contentEditable`:
        case `spellCheck`:
        case `draggable`:
        case `value`:
        case `autoReverse`:
        case `externalResourcesRequired`:
        case `focusable`:
        case `preserveAlpha`:
          r != null && typeof r != `function` && typeof r != `symbol`
            ? e.setAttribute(n, `` + r)
            : e.removeAttribute(n);
          break;
        case `inert`:
        case `allowFullScreen`:
        case `async`:
        case `autoPlay`:
        case `controls`:
        case `default`:
        case `defer`:
        case `disabled`:
        case `disablePictureInPicture`:
        case `disableRemotePlayback`:
        case `formNoValidate`:
        case `hidden`:
        case `loop`:
        case `noModule`:
        case `noValidate`:
        case `open`:
        case `playsInline`:
        case `readOnly`:
        case `required`:
        case `reversed`:
        case `scoped`:
        case `seamless`:
        case `itemScope`:
          r && typeof r != `function` && typeof r != `symbol`
            ? e.setAttribute(n, ``)
            : e.removeAttribute(n);
          break;
        case `capture`:
        case `download`:
          !0 === r
            ? e.setAttribute(n, ``)
            : !1 !== r && r != null && typeof r != `function` && typeof r != `symbol`
              ? e.setAttribute(n, r)
              : e.removeAttribute(n);
          break;
        case `cols`:
        case `rows`:
        case `size`:
        case `span`:
          r != null && typeof r != `function` && typeof r != `symbol` && !isNaN(r) && 1 <= r
            ? e.setAttribute(n, r)
            : e.removeAttribute(n);
          break;
        case `rowSpan`:
        case `start`:
          r == null || typeof r == `function` || typeof r == `symbol` || isNaN(r)
            ? e.removeAttribute(n)
            : e.setAttribute(n, r);
          break;
        case `popover`:
          (Q(`beforetoggle`, e), Q(`toggle`, e), It(e, `popover`, r));
          break;
        case `xlinkActuate`:
          Rt(e, `http://www.w3.org/1999/xlink`, `xlink:actuate`, r);
          break;
        case `xlinkArcrole`:
          Rt(e, `http://www.w3.org/1999/xlink`, `xlink:arcrole`, r);
          break;
        case `xlinkRole`:
          Rt(e, `http://www.w3.org/1999/xlink`, `xlink:role`, r);
          break;
        case `xlinkShow`:
          Rt(e, `http://www.w3.org/1999/xlink`, `xlink:show`, r);
          break;
        case `xlinkTitle`:
          Rt(e, `http://www.w3.org/1999/xlink`, `xlink:title`, r);
          break;
        case `xlinkType`:
          Rt(e, `http://www.w3.org/1999/xlink`, `xlink:type`, r);
          break;
        case `xmlBase`:
          Rt(e, `http://www.w3.org/XML/1998/namespace`, `xml:base`, r);
          break;
        case `xmlLang`:
          Rt(e, `http://www.w3.org/XML/1998/namespace`, `xml:lang`, r);
          break;
        case `xmlSpace`:
          Rt(e, `http://www.w3.org/XML/1998/namespace`, `xml:space`, r);
          break;
        case `is`:
          It(e, `is`, r);
          break;
        case `innerText`:
        case `textContent`:
          break;
        default:
          (!(2 < n.length) || (n[0] !== `o` && n[0] !== `O`) || (n[1] !== `n` && n[1] !== `N`)) &&
            ((n = an.get(n) || n), It(e, n, r));
      }
    }
    function Pd(e, t, n, r, a, o) {
      switch (n) {
        case `style`:
          nn(e, r, o);
          break;
        case `dangerouslySetInnerHTML`:
          if (r != null) {
            if (typeof r != `object` || !(`__html` in r)) throw Error(i(61));
            if (((n = r.__html), n != null)) {
              if (a.children != null) throw Error(i(60));
              e.innerHTML = n;
            }
          }
          break;
        case `children`:
          typeof r == `string`
            ? $t(e, r)
            : (typeof r == `number` || typeof r == `bigint`) && $t(e, `` + r);
          break;
        case `onScroll`:
          r != null && Q(`scroll`, e);
          break;
        case `onScrollEnd`:
          r != null && Q(`scrollend`, e);
          break;
        case `onClick`:
          r != null && (e.onclick = cn);
          break;
        case `suppressContentEditableWarning`:
        case `suppressHydrationWarning`:
        case `innerHTML`:
        case `ref`:
          break;
        case `innerText`:
        case `textContent`:
          break;
        default:
          if (!kt.hasOwnProperty(n))
            a: {
              if (
                n[0] === `o` &&
                n[1] === `n` &&
                ((a = n.endsWith(`Capture`)),
                (t = n.slice(2, a ? n.length - 7 : void 0)),
                (o = e[ht] || null),
                (o = o == null ? null : o[n]),
                typeof o == `function` && e.removeEventListener(t, o, a),
                typeof r == `function`)
              ) {
                (typeof o != `function` &&
                  o !== null &&
                  (n in e ? (e[n] = null) : e.hasAttribute(n) && e.removeAttribute(n)),
                  e.addEventListener(t, r, a));
                break a;
              }
              n in e ? (e[n] = r) : !0 === r ? e.setAttribute(n, ``) : It(e, n, r);
            }
      }
    }
    function Fd(e, t, n) {
      switch (t) {
        case `div`:
        case `span`:
        case `svg`:
        case `path`:
        case `a`:
        case `g`:
        case `p`:
        case `li`:
          break;
        case `img`:
          (Q(`error`, e), Q(`load`, e));
          var r = !1,
            a = !1,
            o;
          for (o in n)
            if (n.hasOwnProperty(o)) {
              var s = n[o];
              if (s != null)
                switch (o) {
                  case `src`:
                    r = !0;
                    break;
                  case `srcSet`:
                    a = !0;
                    break;
                  case `children`:
                  case `dangerouslySetInnerHTML`:
                    throw Error(i(137, t));
                  default:
                    $(e, t, o, s, n, null);
                }
            }
          (a && $(e, t, `srcSet`, n.srcSet, n, null), r && $(e, t, `src`, n.src, n, null));
          return;
        case `input`:
          Q(`invalid`, e);
          var c = (o = s = a = null),
            l = null,
            u = null;
          for (r in n)
            if (n.hasOwnProperty(r)) {
              var d = n[r];
              if (d != null)
                switch (r) {
                  case `name`:
                    a = d;
                    break;
                  case `type`:
                    s = d;
                    break;
                  case `checked`:
                    l = d;
                    break;
                  case `defaultChecked`:
                    u = d;
                    break;
                  case `value`:
                    o = d;
                    break;
                  case `defaultValue`:
                    c = d;
                    break;
                  case `children`:
                  case `dangerouslySetInnerHTML`:
                    if (d != null) throw Error(i(137, t));
                    break;
                  default:
                    $(e, t, r, d, n, null);
                }
            }
          Jt(e, o, c, l, u, s, a, !1);
          return;
        case `select`:
          for (a in (Q(`invalid`, e), (r = s = o = null), n))
            if (n.hasOwnProperty(a) && ((c = n[a]), c != null))
              switch (a) {
                case `value`:
                  o = c;
                  break;
                case `defaultValue`:
                  s = c;
                  break;
                case `multiple`:
                  r = c;
                default:
                  $(e, t, a, c, n, null);
              }
          ((t = o),
            (n = s),
            (e.multiple = !!r),
            t == null ? n != null && Xt(e, !!r, n, !0) : Xt(e, !!r, t, !1));
          return;
        case `textarea`:
          for (s in (Q(`invalid`, e), (o = a = r = null), n))
            if (n.hasOwnProperty(s) && ((c = n[s]), c != null))
              switch (s) {
                case `value`:
                  r = c;
                  break;
                case `defaultValue`:
                  a = c;
                  break;
                case `children`:
                  o = c;
                  break;
                case `dangerouslySetInnerHTML`:
                  if (c != null) throw Error(i(91));
                  break;
                default:
                  $(e, t, s, c, n, null);
              }
          Qt(e, r, a, o);
          return;
        case `option`:
          for (l in n)
            if (n.hasOwnProperty(l) && ((r = n[l]), r != null))
              switch (l) {
                case `selected`:
                  e.selected = r && typeof r != `function` && typeof r != `symbol`;
                  break;
                default:
                  $(e, t, l, r, n, null);
              }
          return;
        case `dialog`:
          (Q(`beforetoggle`, e), Q(`toggle`, e), Q(`cancel`, e), Q(`close`, e));
          break;
        case `iframe`:
        case `object`:
          Q(`load`, e);
          break;
        case `video`:
        case `audio`:
          for (r = 0; r < vd.length; r++) Q(vd[r], e);
          break;
        case `image`:
          (Q(`error`, e), Q(`load`, e));
          break;
        case `details`:
          Q(`toggle`, e);
          break;
        case `embed`:
        case `source`:
        case `link`:
          (Q(`error`, e), Q(`load`, e));
        case `area`:
        case `base`:
        case `br`:
        case `col`:
        case `hr`:
        case `keygen`:
        case `meta`:
        case `param`:
        case `track`:
        case `wbr`:
        case `menuitem`:
          for (u in n)
            if (n.hasOwnProperty(u) && ((r = n[u]), r != null))
              switch (u) {
                case `children`:
                case `dangerouslySetInnerHTML`:
                  throw Error(i(137, t));
                default:
                  $(e, t, u, r, n, null);
              }
          return;
        default:
          if (rn(t)) {
            for (d in n)
              n.hasOwnProperty(d) && ((r = n[d]), r !== void 0 && Pd(e, t, d, r, n, void 0));
            return;
          }
      }
      for (c in n) n.hasOwnProperty(c) && ((r = n[c]), r != null && $(e, t, c, r, n, null));
    }
    function Id(e, t, n, r) {
      switch (t) {
        case `div`:
        case `span`:
        case `svg`:
        case `path`:
        case `a`:
        case `g`:
        case `p`:
        case `li`:
          break;
        case `input`:
          var a = null,
            o = null,
            s = null,
            c = null,
            l = null,
            u = null,
            d = null;
          for (m in n) {
            var f = n[m];
            if (n.hasOwnProperty(m) && f != null)
              switch (m) {
                case `checked`:
                  break;
                case `value`:
                  break;
                case `defaultValue`:
                  l = f;
                default:
                  r.hasOwnProperty(m) || $(e, t, m, null, r, f);
              }
          }
          for (var p in r) {
            var m = r[p];
            if (((f = n[p]), r.hasOwnProperty(p) && (m != null || f != null)))
              switch (p) {
                case `type`:
                  o = m;
                  break;
                case `name`:
                  a = m;
                  break;
                case `checked`:
                  u = m;
                  break;
                case `defaultChecked`:
                  d = m;
                  break;
                case `value`:
                  s = m;
                  break;
                case `defaultValue`:
                  c = m;
                  break;
                case `children`:
                case `dangerouslySetInnerHTML`:
                  if (m != null) throw Error(i(137, t));
                  break;
                default:
                  m !== f && $(e, t, p, m, r, f);
              }
          }
          qt(e, s, c, l, u, d, o, a);
          return;
        case `select`:
          for (o in ((m = s = c = p = null), n))
            if (((l = n[o]), n.hasOwnProperty(o) && l != null))
              switch (o) {
                case `value`:
                  break;
                case `multiple`:
                  m = l;
                default:
                  r.hasOwnProperty(o) || $(e, t, o, null, r, l);
              }
          for (a in r)
            if (((o = r[a]), (l = n[a]), r.hasOwnProperty(a) && (o != null || l != null)))
              switch (a) {
                case `value`:
                  p = o;
                  break;
                case `defaultValue`:
                  c = o;
                  break;
                case `multiple`:
                  s = o;
                default:
                  o !== l && $(e, t, a, o, r, l);
              }
          ((t = c),
            (n = s),
            (r = m),
            p == null
              ? !!r != !!n && (t == null ? Xt(e, !!n, n ? [] : ``, !1) : Xt(e, !!n, t, !0))
              : Xt(e, !!n, p, !1));
          return;
        case `textarea`:
          for (c in ((m = p = null), n))
            if (((a = n[c]), n.hasOwnProperty(c) && a != null && !r.hasOwnProperty(c)))
              switch (c) {
                case `value`:
                  break;
                case `children`:
                  break;
                default:
                  $(e, t, c, null, r, a);
              }
          for (s in r)
            if (((a = r[s]), (o = n[s]), r.hasOwnProperty(s) && (a != null || o != null)))
              switch (s) {
                case `value`:
                  p = a;
                  break;
                case `defaultValue`:
                  m = a;
                  break;
                case `children`:
                  break;
                case `dangerouslySetInnerHTML`:
                  if (a != null) throw Error(i(91));
                  break;
                default:
                  a !== o && $(e, t, s, a, r, o);
              }
          Zt(e, p, m);
          return;
        case `option`:
          for (var h in n)
            if (((p = n[h]), n.hasOwnProperty(h) && p != null && !r.hasOwnProperty(h)))
              switch (h) {
                case `selected`:
                  e.selected = !1;
                  break;
                default:
                  $(e, t, h, null, r, p);
              }
          for (l in r)
            if (
              ((p = r[l]), (m = n[l]), r.hasOwnProperty(l) && p !== m && (p != null || m != null))
            )
              switch (l) {
                case `selected`:
                  e.selected = p && typeof p != `function` && typeof p != `symbol`;
                  break;
                default:
                  $(e, t, l, p, r, m);
              }
          return;
        case `img`:
        case `link`:
        case `area`:
        case `base`:
        case `br`:
        case `col`:
        case `embed`:
        case `hr`:
        case `keygen`:
        case `meta`:
        case `param`:
        case `source`:
        case `track`:
        case `wbr`:
        case `menuitem`:
          for (var g in n)
            ((p = n[g]),
              n.hasOwnProperty(g) && p != null && !r.hasOwnProperty(g) && $(e, t, g, null, r, p));
          for (u in r)
            if (
              ((p = r[u]), (m = n[u]), r.hasOwnProperty(u) && p !== m && (p != null || m != null))
            )
              switch (u) {
                case `children`:
                case `dangerouslySetInnerHTML`:
                  if (p != null) throw Error(i(137, t));
                  break;
                default:
                  $(e, t, u, p, r, m);
              }
          return;
        default:
          if (rn(t)) {
            for (var _ in n)
              ((p = n[_]),
                n.hasOwnProperty(_) &&
                  p !== void 0 &&
                  !r.hasOwnProperty(_) &&
                  Pd(e, t, _, void 0, r, p));
            for (d in r)
              ((p = r[d]),
                (m = n[d]),
                !r.hasOwnProperty(d) ||
                  p === m ||
                  (p === void 0 && m === void 0) ||
                  Pd(e, t, d, p, r, m));
            return;
          }
      }
      for (var v in n)
        ((p = n[v]),
          n.hasOwnProperty(v) && p != null && !r.hasOwnProperty(v) && $(e, t, v, null, r, p));
      for (f in r)
        ((p = r[f]),
          (m = n[f]),
          !r.hasOwnProperty(f) || p === m || (p == null && m == null) || $(e, t, f, p, r, m));
    }
    function Ld(e) {
      switch (e) {
        case `css`:
        case `script`:
        case `font`:
        case `img`:
        case `image`:
        case `input`:
        case `link`:
          return !0;
        default:
          return !1;
      }
    }
    function Rd() {
      if (typeof performance.getEntriesByType == `function`) {
        for (
          var e = 0, t = 0, n = performance.getEntriesByType(`resource`), r = 0;
          r < n.length;
          r++
        ) {
          var i = n[r],
            a = i.transferSize,
            o = i.initiatorType,
            s = i.duration;
          if (a && s && Ld(o)) {
            for (o = 0, s = i.responseEnd, r += 1; r < n.length; r++) {
              var c = n[r],
                l = c.startTime;
              if (l > s) break;
              var u = c.transferSize,
                d = c.initiatorType;
              u && Ld(d) && ((c = c.responseEnd), (o += u * (c < s ? 1 : (s - l) / (c - l))));
            }
            if ((--r, (t += (8 * (a + o)) / (i.duration / 1e3)), e++, 10 < e)) break;
          }
        }
        if (0 < e) return t / e / 1e6;
      }
      return navigator.connection && ((e = navigator.connection.downlink), typeof e == `number`)
        ? e
        : 5;
    }
    var zd = null,
      Bd = null;
    function Vd(e) {
      return e.nodeType === 9 ? e : e.ownerDocument;
    }
    function Hd(e) {
      switch (e) {
        case `http://www.w3.org/2000/svg`:
          return 1;
        case `http://www.w3.org/1998/Math/MathML`:
          return 2;
        default:
          return 0;
      }
    }
    function Ud(e, t) {
      if (e === 0)
        switch (t) {
          case `svg`:
            return 1;
          case `math`:
            return 2;
          default:
            return 0;
        }
      return e === 1 && t === `foreignObject` ? 0 : e;
    }
    function Wd(e, t) {
      return (
        e === `textarea` ||
        e === `noscript` ||
        typeof t.children == `string` ||
        typeof t.children == `number` ||
        typeof t.children == `bigint` ||
        (typeof t.dangerouslySetInnerHTML == `object` &&
          t.dangerouslySetInnerHTML !== null &&
          t.dangerouslySetInnerHTML.__html != null)
      );
    }
    var Gd = null;
    function Kd() {
      var e = window.event;
      return e && e.type === `popstate` ? (e === Gd ? !1 : ((Gd = e), !0)) : ((Gd = null), !1);
    }
    var qd = typeof setTimeout == `function` ? setTimeout : void 0,
      Jd = typeof clearTimeout == `function` ? clearTimeout : void 0,
      Yd = typeof Promise == `function` ? Promise : void 0,
      Xd =
        typeof queueMicrotask == `function`
          ? queueMicrotask
          : Yd === void 0
            ? qd
            : function (e) {
                return Yd.resolve(null).then(e).catch(Zd);
              };
    function Zd(e) {
      setTimeout(function () {
        throw e;
      });
    }
    function Qd(e) {
      return e === `head`;
    }
    function $d(e, t) {
      var n = t,
        r = 0;
      do {
        var i = n.nextSibling;
        if ((e.removeChild(n), i && i.nodeType === 8))
          if (((n = i.data), n === `/$` || n === `/&`)) {
            if (r === 0) {
              (e.removeChild(i), Pp(t));
              return;
            }
            r--;
          } else if (n === `$` || n === `$?` || n === `$~` || n === `$!` || n === `&`) r++;
          else if (n === `html`) mf(e.ownerDocument.documentElement);
          else if (n === `head`) {
            ((n = e.ownerDocument.head), mf(n));
            for (var a = n.firstChild; a;) {
              var o = a.nextSibling,
                s = a.nodeName;
              (a[xt] ||
                s === `SCRIPT` ||
                s === `STYLE` ||
                (s === `LINK` && a.rel.toLowerCase() === `stylesheet`) ||
                n.removeChild(a),
                (a = o));
            }
          } else n === `body` && mf(e.ownerDocument.body);
        n = i;
      } while (n);
      Pp(t);
    }
    function ef(e, t) {
      var n = e;
      e = 0;
      do {
        var r = n.nextSibling;
        if (
          (n.nodeType === 1
            ? t
              ? ((n._stashedDisplay = n.style.display), (n.style.display = `none`))
              : ((n.style.display = n._stashedDisplay || ``),
                n.getAttribute(`style`) === `` && n.removeAttribute(`style`))
            : n.nodeType === 3 &&
              (t
                ? ((n._stashedText = n.nodeValue), (n.nodeValue = ``))
                : (n.nodeValue = n._stashedText || ``)),
          r && r.nodeType === 8)
        )
          if (((n = r.data), n === `/$`)) {
            if (e === 0) break;
            e--;
          } else (n !== `$` && n !== `$?` && n !== `$~` && n !== `$!`) || e++;
        n = r;
      } while (n);
    }
    function tf(e) {
      var t = e.firstChild;
      for (t && t.nodeType === 10 && (t = t.nextSibling); t;) {
        var n = t;
        switch (((t = t.nextSibling), n.nodeName)) {
          case `HTML`:
          case `HEAD`:
          case `BODY`:
            (tf(n), St(n));
            continue;
          case `SCRIPT`:
          case `STYLE`:
            continue;
          case `LINK`:
            if (n.rel.toLowerCase() === `stylesheet`) continue;
        }
        e.removeChild(n);
      }
    }
    function nf(e, t, n, r) {
      for (; e.nodeType === 1;) {
        var i = n;
        if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
          if (!r && (e.nodeName !== `INPUT` || e.type !== `hidden`)) break;
        } else if (!r)
          if (t === `input` && e.type === `hidden`) {
            var a = i.name == null ? null : `` + i.name;
            if (i.type === `hidden` && e.getAttribute(`name`) === a) return e;
          } else return e;
        else if (!e[xt])
          switch (t) {
            case `meta`:
              if (!e.hasAttribute(`itemprop`)) break;
              return e;
            case `link`:
              if (
                ((a = e.getAttribute(`rel`)),
                (a === `stylesheet` && e.hasAttribute(`data-precedence`)) ||
                  a !== i.rel ||
                  e.getAttribute(`href`) !== (i.href == null || i.href === `` ? null : i.href) ||
                  e.getAttribute(`crossorigin`) !==
                    (i.crossOrigin == null ? null : i.crossOrigin) ||
                  e.getAttribute(`title`) !== (i.title == null ? null : i.title))
              )
                break;
              return e;
            case `style`:
              if (e.hasAttribute(`data-precedence`)) break;
              return e;
            case `script`:
              if (
                ((a = e.getAttribute(`src`)),
                (a !== (i.src == null ? null : i.src) ||
                  e.getAttribute(`type`) !== (i.type == null ? null : i.type) ||
                  e.getAttribute(`crossorigin`) !==
                    (i.crossOrigin == null ? null : i.crossOrigin)) &&
                  a &&
                  e.hasAttribute(`async`) &&
                  !e.hasAttribute(`itemprop`))
              )
                break;
              return e;
            default:
              return e;
          }
        if (((e = lf(e.nextSibling)), e === null)) break;
      }
      return null;
    }
    function rf(e, t, n) {
      if (t === ``) return null;
      for (; e.nodeType !== 3;)
        if (
          ((e.nodeType !== 1 || e.nodeName !== `INPUT` || e.type !== `hidden`) && !n) ||
          ((e = lf(e.nextSibling)), e === null)
        )
          return null;
      return e;
    }
    function af(e, t) {
      for (; e.nodeType !== 8;)
        if (
          ((e.nodeType !== 1 || e.nodeName !== `INPUT` || e.type !== `hidden`) && !t) ||
          ((e = lf(e.nextSibling)), e === null)
        )
          return null;
      return e;
    }
    function of(e) {
      return e.data === `$?` || e.data === `$~`;
    }
    function sf(e) {
      return e.data === `$!` || (e.data === `$?` && e.ownerDocument.readyState !== `loading`);
    }
    function cf(e, t) {
      var n = e.ownerDocument;
      if (e.data === `$~`) e._reactRetry = t;
      else if (e.data !== `$?` || n.readyState !== `loading`) t();
      else {
        var r = function () {
          (t(), n.removeEventListener(`DOMContentLoaded`, r));
        };
        (n.addEventListener(`DOMContentLoaded`, r), (e._reactRetry = r));
      }
    }
    function lf(e) {
      for (; e != null; e = e.nextSibling) {
        var t = e.nodeType;
        if (t === 1 || t === 3) break;
        if (t === 8) {
          if (
            ((t = e.data),
            t === `$` ||
              t === `$!` ||
              t === `$?` ||
              t === `$~` ||
              t === `&` ||
              t === `F!` ||
              t === `F`)
          )
            break;
          if (t === `/$` || t === `/&`) return null;
        }
      }
      return e;
    }
    var uf = null;
    function df(e) {
      e = e.nextSibling;
      for (var t = 0; e;) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === `/$` || n === `/&`) {
            if (t === 0) return lf(e.nextSibling);
            t--;
          } else (n !== `$` && n !== `$!` && n !== `$?` && n !== `$~` && n !== `&`) || t++;
        }
        e = e.nextSibling;
      }
      return null;
    }
    function ff(e) {
      e = e.previousSibling;
      for (var t = 0; e;) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === `$` || n === `$!` || n === `$?` || n === `$~` || n === `&`) {
            if (t === 0) return e;
            t--;
          } else (n !== `/$` && n !== `/&`) || t++;
        }
        e = e.previousSibling;
      }
      return null;
    }
    function pf(e, t, n) {
      switch (((t = Vd(n)), e)) {
        case `html`:
          if (((e = t.documentElement), !e)) throw Error(i(452));
          return e;
        case `head`:
          if (((e = t.head), !e)) throw Error(i(453));
          return e;
        case `body`:
          if (((e = t.body), !e)) throw Error(i(454));
          return e;
        default:
          throw Error(i(451));
      }
    }
    function mf(e) {
      for (var t = e.attributes; t.length;) e.removeAttributeNode(t[0]);
      St(e);
    }
    var hf = new Map(),
      gf = new Set();
    function _f(e) {
      return typeof e.getRootNode == `function`
        ? e.getRootNode()
        : e.nodeType === 9
          ? e
          : e.ownerDocument;
    }
    var vf = D.d;
    D.d = { f: yf, r: bf, D: Cf, C: wf, L: Tf, m: Ef, X: Of, S: Df, M: kf };
    function yf() {
      var e = vf.f(),
        t = xu();
      return e || t;
    }
    function bf(e) {
      var t = wt(e);
      t !== null && t.tag === 5 && t.type === `form` ? Os(t) : vf.r(e);
    }
    var xf = typeof document > `u` ? null : document;
    function Sf(e, t, n) {
      var r = xf;
      if (r && typeof t == `string` && t) {
        var i = Kt(t);
        ((i = `link[rel="` + e + `"][href="` + i + `"]`),
          typeof n == `string` && (i += `[crossorigin="` + n + `"]`),
          gf.has(i) ||
            (gf.add(i),
            (e = { rel: e, crossOrigin: n, href: t }),
            r.querySelector(i) === null &&
              ((t = r.createElement(`link`)), Fd(t, `link`, e), Dt(t), r.head.appendChild(t))));
      }
    }
    function Cf(e) {
      (vf.D(e), Sf(`dns-prefetch`, e, null));
    }
    function wf(e, t) {
      (vf.C(e, t), Sf(`preconnect`, e, t));
    }
    function Tf(e, t, n) {
      vf.L(e, t, n);
      var r = xf;
      if (r && e && t) {
        var i = `link[rel="preload"][as="` + Kt(t) + `"]`;
        t === `image` && n && n.imageSrcSet
          ? ((i += `[imagesrcset="` + Kt(n.imageSrcSet) + `"]`),
            typeof n.imageSizes == `string` && (i += `[imagesizes="` + Kt(n.imageSizes) + `"]`))
          : (i += `[href="` + Kt(e) + `"]`);
        var a = i;
        switch (t) {
          case `style`:
            a = jf(e);
            break;
          case `script`:
            a = Ff(e);
        }
        hf.has(a) ||
          ((e = m(
            { rel: `preload`, href: t === `image` && n && n.imageSrcSet ? void 0 : e, as: t },
            n,
          )),
          hf.set(a, e),
          r.querySelector(i) !== null ||
            (t === `style` && r.querySelector(Mf(a))) ||
            (t === `script` && r.querySelector(If(a))) ||
            ((t = r.createElement(`link`)), Fd(t, `link`, e), Dt(t), r.head.appendChild(t)));
      }
    }
    function Ef(e, t) {
      vf.m(e, t);
      var n = xf;
      if (n && e) {
        var r = t && typeof t.as == `string` ? t.as : `script`,
          i = `link[rel="modulepreload"][as="` + Kt(r) + `"][href="` + Kt(e) + `"]`,
          a = i;
        switch (r) {
          case `audioworklet`:
          case `paintworklet`:
          case `serviceworker`:
          case `sharedworker`:
          case `worker`:
          case `script`:
            a = Ff(e);
        }
        if (
          !hf.has(a) &&
          ((e = m({ rel: `modulepreload`, href: e }, t)), hf.set(a, e), n.querySelector(i) === null)
        ) {
          switch (r) {
            case `audioworklet`:
            case `paintworklet`:
            case `serviceworker`:
            case `sharedworker`:
            case `worker`:
            case `script`:
              if (n.querySelector(If(a))) return;
          }
          ((r = n.createElement(`link`)), Fd(r, `link`, e), Dt(r), n.head.appendChild(r));
        }
      }
    }
    function Df(e, t, n) {
      vf.S(e, t, n);
      var r = xf;
      if (r && e) {
        var i = Et(r).hoistableStyles,
          a = jf(e);
        t ||= `default`;
        var o = i.get(a);
        if (!o) {
          var s = { loading: 0, preload: null };
          if ((o = r.querySelector(Mf(a)))) s.loading = 5;
          else {
            ((e = m({ rel: `stylesheet`, href: e, "data-precedence": t }, n)),
              (n = hf.get(a)) && zf(e, n));
            var c = (o = r.createElement(`link`));
            (Dt(c),
              Fd(c, `link`, e),
              (c._p = new Promise(function (e, t) {
                ((c.onload = e), (c.onerror = t));
              })),
              c.addEventListener(`load`, function () {
                s.loading |= 1;
              }),
              c.addEventListener(`error`, function () {
                s.loading |= 2;
              }),
              (s.loading |= 4),
              Rf(o, t, r));
          }
          ((o = { type: `stylesheet`, instance: o, count: 1, state: s }), i.set(a, o));
        }
      }
    }
    function Of(e, t) {
      vf.X(e, t);
      var n = xf;
      if (n && e) {
        var r = Et(n).hoistableScripts,
          i = Ff(e),
          a = r.get(i);
        a ||
          ((a = n.querySelector(If(i))),
          a ||
            ((e = m({ src: e, async: !0 }, t)),
            (t = hf.get(i)) && Bf(e, t),
            (a = n.createElement(`script`)),
            Dt(a),
            Fd(a, `link`, e),
            n.head.appendChild(a)),
          (a = { type: `script`, instance: a, count: 1, state: null }),
          r.set(i, a));
      }
    }
    function kf(e, t) {
      vf.M(e, t);
      var n = xf;
      if (n && e) {
        var r = Et(n).hoistableScripts,
          i = Ff(e),
          a = r.get(i);
        a ||
          ((a = n.querySelector(If(i))),
          a ||
            ((e = m({ src: e, async: !0, type: `module` }, t)),
            (t = hf.get(i)) && Bf(e, t),
            (a = n.createElement(`script`)),
            Dt(a),
            Fd(a, `link`, e),
            n.head.appendChild(a)),
          (a = { type: `script`, instance: a, count: 1, state: null }),
          r.set(i, a));
      }
    }
    function Af(e, t, n, r) {
      var a = (a = _e.current) ? _f(a) : null;
      if (!a) throw Error(i(446));
      switch (e) {
        case `meta`:
        case `title`:
          return null;
        case `style`:
          return typeof n.precedence == `string` && typeof n.href == `string`
            ? ((t = jf(n.href)),
              (n = Et(a).hoistableStyles),
              (r = n.get(t)),
              r || ((r = { type: `style`, instance: null, count: 0, state: null }), n.set(t, r)),
              r)
            : { type: `void`, instance: null, count: 0, state: null };
        case `link`:
          if (
            n.rel === `stylesheet` &&
            typeof n.href == `string` &&
            typeof n.precedence == `string`
          ) {
            e = jf(n.href);
            var o = Et(a).hoistableStyles,
              s = o.get(e);
            if (
              (s ||
                ((a = a.ownerDocument || a),
                (s = {
                  type: `stylesheet`,
                  instance: null,
                  count: 0,
                  state: { loading: 0, preload: null },
                }),
                o.set(e, s),
                (o = a.querySelector(Mf(e))) && !o._p && ((s.instance = o), (s.state.loading = 5)),
                hf.has(e) ||
                  ((n = {
                    rel: `preload`,
                    as: `style`,
                    href: n.href,
                    crossOrigin: n.crossOrigin,
                    integrity: n.integrity,
                    media: n.media,
                    hrefLang: n.hrefLang,
                    referrerPolicy: n.referrerPolicy,
                  }),
                  hf.set(e, n),
                  o || Pf(a, e, n, s.state))),
              t && r === null)
            )
              throw Error(i(528, ``));
            return s;
          }
          if (t && r !== null) throw Error(i(529, ``));
          return null;
        case `script`:
          return (
            (t = n.async),
            (n = n.src),
            typeof n == `string` && t && typeof t != `function` && typeof t != `symbol`
              ? ((t = Ff(n)),
                (n = Et(a).hoistableScripts),
                (r = n.get(t)),
                r || ((r = { type: `script`, instance: null, count: 0, state: null }), n.set(t, r)),
                r)
              : { type: `void`, instance: null, count: 0, state: null }
          );
        default:
          throw Error(i(444, e));
      }
    }
    function jf(e) {
      return `href="` + Kt(e) + `"`;
    }
    function Mf(e) {
      return `link[rel="stylesheet"][` + e + `]`;
    }
    function Nf(e) {
      return m({}, e, { "data-precedence": e.precedence, precedence: null });
    }
    function Pf(e, t, n, r) {
      e.querySelector(`link[rel="preload"][as="style"][` + t + `]`)
        ? (r.loading = 1)
        : ((t = e.createElement(`link`)),
          (r.preload = t),
          t.addEventListener(`load`, function () {
            return (r.loading |= 1);
          }),
          t.addEventListener(`error`, function () {
            return (r.loading |= 2);
          }),
          Fd(t, `link`, n),
          Dt(t),
          e.head.appendChild(t));
    }
    function Ff(e) {
      return `[src="` + Kt(e) + `"]`;
    }
    function If(e) {
      return `script[async]` + e;
    }
    function Lf(e, t, n) {
      if ((t.count++, t.instance === null))
        switch (t.type) {
          case `style`:
            var r = e.querySelector(`style[data-href~="` + Kt(n.href) + `"]`);
            if (r) return ((t.instance = r), Dt(r), r);
            var a = m({}, n, {
              "data-href": n.href,
              "data-precedence": n.precedence,
              href: null,
              precedence: null,
            });
            return (
              (r = (e.ownerDocument || e).createElement(`style`)),
              Dt(r),
              Fd(r, `style`, a),
              Rf(r, n.precedence, e),
              (t.instance = r)
            );
          case `stylesheet`:
            a = jf(n.href);
            var o = e.querySelector(Mf(a));
            if (o) return ((t.state.loading |= 4), (t.instance = o), Dt(o), o);
            ((r = Nf(n)),
              (a = hf.get(a)) && zf(r, a),
              (o = (e.ownerDocument || e).createElement(`link`)),
              Dt(o));
            var s = o;
            return (
              (s._p = new Promise(function (e, t) {
                ((s.onload = e), (s.onerror = t));
              })),
              Fd(o, `link`, r),
              (t.state.loading |= 4),
              Rf(o, n.precedence, e),
              (t.instance = o)
            );
          case `script`:
            return (
              (o = Ff(n.src)),
              (a = e.querySelector(If(o)))
                ? ((t.instance = a), Dt(a), a)
                : ((r = n),
                  (a = hf.get(o)) && ((r = m({}, n)), Bf(r, a)),
                  (e = e.ownerDocument || e),
                  (a = e.createElement(`script`)),
                  Dt(a),
                  Fd(a, `link`, r),
                  e.head.appendChild(a),
                  (t.instance = a))
            );
          case `void`:
            return null;
          default:
            throw Error(i(443, t.type));
        }
      else
        t.type === `stylesheet` &&
          !(t.state.loading & 4) &&
          ((r = t.instance), (t.state.loading |= 4), Rf(r, n.precedence, e));
      return t.instance;
    }
    function Rf(e, t, n) {
      for (
        var r = n.querySelectorAll(
            `link[rel="stylesheet"][data-precedence],style[data-precedence]`,
          ),
          i = r.length ? r[r.length - 1] : null,
          a = i,
          o = 0;
        o < r.length;
        o++
      ) {
        var s = r[o];
        if (s.dataset.precedence === t) a = s;
        else if (a !== i) break;
      }
      a
        ? a.parentNode.insertBefore(e, a.nextSibling)
        : ((t = n.nodeType === 9 ? n.head : n), t.insertBefore(e, t.firstChild));
    }
    function zf(e, t) {
      ((e.crossOrigin ??= t.crossOrigin),
        (e.referrerPolicy ??= t.referrerPolicy),
        (e.title ??= t.title));
    }
    function Bf(e, t) {
      ((e.crossOrigin ??= t.crossOrigin),
        (e.referrerPolicy ??= t.referrerPolicy),
        (e.integrity ??= t.integrity));
    }
    var Vf = null;
    function Hf(e, t, n) {
      if (Vf === null) {
        var r = new Map(),
          i = (Vf = new Map());
        i.set(n, r);
      } else ((i = Vf), (r = i.get(n)), r || ((r = new Map()), i.set(n, r)));
      if (r.has(e)) return r;
      for (r.set(e, null), n = n.getElementsByTagName(e), i = 0; i < n.length; i++) {
        var a = n[i];
        if (
          !(a[xt] || a[mt] || (e === `link` && a.getAttribute(`rel`) === `stylesheet`)) &&
          a.namespaceURI !== `http://www.w3.org/2000/svg`
        ) {
          var o = a.getAttribute(t) || ``;
          o = e + o;
          var s = r.get(o);
          s ? s.push(a) : r.set(o, [a]);
        }
      }
      return r;
    }
    function Uf(e, t, n) {
      ((e = e.ownerDocument || e),
        e.head.insertBefore(n, t === `title` ? e.querySelector(`head > title`) : null));
    }
    function Wf(e, t, n) {
      if (n === 1 || t.itemProp != null) return !1;
      switch (e) {
        case `meta`:
        case `title`:
          return !0;
        case `style`:
          if (typeof t.precedence != `string` || typeof t.href != `string` || t.href === ``) break;
          return !0;
        case `link`:
          if (
            typeof t.rel != `string` ||
            typeof t.href != `string` ||
            t.href === `` ||
            t.onLoad ||
            t.onError
          )
            break;
          switch (t.rel) {
            case `stylesheet`:
              return ((e = t.disabled), typeof t.precedence == `string` && e == null);
            default:
              return !0;
          }
        case `script`:
          if (
            t.async &&
            typeof t.async != `function` &&
            typeof t.async != `symbol` &&
            !t.onLoad &&
            !t.onError &&
            t.src &&
            typeof t.src == `string`
          )
            return !0;
      }
      return !1;
    }
    function Gf(e) {
      return !(e.type === `stylesheet` && !(e.state.loading & 3));
    }
    function Kf(e, t, n, r) {
      if (
        n.type === `stylesheet` &&
        (typeof r.media != `string` || !1 !== matchMedia(r.media).matches) &&
        !(n.state.loading & 4)
      ) {
        if (n.instance === null) {
          var i = jf(r.href),
            a = t.querySelector(Mf(i));
          if (a) {
            ((t = a._p),
              typeof t == `object` &&
                t &&
                typeof t.then == `function` &&
                (e.count++, (e = Yf.bind(e)), t.then(e, e)),
              (n.state.loading |= 4),
              (n.instance = a),
              Dt(a));
            return;
          }
          ((a = t.ownerDocument || t),
            (r = Nf(r)),
            (i = hf.get(i)) && zf(r, i),
            (a = a.createElement(`link`)),
            Dt(a));
          var o = a;
          ((o._p = new Promise(function (e, t) {
            ((o.onload = e), (o.onerror = t));
          })),
            Fd(a, `link`, r),
            (n.instance = a));
        }
        (e.stylesheets === null && (e.stylesheets = new Map()),
          e.stylesheets.set(n, t),
          (t = n.state.preload) &&
            !(n.state.loading & 3) &&
            (e.count++,
            (n = Yf.bind(e)),
            t.addEventListener(`load`, n),
            t.addEventListener(`error`, n)));
      }
    }
    var qf = 0;
    function Jf(e, t) {
      return (
        e.stylesheets && e.count === 0 && Zf(e, e.stylesheets),
        0 < e.count || 0 < e.imgCount
          ? function (n) {
              var r = setTimeout(function () {
                if ((e.stylesheets && Zf(e, e.stylesheets), e.unsuspend)) {
                  var t = e.unsuspend;
                  ((e.unsuspend = null), t());
                }
              }, 6e4 + t);
              0 < e.imgBytes && qf === 0 && (qf = 62500 * Rd());
              var i = setTimeout(
                function () {
                  if (
                    ((e.waitingForImages = !1),
                    e.count === 0 && (e.stylesheets && Zf(e, e.stylesheets), e.unsuspend))
                  ) {
                    var t = e.unsuspend;
                    ((e.unsuspend = null), t());
                  }
                },
                (e.imgBytes > qf ? 50 : 800) + t,
              );
              return (
                (e.unsuspend = n),
                function () {
                  ((e.unsuspend = null), clearTimeout(r), clearTimeout(i));
                }
              );
            }
          : null
      );
    }
    function Yf() {
      if ((this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages))) {
        if (this.stylesheets) Zf(this, this.stylesheets);
        else if (this.unsuspend) {
          var e = this.unsuspend;
          ((this.unsuspend = null), e());
        }
      }
    }
    var Xf = null;
    function Zf(e, t) {
      ((e.stylesheets = null),
        e.unsuspend !== null &&
          (e.count++, (Xf = new Map()), t.forEach(Qf, e), (Xf = null), Yf.call(e)));
    }
    function Qf(e, t) {
      if (!(t.state.loading & 4)) {
        var n = Xf.get(e);
        if (n) var r = n.get(null);
        else {
          ((n = new Map()), Xf.set(e, n));
          for (
            var i = e.querySelectorAll(`link[data-precedence],style[data-precedence]`), a = 0;
            a < i.length;
            a++
          ) {
            var o = i[a];
            (o.nodeName === `LINK` || o.getAttribute(`media`) !== `not all`) &&
              (n.set(o.dataset.precedence, o), (r = o));
          }
          r && n.set(null, r);
        }
        ((i = t.instance),
          (o = i.getAttribute(`data-precedence`)),
          (a = n.get(o) || r),
          a === r && n.set(null, i),
          n.set(o, i),
          this.count++,
          (r = Yf.bind(this)),
          i.addEventListener(`load`, r),
          i.addEventListener(`error`, r),
          a
            ? a.parentNode.insertBefore(i, a.nextSibling)
            : ((e = e.nodeType === 9 ? e.head : e), e.insertBefore(i, e.firstChild)),
          (t.state.loading |= 4));
      }
    }
    var $f = {
      $$typeof: S,
      Provider: null,
      Consumer: null,
      _currentValue: de,
      _currentValue2: de,
      _threadCount: 0,
    };
    function ep(e, t, n, r, i, a, o, s, c) {
      ((this.tag = 1),
        (this.containerInfo = e),
        (this.pingCache = this.current = this.pendingChildren = null),
        (this.timeoutHandle = -1),
        (this.callbackNode =
          this.next =
          this.pendingContext =
          this.context =
          this.cancelPendingCommit =
            null),
        (this.callbackPriority = 0),
        (this.expirationTimes = rt(-1)),
        (this.entangledLanes =
          this.shellSuspendCounter =
          this.errorRecoveryDisabledLanes =
          this.expiredLanes =
          this.warmLanes =
          this.pingedLanes =
          this.suspendedLanes =
          this.pendingLanes =
            0),
        (this.entanglements = rt(0)),
        (this.hiddenUpdates = rt(null)),
        (this.identifierPrefix = r),
        (this.onUncaughtError = i),
        (this.onCaughtError = a),
        (this.onRecoverableError = o),
        (this.pooledCache = null),
        (this.pooledCacheLanes = 0),
        (this.formState = c),
        (this.incompleteTransitions = new Map()));
    }
    function tp(e, t, n, r, i, a, o, s, c, l, u, d) {
      return (
        (e = new ep(e, t, n, o, c, l, u, d, s)),
        (t = 1),
        !0 === a && (t |= 24),
        (a = mi(3, null, null, t)),
        (e.current = a),
        (a.stateNode = e),
        (t = pa()),
        t.refCount++,
        (e.pooledCache = t),
        t.refCount++,
        (a.memoizedState = { element: r, isDehydrated: n, cache: t }),
        Ga(a),
        e
      );
    }
    function np(e) {
      return e ? ((e = fi), e) : fi;
    }
    function rp(e, t, n, r, i, a) {
      ((i = np(i)),
        r.context === null ? (r.context = i) : (r.pendingContext = i),
        (r = qa(t)),
        (r.payload = { element: n }),
        (a = a === void 0 ? null : a),
        a !== null && (r.callback = a),
        (n = Ja(e, r, t)),
        n !== null && (gu(n, e, t), Ya(n, e, t)));
    }
    function ip(e, t) {
      if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
        var n = e.retryLane;
        e.retryLane = n !== 0 && n < t ? n : t;
      }
    }
    function ap(e, t) {
      (ip(e, t), (e = e.alternate) && ip(e, t));
    }
    function op(e) {
      if (e.tag === 13 || e.tag === 31) {
        var t = li(e, 67108864);
        (t !== null && gu(t, e, 67108864), ap(e, 67108864));
      }
    }
    function sp(e) {
      if (e.tag === 13 || e.tag === 31) {
        var t = mu();
        t = lt(t);
        var n = li(e, t);
        (n !== null && gu(n, e, t), ap(e, t));
      }
    }
    var cp = !0;
    function lp(e, t, n, r) {
      var i = E.T;
      E.T = null;
      var a = D.p;
      try {
        ((D.p = 2), dp(e, t, n, r));
      } finally {
        ((D.p = a), (E.T = i));
      }
    }
    function up(e, t, n, r) {
      var i = E.T;
      E.T = null;
      var a = D.p;
      try {
        ((D.p = 8), dp(e, t, n, r));
      } finally {
        ((D.p = a), (E.T = i));
      }
    }
    function dp(e, t, n, r) {
      if (cp) {
        var i = fp(r);
        if (i === null) (Td(e, t, r, pp, n), wp(e, r));
        else if (Ep(i, e, t, n, r)) r.stopPropagation();
        else if ((wp(e, r), t & 4 && -1 < Cp.indexOf(e))) {
          for (; i !== null;) {
            var a = wt(i);
            if (a !== null)
              switch (a.tag) {
                case 3:
                  if (((a = a.stateNode), a.current.memoizedState.isDehydrated)) {
                    var o = Qe(a.pendingLanes);
                    if (o !== 0) {
                      var s = a;
                      for (s.pendingLanes |= 2, s.entangledLanes |= 2; o;) {
                        var c = 1 << (31 - Ge(o));
                        ((s.entanglements[1] |= c), (o &= ~c));
                      }
                      (id(a), !(K & 6) && ((nu = Ne() + 500), ad(0, !1)));
                    }
                  }
                  break;
                case 31:
                case 13:
                  ((s = li(a, 2)), s !== null && gu(s, a, 2), xu(), ap(a, 2));
              }
            if (((a = fp(r)), a === null && Td(e, t, r, pp, n), a === i)) break;
            i = a;
          }
          i !== null && r.stopPropagation();
        } else Td(e, t, r, null, n);
      }
    }
    function fp(e) {
      return ((e = un(e)), mp(e));
    }
    var pp = null;
    function mp(e) {
      if (((pp = null), (e = Ct(e)), e !== null)) {
        var t = c(e);
        if (t === null) e = null;
        else {
          var n = t.tag;
          if (n === 13) {
            if (((e = l(t)), e !== null)) return e;
            e = null;
          } else if (n === 31) {
            if (((e = u(t)), e !== null)) return e;
            e = null;
          } else if (n === 3) {
            if (t.stateNode.current.memoizedState.isDehydrated)
              return t.tag === 3 ? t.stateNode.containerInfo : null;
            e = null;
          } else t !== e && (e = null);
        }
      }
      return ((pp = e), null);
    }
    function hp(e) {
      switch (e) {
        case `beforetoggle`:
        case `cancel`:
        case `click`:
        case `close`:
        case `contextmenu`:
        case `copy`:
        case `cut`:
        case `auxclick`:
        case `dblclick`:
        case `dragend`:
        case `dragstart`:
        case `drop`:
        case `focusin`:
        case `focusout`:
        case `input`:
        case `invalid`:
        case `keydown`:
        case `keypress`:
        case `keyup`:
        case `mousedown`:
        case `mouseup`:
        case `paste`:
        case `pause`:
        case `play`:
        case `pointercancel`:
        case `pointerdown`:
        case `pointerup`:
        case `ratechange`:
        case `reset`:
        case `resize`:
        case `seeked`:
        case `submit`:
        case `toggle`:
        case `touchcancel`:
        case `touchend`:
        case `touchstart`:
        case `volumechange`:
        case `change`:
        case `selectionchange`:
        case `textInput`:
        case `compositionstart`:
        case `compositionend`:
        case `compositionupdate`:
        case `beforeblur`:
        case `afterblur`:
        case `beforeinput`:
        case `blur`:
        case `fullscreenchange`:
        case `focus`:
        case `hashchange`:
        case `popstate`:
        case `select`:
        case `selectstart`:
          return 2;
        case `drag`:
        case `dragenter`:
        case `dragexit`:
        case `dragleave`:
        case `dragover`:
        case `mousemove`:
        case `mouseout`:
        case `mouseover`:
        case `pointermove`:
        case `pointerout`:
        case `pointerover`:
        case `scroll`:
        case `touchmove`:
        case `wheel`:
        case `mouseenter`:
        case `mouseleave`:
        case `pointerenter`:
        case `pointerleave`:
          return 8;
        case `message`:
          switch (Pe()) {
            case Fe:
              return 2;
            case Ie:
              return 8;
            case Le:
            case Re:
              return 32;
            case ze:
              return 268435456;
            default:
              return 32;
          }
        default:
          return 32;
      }
    }
    var gp = !1,
      _p = null,
      vp = null,
      yp = null,
      bp = new Map(),
      xp = new Map(),
      Sp = [],
      Cp =
        `mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset`.split(
          ` `,
        );
    function wp(e, t) {
      switch (e) {
        case `focusin`:
        case `focusout`:
          _p = null;
          break;
        case `dragenter`:
        case `dragleave`:
          vp = null;
          break;
        case `mouseover`:
        case `mouseout`:
          yp = null;
          break;
        case `pointerover`:
        case `pointerout`:
          bp.delete(t.pointerId);
          break;
        case `gotpointercapture`:
        case `lostpointercapture`:
          xp.delete(t.pointerId);
      }
    }
    function Tp(e, t, n, r, i, a) {
      return e === null || e.nativeEvent !== a
        ? ((e = {
            blockedOn: t,
            domEventName: n,
            eventSystemFlags: r,
            nativeEvent: a,
            targetContainers: [i],
          }),
          t !== null && ((t = wt(t)), t !== null && op(t)),
          e)
        : ((e.eventSystemFlags |= r),
          (t = e.targetContainers),
          i !== null && t.indexOf(i) === -1 && t.push(i),
          e);
    }
    function Ep(e, t, n, r, i) {
      switch (t) {
        case `focusin`:
          return ((_p = Tp(_p, e, t, n, r, i)), !0);
        case `dragenter`:
          return ((vp = Tp(vp, e, t, n, r, i)), !0);
        case `mouseover`:
          return ((yp = Tp(yp, e, t, n, r, i)), !0);
        case `pointerover`:
          var a = i.pointerId;
          return (bp.set(a, Tp(bp.get(a) || null, e, t, n, r, i)), !0);
        case `gotpointercapture`:
          return ((a = i.pointerId), xp.set(a, Tp(xp.get(a) || null, e, t, n, r, i)), !0);
      }
      return !1;
    }
    function Dp(e) {
      var t = Ct(e.target);
      if (t !== null) {
        var n = c(t);
        if (n !== null) {
          if (((t = n.tag), t === 13)) {
            if (((t = l(n)), t !== null)) {
              ((e.blockedOn = t),
                ft(e.priority, function () {
                  sp(n);
                }));
              return;
            }
          } else if (t === 31) {
            if (((t = u(n)), t !== null)) {
              ((e.blockedOn = t),
                ft(e.priority, function () {
                  sp(n);
                }));
              return;
            }
          } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
            e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
            return;
          }
        }
      }
      e.blockedOn = null;
    }
    function Op(e) {
      if (e.blockedOn !== null) return !1;
      for (var t = e.targetContainers; 0 < t.length;) {
        var n = fp(e.nativeEvent);
        if (n === null) {
          n = e.nativeEvent;
          var r = new n.constructor(n.type, n);
          ((ln = r), n.target.dispatchEvent(r), (ln = null));
        } else return ((t = wt(n)), t !== null && op(t), (e.blockedOn = n), !1);
        t.shift();
      }
      return !0;
    }
    function kp(e, t, n) {
      Op(e) && n.delete(t);
    }
    function Ap() {
      ((gp = !1),
        _p !== null && Op(_p) && (_p = null),
        vp !== null && Op(vp) && (vp = null),
        yp !== null && Op(yp) && (yp = null),
        bp.forEach(kp),
        xp.forEach(kp));
    }
    function jp(e, n) {
      e.blockedOn === n &&
        ((e.blockedOn = null),
        gp || ((gp = !0), t.unstable_scheduleCallback(t.unstable_NormalPriority, Ap)));
    }
    var Mp = null;
    function Np(e) {
      Mp !== e &&
        ((Mp = e),
        t.unstable_scheduleCallback(t.unstable_NormalPriority, function () {
          Mp === e && (Mp = null);
          for (var t = 0; t < e.length; t += 3) {
            var n = e[t],
              r = e[t + 1],
              i = e[t + 2];
            if (typeof r != `function`) {
              if (mp(r || n) === null) continue;
              break;
            }
            var a = wt(n);
            a !== null &&
              (e.splice(t, 3),
              (t -= 3),
              H(a, { pending: !0, data: i, method: n.method, action: r }, r, i));
          }
        }));
    }
    function Pp(e) {
      function t(t) {
        return jp(t, e);
      }
      (_p !== null && jp(_p, e),
        vp !== null && jp(vp, e),
        yp !== null && jp(yp, e),
        bp.forEach(t),
        xp.forEach(t));
      for (var n = 0; n < Sp.length; n++) {
        var r = Sp[n];
        r.blockedOn === e && (r.blockedOn = null);
      }
      for (; 0 < Sp.length && ((n = Sp[0]), n.blockedOn === null);)
        (Dp(n), n.blockedOn === null && Sp.shift());
      if (((n = (e.ownerDocument || e).$$reactFormReplay), n != null))
        for (r = 0; r < n.length; r += 3) {
          var i = n[r],
            a = n[r + 1],
            o = i[ht] || null;
          if (typeof a == `function`) o || Np(n);
          else if (o) {
            var s = null;
            if (a && a.hasAttribute(`formAction`)) {
              if (((i = a), (o = a[ht] || null))) s = o.formAction;
              else if (mp(i) !== null) continue;
            } else s = o.action;
            (typeof s == `function` ? (n[r + 1] = s) : (n.splice(r, 3), (r -= 3)), Np(n));
          }
        }
    }
    function Fp() {
      function e(e) {
        e.canIntercept &&
          e.info === `react-transition` &&
          e.intercept({
            handler: function () {
              return new Promise(function (e) {
                return (i = e);
              });
            },
            focusReset: `manual`,
            scroll: `manual`,
          });
      }
      function t() {
        (i !== null && (i(), (i = null)), r || setTimeout(n, 20));
      }
      function n() {
        if (!r && !navigation.transition) {
          var e = navigation.currentEntry;
          e &&
            e.url != null &&
            navigation.navigate(e.url, {
              state: e.getState(),
              info: `react-transition`,
              history: `replace`,
            });
        }
      }
      if (typeof navigation == `object`) {
        var r = !1,
          i = null;
        return (
          navigation.addEventListener(`navigate`, e),
          navigation.addEventListener(`navigatesuccess`, t),
          navigation.addEventListener(`navigateerror`, t),
          setTimeout(n, 100),
          function () {
            ((r = !0),
              navigation.removeEventListener(`navigate`, e),
              navigation.removeEventListener(`navigatesuccess`, t),
              navigation.removeEventListener(`navigateerror`, t),
              i !== null && (i(), (i = null)));
          }
        );
      }
    }
    function Ip(e) {
      this._internalRoot = e;
    }
    ((Lp.prototype.render = Ip.prototype.render =
      function (e) {
        var t = this._internalRoot;
        if (t === null) throw Error(i(409));
        var n = t.current;
        rp(n, mu(), e, t, null, null);
      }),
      (Lp.prototype.unmount = Ip.prototype.unmount =
        function () {
          var e = this._internalRoot;
          if (e !== null) {
            this._internalRoot = null;
            var t = e.containerInfo;
            (rp(e.current, 2, null, e, null, null), xu(), (t[gt] = null));
          }
        }));
    function Lp(e) {
      this._internalRoot = e;
    }
    Lp.prototype.unstable_scheduleHydration = function (e) {
      if (e) {
        var t = dt();
        e = { blockedOn: null, target: e, priority: t };
        for (var n = 0; n < Sp.length && t !== 0 && t < Sp[n].priority; n++);
        (Sp.splice(n, 0, e), n === 0 && Dp(e));
      }
    };
    var Rp = n.version;
    if (Rp !== `19.2.7`) throw Error(i(527, Rp, `19.2.7`));
    D.findDOMNode = function (e) {
      var t = e._reactInternals;
      if (t === void 0)
        throw typeof e.render == `function`
          ? Error(i(188))
          : ((e = Object.keys(e).join(`,`)), Error(i(268, e)));
      return ((e = f(t)), (e = e === null ? null : p(e)), (e = e === null ? null : e.stateNode), e);
    };
    var zp = {
      bundleType: 0,
      version: `19.2.7`,
      rendererPackageName: `react-dom`,
      currentDispatcherRef: E,
      reconcilerVersion: `19.2.7`,
    };
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < `u`) {
      var Bp = __REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!Bp.isDisabled && Bp.supportsFiber)
        try {
          ((He = Bp.inject(zp)), (Ue = Bp));
        } catch {}
    }
    e.hydrateRoot = function (e, t, n) {
      if (!s(e)) throw Error(i(299));
      var r = !1,
        a = ``,
        o = Js,
        c = Ys,
        l = Xs,
        u = null;
      return (
        n != null &&
          (!0 === n.unstable_strictMode && (r = !0),
          n.identifierPrefix !== void 0 && (a = n.identifierPrefix),
          n.onUncaughtError !== void 0 && (o = n.onUncaughtError),
          n.onCaughtError !== void 0 && (c = n.onCaughtError),
          n.onRecoverableError !== void 0 && (l = n.onRecoverableError),
          n.formState !== void 0 && (u = n.formState)),
        (t = tp(e, 1, !0, t, n ?? null, r, a, u, o, c, l, Fp)),
        (t.context = np(null)),
        (n = t.current),
        (r = mu()),
        (r = lt(r)),
        (a = qa(r)),
        (a.callback = null),
        Ja(n, a, r),
        (n = r),
        (t.current.lanes = n),
        it(t, n),
        id(t),
        (e[gt] = t.current),
        Cd(e),
        new Lp(t)
      );
    };
  }),
  w = t((e, t) => {
    function n() {
      if (!(
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > `u` ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != `function`
      ))
        try {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
        } catch (e) {
          console.error(e);
        }
    }
    (n(), (t.exports = re()));
  }),
  ie = `__TSS_CONTEXT`,
  ae = Symbol.for(`TSS_SERVER_FUNCTION`),
  oe = `application/x-tss-framed`,
  se = { JSON: 0, CHUNK: 1, END: 2, ERROR: 3 };
`${oe}`;
var ce = /;\s*v=(\d+)/;
function le(e) {
  let t = e.match(ce);
  return t ? parseInt(t[1], 10) : void 0;
}
function ue(e) {
  let t = le(e);
  if (t !== void 0 && t !== 1)
    throw Error(
      `Incompatible framed protocol version: server=${t}, client=1. Please ensure client and server are using compatible versions.`,
    );
}
var E = () => window.__TSS_START_OPTIONS__;
function D(e) {
  return e[e.length - 1];
}
function de(e) {
  return typeof e == `function`;
}
function fe(e, t) {
  return de(e) ? e(t) : e;
}
var pe = Object.prototype.hasOwnProperty,
  me = Object.prototype.propertyIsEnumerable;
function O(e) {
  for (let t in e) if (pe.call(e, t)) return !0;
  return !1;
}
var k = () => Object.create(null),
  he = (e, t) => ge(e, t, k);
function ge(e, t, n = () => ({}), r = 0) {
  if (e === t) return e;
  if (r > 500) return t;
  let i = t,
    a = A(e) && A(i);
  if (!a && !(ve(e) && ve(i))) return i;
  let o = a ? e : _e(e);
  if (!o) return i;
  let s = a ? i : _e(i);
  if (!s) return i;
  let c = o.length,
    l = s.length,
    u = a ? Array(l) : n(),
    d = 0;
  for (let t = 0; t < l; t++) {
    let o = a ? t : s[t],
      l = e[o],
      f = i[o];
    if (l === f) {
      ((u[o] = l), (a ? t < c : pe.call(e, o)) && d++);
      continue;
    }
    if (l === null || f === null || typeof l != `object` || typeof f != `object`) {
      u[o] = f;
      continue;
    }
    let p = ge(l, f, n, r + 1);
    ((u[o] = p), p === l && d++);
  }
  return c === l && d === c ? e : u;
}
function _e(e) {
  let t = Object.getOwnPropertyNames(e);
  for (let n of t) if (!me.call(e, n)) return !1;
  let n = Object.getOwnPropertySymbols(e);
  if (n.length === 0) return t;
  let r = t;
  for (let t of n) {
    if (!me.call(e, t)) return !1;
    r.push(t);
  }
  return r;
}
function ve(e) {
  if (!ye(e)) return !1;
  let t = e.constructor;
  if (t === void 0) return !0;
  let n = t.prototype;
  return !(!ye(n) || !n.hasOwnProperty(`isPrototypeOf`));
}
function ye(e) {
  return Object.prototype.toString.call(e) === `[object Object]`;
}
function A(e) {
  return Array.isArray(e) && e.length === Object.keys(e).length;
}
function j(e, t, n) {
  if (e === t) return !0;
  if (typeof e != typeof t) return !1;
  if (Array.isArray(e) && Array.isArray(t)) {
    if (e.length !== t.length) return !1;
    for (let r = 0, i = e.length; r < i; r++) if (!j(e[r], t[r], n)) return !1;
    return !0;
  }
  if (ve(e) && ve(t)) {
    let r = n?.ignoreUndefined ?? !0;
    if (n?.partial) {
      for (let i in t) if ((!r || t[i] !== void 0) && !j(e[i], t[i], n)) return !1;
      return !0;
    }
    let i = 0;
    if (!r) i = Object.keys(e).length;
    else for (let t in e) e[t] !== void 0 && i++;
    let a = 0;
    for (let o in t) if ((!r || t[o] !== void 0) && (a++, a > i || !j(e[o], t[o], n))) return !1;
    return i === a;
  }
  return !1;
}
function be(e) {
  let t,
    n,
    r = new Promise((e, r) => {
      ((t = e), (n = r));
    });
  return (
    (r.status = `pending`),
    (r.resolve = (n) => {
      ((r.status = `resolved`), (r.value = n), t(n), e?.(n));
    }),
    (r.reject = (e) => {
      ((r.status = `rejected`), n(e));
    }),
    r
  );
}
function xe(e) {
  return typeof e?.message == `string`
    ? e.message.startsWith(`Failed to fetch dynamically imported module`) ||
        e.message.startsWith(`error loading dynamically imported module`) ||
        e.message.startsWith(`Importing a module script failed`)
    : !1;
}
function Se(e) {
  return !!(e && typeof e == `object` && typeof e.then == `function`);
}
var Ce = /[\x00-\x1f\x7f"<>`{}]/g;
function we(e) {
  return e.replace(Ce, (e) => `%` + e.charCodeAt(0).toString(16).toUpperCase().padStart(2, `0`));
}
function Te(e) {
  let t;
  try {
    t = decodeURI(e);
  } catch {
    t = e.replaceAll(/%[0-9A-F]{2}/gi, (e) => {
      try {
        return decodeURI(e);
      } catch {
        return e;
      }
    });
  }
  return we(t);
}
var Ee = [`http:`, `https:`, `mailto:`, `tel:`];
function De(e, t) {
  if (!e) return !1;
  try {
    let n = new URL(e);
    return !t.has(n.protocol);
  } catch {
    return !1;
  }
}
var Oe = {
    "&": `\\u0026`,
    ">": `\\u003e`,
    "<": `\\u003c`,
    "\u2028": `\\u2028`,
    "\u2029": `\\u2029`,
  },
  ke = /[&><\u2028\u2029]/g;
function Ae(e) {
  return e.replace(ke, (e) => Oe[e]);
}
function je(e) {
  if (!e || (!/[%\\\x00-\x1f\x7f]/.test(e) && !e.startsWith(`//`)))
    return { path: e, handledProtocolRelativeURL: !1 };
  let t = /%25|%5C/gi,
    n = 0,
    r = ``,
    i;
  for (; (i = t.exec(e)) !== null;) ((r += Te(e.slice(n, i.index)) + i[0]), (n = t.lastIndex));
  r += Te(n ? e.slice(n) : e);
  let a = !1;
  return (
    r.startsWith(`//`) && ((a = !0), (r = `/` + r.replace(/^\/+/, ``))),
    { path: r, handledProtocolRelativeURL: a }
  );
}
function Me(e) {
  return /\s|[^\u0000-\u007F]/.test(e) ? e.replace(/\s|[^\u0000-\u007F]/gu, encodeURIComponent) : e;
}
function Ne(e, t) {
  if (e === t) return !0;
  if (e.length !== t.length) return !1;
  for (let n = 0; n < e.length; n++) if (e[n] !== t[n]) return !1;
  return !0;
}
function Pe() {
  throw Error(`Invariant failed`);
}
function Fe(e) {
  let t = new Map(),
    n,
    r,
    i = (e) => {
      e.next &&
        (e.prev
          ? ((e.prev.next = e.next),
            (e.next.prev = e.prev),
            (e.next = void 0),
            r && ((r.next = e), (e.prev = r)))
          : ((e.next.prev = void 0),
            (n = e.next),
            (e.next = void 0),
            r && ((e.prev = r), (r.next = e))),
        (r = e));
    };
  return {
    get(e) {
      let n = t.get(e);
      if (n) return (i(n), n.value);
    },
    set(a, o) {
      if (t.size >= e && n) {
        let e = n;
        (t.delete(e.key),
          e.next && ((n = e.next), (e.next.prev = void 0)),
          e === r && (r = void 0));
      }
      let s = t.get(a);
      if (s) ((s.value = o), i(s));
      else {
        let e = { key: a, value: o, prev: r };
        (r && (r.next = e), (r = e), (n ||= e), t.set(a, e));
      }
    },
    clear() {
      (t.clear(), (n = void 0), (r = void 0));
    },
  };
}
var Ie = 4,
  Le = 5;
function Re(e) {
  let t = e.indexOf(`{`);
  if (t === -1) return null;
  let n = e.indexOf(`}`, t);
  return n === -1 || t + 1 >= e.length ? null : [t, n];
}
function ze(e, t, n = new Uint16Array(6)) {
  let r = e.indexOf(`/`, t),
    i = r === -1 ? e.length : r,
    a = e.substring(t, i);
  if (!a || !a.includes(`$`))
    return ((n[0] = 0), (n[1] = t), (n[2] = t), (n[3] = i), (n[4] = i), (n[5] = i), n);
  if (a === `$`) {
    let r = e.length;
    return ((n[0] = 2), (n[1] = t), (n[2] = t), (n[3] = r), (n[4] = r), (n[5] = r), n);
  }
  if (a.charCodeAt(0) === 36)
    return ((n[0] = 1), (n[1] = t), (n[2] = t + 1), (n[3] = i), (n[4] = i), (n[5] = i), n);
  let o = Re(a);
  if (o) {
    let [r, s] = o,
      c = a.charCodeAt(r + 1);
    if (c === 45) {
      if (r + 2 < a.length && a.charCodeAt(r + 2) === 36) {
        let e = r + 3,
          a = s;
        if (e < a)
          return (
            (n[0] = 3),
            (n[1] = t + r),
            (n[2] = t + e),
            (n[3] = t + a),
            (n[4] = t + s + 1),
            (n[5] = i),
            n
          );
      }
    } else if (c === 36) {
      let a = r + 1,
        o = r + 2;
      return o === s
        ? ((n[0] = 2),
          (n[1] = t + r),
          (n[2] = t + a),
          (n[3] = t + o),
          (n[4] = t + s + 1),
          (n[5] = e.length),
          n)
        : ((n[0] = 1),
          (n[1] = t + r),
          (n[2] = t + o),
          (n[3] = t + s),
          (n[4] = t + s + 1),
          (n[5] = i),
          n);
    }
  }
  return ((n[0] = 0), (n[1] = t), (n[2] = t), (n[3] = i), (n[4] = i), (n[5] = i), n);
}
function Be(e, t, n, r, i, a, o) {
  o?.(n);
  let s = r;
  {
    let r = n.fullPath ?? n.from,
      o = r.length,
      c = n.options?.caseSensitive ?? e,
      l = n.options?.params?.parse ?? n.options?.parseParams;
    for (; s < o;) {
      let e = ze(r, s, t),
        o,
        u = s,
        d = e[5];
      switch (((s = d + 1), a++, e[0])) {
        case 0: {
          let t = r.substring(e[2], e[3]);
          if (c) {
            let e = i.static?.get(t);
            if (e) o = e;
            else {
              i.static ??= new Map();
              let e = Ue(n.fullPath ?? n.from);
              ((e.parent = i), (e.depth = a), (o = e), i.static.set(t, e));
            }
          } else {
            let e = t.toLowerCase(),
              r = i.staticInsensitive?.get(e);
            if (r) o = r;
            else {
              i.staticInsensitive ??= new Map();
              let t = Ue(n.fullPath ?? n.from);
              ((t.parent = i), (t.depth = a), (o = t), i.staticInsensitive.set(e, t));
            }
          }
          break;
        }
        case 1: {
          let t = r.substring(u, e[1]),
            s = r.substring(e[4], d),
            f = c && !!(t || s),
            p = t ? (f ? t : t.toLowerCase()) : void 0,
            m = s ? (f ? s : s.toLowerCase()) : void 0,
            h =
              !l &&
              i.dynamic?.find(
                (e) => !e.parse && e.caseSensitive === f && e.prefix === p && e.suffix === m,
              );
          if (h) o = h;
          else {
            let e = We(1, n.fullPath ?? n.from, f, p, m);
            ((o = e), (e.depth = a), (e.parent = i), (i.dynamic ??= []), i.dynamic.push(e));
          }
          break;
        }
        case 3: {
          let t = r.substring(u, e[1]),
            s = r.substring(e[4], d),
            f = c && !!(t || s),
            p = t ? (f ? t : t.toLowerCase()) : void 0,
            m = s ? (f ? s : s.toLowerCase()) : void 0,
            h =
              !l &&
              i.optional?.find(
                (e) => !e.parse && e.caseSensitive === f && e.prefix === p && e.suffix === m,
              );
          if (h) o = h;
          else {
            let e = We(3, n.fullPath ?? n.from, f, p, m);
            ((o = e), (e.parent = i), (e.depth = a), (i.optional ??= []), i.optional.push(e));
          }
          break;
        }
        case 2: {
          let t = r.substring(u, e[1]),
            s = r.substring(e[4], d),
            l = c && !!(t || s),
            f = t ? (l ? t : t.toLowerCase()) : void 0,
            p = s ? (l ? s : s.toLowerCase()) : void 0,
            m = We(2, n.fullPath ?? n.from, l, f, p);
          ((o = m), (m.parent = i), (m.depth = a), (i.wildcard ??= []), i.wildcard.push(m));
        }
      }
      i = o;
    }
    if (l && n.children && !n.isRoot && n.id && n.id.charCodeAt(n.id.lastIndexOf(`/`) + 1) === 95) {
      let e = Ue(n.fullPath ?? n.from);
      ((e.kind = Le),
        (e.parent = i),
        a++,
        (e.depth = a),
        (i.pathless ??= []),
        i.pathless.push(e),
        (i = e));
    }
    let u = (n.path || !n.children) && !n.isRoot;
    if (u && r.endsWith(`/`)) {
      let e = Ue(n.fullPath ?? n.from);
      ((e.kind = Ie), (e.parent = i), a++, (e.depth = a), (i.index = e), (i = e));
    }
    ((i.parse = l ?? null),
      (i.priority = n.options?.params?.priority ?? 0),
      u && !i.route && ((i.route = n), (i.fullPath = n.fullPath ?? n.from)));
  }
  if (n.children) for (let r of n.children) Be(e, t, r, s, i, a, o);
}
function Ve(e, t) {
  if (e.parse && !t.parse) return -1;
  if (!e.parse && t.parse) return 1;
  if (e.parse && t.parse && (e.priority || t.priority)) return t.priority - e.priority;
  if (e.prefix && t.prefix && e.prefix !== t.prefix) {
    if (e.prefix.startsWith(t.prefix)) return -1;
    if (t.prefix.startsWith(e.prefix)) return 1;
  }
  if (e.suffix && t.suffix && e.suffix !== t.suffix) {
    if (e.suffix.endsWith(t.suffix)) return -1;
    if (t.suffix.endsWith(e.suffix)) return 1;
  }
  return e.prefix && !t.prefix
    ? -1
    : !e.prefix && t.prefix
      ? 1
      : e.suffix && !t.suffix
        ? -1
        : !e.suffix && t.suffix
          ? 1
          : e.caseSensitive && !t.caseSensitive
            ? -1
            : !e.caseSensitive && t.caseSensitive
              ? 1
              : 0;
}
function He(e) {
  if (e.pathless) for (let t of e.pathless) He(t);
  if (e.static) for (let t of e.static.values()) He(t);
  if (e.staticInsensitive) for (let t of e.staticInsensitive.values()) He(t);
  if (e.dynamic?.length) {
    e.dynamic.sort(Ve);
    for (let t of e.dynamic) He(t);
  }
  if (e.optional?.length) {
    e.optional.sort(Ve);
    for (let t of e.optional) He(t);
  }
  if (e.wildcard?.length) {
    e.wildcard.sort(Ve);
    for (let t of e.wildcard) He(t);
  }
}
function Ue(e) {
  return {
    kind: 0,
    depth: 0,
    pathless: null,
    index: null,
    static: null,
    staticInsensitive: null,
    dynamic: null,
    optional: null,
    wildcard: null,
    route: null,
    fullPath: e,
    parent: null,
    parse: null,
    priority: 0,
  };
}
function We(e, t, n, r, i) {
  return {
    kind: e,
    depth: 0,
    pathless: null,
    index: null,
    static: null,
    staticInsensitive: null,
    dynamic: null,
    optional: null,
    wildcard: null,
    route: null,
    fullPath: t,
    parent: null,
    parse: null,
    priority: 0,
    caseSensitive: n,
    prefix: r,
    suffix: i,
  };
}
function Ge(e, t) {
  let n = Ue(`/`),
    r = new Uint16Array(6);
  for (let t of e) Be(!1, r, t, 1, n, 0);
  (He(n), (t.masksTree = n), (t.flatCache = Fe(1e3)));
}
function Ke(e, t) {
  e ||= `/`;
  let n = t.flatCache.get(e);
  if (n) return n;
  let r = Ze(e, t.masksTree);
  return (t.flatCache.set(e, r), r);
}
function qe(e, t, n, r, i) {
  ((e ||= `/`), (r ||= `/`));
  let a = t ? `case\0${e}` : e,
    o = i.singleCache.get(a);
  return (
    o || ((o = Ue(`/`)), Be(t, new Uint16Array(6), { from: e }, 1, o, 0), i.singleCache.set(a, o)),
    Ze(r, o, n)
  );
}
function Je(e, t, n = !1) {
  let r = n ? e : `nofuzz\0${e}`,
    i = t.matchCache.get(r);
  if (i !== void 0) return i;
  e ||= `/`;
  let a;
  try {
    a = Ze(e, t.segmentTree, n);
  } catch (e) {
    if (e instanceof URIError) a = null;
    else throw e;
  }
  return (a && (a.branch = $e(a.route)), t.matchCache.set(r, a), a);
}
function Ye(e) {
  return e === `/` ? e : e.replace(/\/{1,}$/, ``);
}
function Xe(e, t = !1, n) {
  let r = Ue(e.fullPath),
    i = new Uint16Array(6),
    a = {},
    o = {},
    s = 0;
  return (
    Be(t, i, e, 1, r, 0, (e) => {
      if ((n?.(e, s), e.id in a && Pe(), (a[e.id] = e), s !== 0 && e.path)) {
        let t = Ye(e.fullPath);
        (!o[t] || e.fullPath.endsWith(`/`)) && (o[t] = e);
      }
      s++;
    }),
    He(r),
    {
      processedTree: {
        segmentTree: r,
        singleCache: Fe(1e3),
        matchCache: Fe(1e3),
        flatCache: null,
        masksTree: null,
      },
      routesById: a,
      routesByPath: o,
    }
  );
}
function Ze(e, t, n = !1) {
  let r = e.split(`/`),
    i = tt(e, r, t, n);
  if (!i) return null;
  let [a] = Qe(e, r, i);
  return { route: i.node.route, rawParams: a };
}
function Qe(e, t, n) {
  let r = et(n.node),
    i = null,
    a = Object.create(null),
    o = n.extract?.part ?? 0,
    s = n.extract?.node ?? 0,
    c = n.extract?.path ?? 0,
    l = n.extract?.segment ?? 0;
  for (; s < r.length; o++, s++, c++, l++) {
    let u = r[s];
    if (u.kind === Ie) break;
    if (u.kind === Le) {
      (l--, o--, c--);
      continue;
    }
    let d = t[o],
      f = c;
    if ((d && (c += d.length), u.kind === 1)) {
      i ??= n.node.fullPath.split(`/`);
      let e = i[l],
        t = u.prefix?.length ?? 0;
      if (e.charCodeAt(t) === 123) {
        let n = u.suffix?.length ?? 0,
          r = e.substring(t + 2, e.length - n - 1),
          i = d.substring(t, d.length - n);
        a[r] = decodeURIComponent(i);
      } else {
        let t = e.substring(1);
        a[t] = decodeURIComponent(d);
      }
    } else if (u.kind === 3) {
      if (n.skipped & (1 << s)) {
        (o--, (c = f - 1));
        continue;
      }
      i ??= n.node.fullPath.split(`/`);
      let e = i[l],
        t = u.prefix?.length ?? 0,
        r = u.suffix?.length ?? 0,
        p = e.substring(t + 3, e.length - r - 1),
        m = u.suffix || u.prefix ? d.substring(t, d.length - r) : d;
      m && (a[p] = decodeURIComponent(m));
    } else if (u.kind === 2) {
      let t = u,
        n = e.substring(f + (t.prefix?.length ?? 0), e.length - (t.suffix?.length ?? 0)),
        r = decodeURIComponent(n);
      ((a[`*`] = r), (a._splat = r));
      break;
    }
  }
  return (
    n.rawParams && Object.assign(a, n.rawParams),
    [a, { part: o, node: s, path: c, segment: l }]
  );
}
function $e(e) {
  let t = [e];
  for (; e.parentRoute;) ((e = e.parentRoute), t.push(e));
  return (t.reverse(), t);
}
function et(e) {
  let t = Array(e.depth + 1);
  do ((t[e.depth] = e), (e = e.parent));
  while (e);
  return t;
}
function tt(e, t, n, r) {
  if (e === `/` && n.index) return { node: n.index, skipped: 0 };
  let i = !D(t),
    a = i && e !== `/`,
    o = t.length - +!!i,
    s = [{ node: n, index: 1, skipped: 0, depth: 1, statics: 0, dynamics: 0, optionals: 0 }],
    c = null,
    l = null;
  for (; s.length;) {
    let n = s.pop(),
      { node: i, index: u, skipped: d, depth: f, statics: p, dynamics: m, optionals: h } = n,
      { extract: g, rawParams: _ } = n;
    if (i.kind === 2 && i.route && !at(l, n)) continue;
    if (i.parse) {
      if (!it(e, t, n)) continue;
      ((_ = n.rawParams), (g = n.extract));
    }
    r && i.route && i.kind !== Ie && at(c, n) && (c = n);
    let v = u === o;
    if (
      v &&
      (i.route && (!a || i.kind === Ie || i.kind === 2) && at(l, n) && (l = n),
      !i.optional && !i.wildcard && !i.index && !i.pathless)
    )
      continue;
    let y = v ? void 0 : t[u],
      b;
    if (v && i.index) {
      let n = {
          node: i.index,
          index: u,
          skipped: d,
          depth: f + 1,
          statics: p,
          dynamics: m,
          optionals: h,
          extract: g,
          rawParams: _,
        },
        r = !0;
      if ((i.index.parse && (it(e, t, n) || (r = !1)), r)) {
        if (!m && !h && !d && rt(p, o)) return n;
        at(l, n) && (l = n);
      }
    }
    if (i.wildcard)
      for (let e = i.wildcard.length - 1; e >= 0; e--) {
        let n = i.wildcard[e],
          { prefix: r, suffix: a } = n;
        if (!(r && (v || !(n.caseSensitive ? y : (b ??= y.toLowerCase())).startsWith(r)))) {
          if (a) {
            if (v) continue;
            let e = t.slice(u).join(`/`).slice(-a.length);
            if ((n.caseSensitive ? e : e.toLowerCase()) !== a) continue;
          }
          s.push({
            node: n,
            index: o,
            skipped: d,
            depth: f + 1,
            statics: p,
            dynamics: m,
            optionals: h,
            extract: g,
            rawParams: _,
          });
        }
      }
    if (i.optional) {
      let e = d | (1 << f),
        t = f + 1;
      for (let n = i.optional.length - 1; n >= 0; n--) {
        let r = i.optional[n];
        s.push({
          node: r,
          index: u,
          skipped: e,
          depth: t,
          statics: p,
          dynamics: m,
          optionals: h,
          extract: g,
          rawParams: _,
        });
      }
      if (!v)
        for (let e = i.optional.length - 1; e >= 0; e--) {
          let n = i.optional[e],
            { prefix: r, suffix: a } = n;
          if (r || a) {
            let e = n.caseSensitive ? y : (b ??= y.toLowerCase());
            if ((r && !e.startsWith(r)) || (a && !e.endsWith(a))) continue;
          }
          s.push({
            node: n,
            index: u + 1,
            skipped: d,
            depth: t,
            statics: p,
            dynamics: m,
            optionals: h + nt(o, u),
            extract: g,
            rawParams: _,
          });
        }
    }
    if (!v && i.dynamic && y)
      for (let e = i.dynamic.length - 1; e >= 0; e--) {
        let t = i.dynamic[e],
          { prefix: n, suffix: r } = t;
        if (n || r) {
          let e = t.caseSensitive ? y : (b ??= y.toLowerCase());
          if ((n && !e.startsWith(n)) || (r && !e.endsWith(r))) continue;
        }
        s.push({
          node: t,
          index: u + 1,
          skipped: d,
          depth: f + 1,
          statics: p,
          dynamics: m + nt(o, u),
          optionals: h,
          extract: g,
          rawParams: _,
        });
      }
    if (!v && i.staticInsensitive) {
      let e = i.staticInsensitive.get((b ??= y.toLowerCase()));
      e &&
        s.push({
          node: e,
          index: u + 1,
          skipped: d,
          depth: f + 1,
          statics: p + nt(o, u),
          dynamics: m,
          optionals: h,
          extract: g,
          rawParams: _,
        });
    }
    if (!v && i.static) {
      let e = i.static.get(y);
      e &&
        s.push({
          node: e,
          index: u + 1,
          skipped: d,
          depth: f + 1,
          statics: p + nt(o, u),
          dynamics: m,
          optionals: h,
          extract: g,
          rawParams: _,
        });
    }
    if (i.pathless) {
      let e = f + 1;
      for (let t = i.pathless.length - 1; t >= 0; t--) {
        let n = i.pathless[t];
        s.push({
          node: n,
          index: u,
          skipped: d,
          depth: e,
          statics: p,
          dynamics: m,
          optionals: h,
          extract: g,
          rawParams: _,
        });
      }
    }
  }
  if (l) return l;
  if (r && c) {
    let n = c.index;
    for (let e = 0; e < c.index; e++) n += t[e].length;
    let r = n === e.length ? `/` : e.slice(n);
    return ((c.rawParams ??= Object.create(null)), (c.rawParams[`**`] = decodeURIComponent(r)), c);
  }
  return null;
}
function nt(e, t) {
  return 2 ** (e - t - 1);
}
function rt(e, t) {
  return e === 2 ** (t - 1) - 1;
}
function it(e, t, n) {
  let r, i;
  try {
    [r, i] = Qe(e, t, n);
  } catch {
    return null;
  }
  if (((n.rawParams = r), (n.extract = i), !n.node.parse)) return !0;
  try {
    if (n.node.parse(r) === !1) return null;
  } catch {}
  return !0;
}
function at(e, t) {
  return (
    !e ||
    t.statics > e.statics ||
    (t.statics === e.statics &&
      (t.dynamics > e.dynamics ||
        (t.dynamics === e.dynamics &&
          (t.optionals > e.optionals ||
            (t.optionals === e.optionals &&
              ((t.node.kind === Ie) > (e.node.kind === Ie) ||
                ((t.node.kind === Ie) == (e.node.kind === Ie) && t.depth > e.depth)))))))
  );
}
function ot(e) {
  return st(e.filter((e) => e !== void 0).join(`/`));
}
function st(e) {
  return e.replace(/\/{2,}/g, `/`);
}
function ct(e) {
  return e === `/` ? e : e.replace(/^\/{1,}/, ``);
}
function lt(e) {
  let t = e.length;
  return t > 1 && e[t - 1] === `/` ? e.replace(/\/{1,}$/, ``) : e;
}
function ut(e) {
  return lt(ct(e));
}
function dt(e, t) {
  return e?.endsWith(`/`) && e !== `/` && e !== `${t}/` ? e.slice(0, -1) : e;
}
function ft(e, t, n) {
  return dt(e, n) === dt(t, n);
}
function pt({ base: e, to: t, trailingSlash: n = `never`, cache: r }) {
  let i = t.startsWith(`/`),
    a = !i && t === `.`,
    o;
  if (r) {
    o = i ? t : a ? e : e + `\0` + t;
    let n = r.get(o);
    if (n) return n;
  }
  let s;
  if (a) s = e.split(`/`);
  else if (i) s = t.split(`/`);
  else {
    for (s = e.split(`/`); s.length > 1 && D(s) === ``;) s.pop();
    let n = t.split(`/`);
    for (let e = 0, t = n.length; e < t; e++) {
      let r = n[e];
      r === ``
        ? e
          ? e === t - 1 && s.push(r)
          : (s = [r])
        : r === `..`
          ? s.pop()
          : r === `.` || s.push(r);
    }
  }
  s.length > 1 && (D(s) === `` ? n === `never` && s.pop() : n === `always` && s.push(``));
  let c = st(s.join(`/`)) || `/`;
  return (o && r && r.set(o, c), c);
}
function mt(e) {
  let t = new Map(e.map((e) => [encodeURIComponent(e), e])),
    n = Array.from(t.keys())
      .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`))
      .join(`|`),
    r = new RegExp(n, `g`);
  return (e) => e.replace(r, (e) => t.get(e) ?? e);
}
function ht(e, t, n) {
  let r = t[e];
  return typeof r == `string`
    ? e === `_splat`
      ? /^[a-zA-Z0-9\-._~!/]*$/.test(r)
        ? r
        : r
            .split(`/`)
            .map((e) => _t(e, n))
            .join(`/`)
      : _t(r, n)
    : r;
}
function gt({ path: e, params: t, decoder: n, ...r }) {
  let i = !1,
    a = Object.create(null);
  if (!e || e === `/`) return { interpolatedPath: `/`, usedParams: a, isMissingParams: i };
  if (!e.includes(`$`)) return { interpolatedPath: e, usedParams: a, isMissingParams: i };
  let o = e.length,
    s = 0,
    c,
    l = ``;
  for (; s < o;) {
    let r = s;
    c = ze(e, r, c);
    let o = c[5];
    if (((s = o + 1), r === o)) continue;
    let u = c[0];
    if (u === 0) {
      l += `/` + e.substring(r, o);
      continue;
    }
    if (u === 2) {
      let s = t._splat;
      ((a._splat = s), (a[`*`] = s));
      let u = e.substring(r, c[1]),
        d = e.substring(c[4], o);
      if (!s) {
        ((i = !0), (u || d) && (l += `/` + u + d));
        continue;
      }
      let f = ht(`_splat`, t, n);
      l += `/` + u + f + d;
      continue;
    }
    if (u === 1) {
      let s = e.substring(c[2], c[3]);
      (!i && !(s in t) && (i = !0), (a[s] = t[s]));
      let u = e.substring(r, c[1]),
        d = e.substring(c[4], o),
        f = ht(s, t, n) ?? `undefined`;
      l += `/` + u + f + d;
      continue;
    }
    if (u === 3) {
      let i = e.substring(c[2], c[3]),
        s = t[i];
      if (s == null) continue;
      a[i] = s;
      let u = e.substring(r, c[1]),
        d = e.substring(c[4], o),
        f = ht(i, t, n) ?? ``;
      l += `/` + u + f + d;
      continue;
    }
  }
  return (
    e.endsWith(`/`) && (l += `/`),
    { usedParams: a, interpolatedPath: l || `/`, isMissingParams: i }
  );
}
function _t(e, t) {
  let n = encodeURIComponent(e);
  return t?.(n) ?? n;
}
function vt(e) {
  return e?.isNotFound === !0;
}
function yt() {
  try {
    return sessionStorage;
  } catch {
    return;
  }
}
var bt = `tsr-scroll-restoration-v1_3`,
  xt = yt();
function St() {
  try {
    return JSON.parse(xt?.getItem(`tsr-scroll-restoration-v1_3`) || `{}`);
  } catch {
    return {};
  }
}
function Ct() {
  try {
    xt?.setItem(bt, JSON.stringify(wt));
  } catch {}
}
var wt = St(),
  Tt = `data-scroll-restoration-id`,
  Et = (e) => e.state.__TSR_key || e.href;
function Dt(e) {
  let t = e.getAttribute(Tt);
  if (t) return `[${Tt}="${t}"]`;
  let n = ``,
    r = e,
    i;
  for (; (i = r.parentNode);) {
    let e = 1,
      t = r;
    for (; (t = t.previousElementSibling);) e++;
    let a = `${r.localName}:nth-child(${e})`;
    ((n = n ? `${a} > ${n}` : a), (r = i));
  }
  return n;
}
var Ot = !1,
  kt = `window`;
function At(e) {
  try {
    return typeof e == `function` ? e() : document.querySelector(e);
  } catch {}
}
function jt(e) {
  let t = new Set();
  for (let n of e) {
    if (n === kt) continue;
    let e = At(n);
    e && t.add(e);
  }
  return t;
}
function Mt(e, t) {
  let n = t ?? e.options.scrollRestoration,
    r = e._scroll;
  n && (r.restoring = !0);
  let i = e.options.getScrollRestorationKey || Et,
    a = new Set(),
    o = (e) => {
      let t = (wt[e] ||= {});
      for (let e of a)
        e === document
          ? (t[kt] = { scrollX, scrollY })
          : e.isConnected && (t[Dt(e)] = { scrollX: e.scrollLeft, scrollY: e.scrollTop });
    };
  (n &&
    !r.restoration &&
    ((r.restoration = !0),
    (Ot = !1),
    (history.scrollRestoration = `manual`),
    document.addEventListener(
      `scroll`,
      (e) => {
        Ot || a.add(e.target);
      },
      !0,
    ),
    e.subscribe(`onBeforeLoad`, (e) => {
      (e.fromLocation && o(i(e.fromLocation)), a.clear());
    }),
    addEventListener(`pagehide`, () => {
      (o(i(e.stores.resolvedLocation.get() ?? e.stores.location.get())), Ct());
    })),
    !r.reset &&
      ((r.reset = !0),
      e.subscribe(`onRendered`, (t) => {
        let n = e.options.scrollRestorationBehavior,
          o = e.options.scrollToTopSelectors,
          s = r.next,
          c = r.hash,
          l;
        if (
          (a.clear(),
          (r.next = !0),
          (r.hash = !1),
          typeof e.options.scrollRestoration == `function` &&
            !e.options.scrollRestoration({ location: e.latestLocation }))
        )
          return;
        let u = i(t.toLocation),
          d = t.fromLocation && i(t.fromLocation);
        if (r.restoring && d && d !== u) {
          let e = wt[d];
          if (e) {
            let t = wt[u];
            for (let n in e) {
              if (n === kt) {
                if (s) continue;
              } else {
                let e = At(n);
                if (!e || (s && o && ((l ??= jt(o)), l.has(e)))) continue;
              }
              ((t ||= wt[u] = {}), (t[n] ??= e[n]));
            }
          }
        }
        Ot = !0;
        try {
          let e = t.toLocation.hash,
            i = t.toLocation.state.__hashScrollIntoViewOptions ?? !0,
            a = !1;
          if (s) {
            !e && o && (l ??= jt(o));
            let t = e && i && c,
              s = r.restoring ? wt[u] : void 0;
            if (s)
              for (let e in s) {
                let { scrollX: r, scrollY: i } = s[e];
                if (e === kt) {
                  if (t) continue;
                  (scrollTo({ top: i, left: r, behavior: n }), (a = !0));
                } else {
                  let t = At(e);
                  t && ((t.scrollLeft = r), (t.scrollTop = i), l?.delete(t));
                }
              }
            if (!e) {
              let e = { top: 0, left: 0, behavior: n };
              if ((a || scrollTo(e), l)) for (let t of l) t.scrollTo(e);
            }
          }
          !a && e && i && document.getElementById(e)?.scrollIntoView(i);
        } finally {
          Ot = !1;
        }
      })));
}
function Nt(e, t = String) {
  let n = new URLSearchParams();
  for (let r in e) {
    let i = e[r];
    i !== void 0 && n.set(r, t(i));
  }
  return n.toString();
}
function Pt(e) {
  return e ? (e === `false` ? !1 : e === `true` ? !0 : e * 0 == 0 && +e + `` === e ? +e : e) : ``;
}
function Ft(e) {
  let t = new URLSearchParams(e),
    n = Object.create(null);
  for (let [e, r] of t.entries()) {
    let t = n[e];
    t == null ? (n[e] = Pt(r)) : Array.isArray(t) ? t.push(Pt(r)) : (n[e] = [t, Pt(r)]);
  }
  return n;
}
var It = Rt(JSON.parse),
  Lt = zt(JSON.stringify, JSON.parse);
function Rt(e) {
  return (t) => {
    t[0] === `?` && (t = t.substring(1));
    let n = Ft(t);
    for (let t in n) {
      let r = n[t];
      if (typeof r == `string`)
        try {
          n[t] = e(r);
        } catch {}
    }
    return n;
  };
}
function zt(e, t) {
  let n = typeof t == `function`;
  function r(r) {
    if (typeof r == `object` && r)
      try {
        return e(r);
      } catch {}
    else if (n && typeof r == `string`)
      try {
        return (t(r), e(r));
      } catch {}
    return r;
  }
  return (e) => {
    let t = Nt(e, r);
    return t ? `?${t}` : ``;
  };
}
var Bt = `__root__`;
function Vt(e) {
  if (
    ((e.statusCode = e.statusCode || e.code || 307),
    !e._builtLocation && !e.reloadDocument && typeof e.href == `string`)
  )
    try {
      (new URL(e.href), (e.reloadDocument = !0));
    } catch {}
  let t = new Headers(e.headers);
  e.href && t.get(`Location`) === null && t.set(`Location`, e.href);
  let n = new Response(null, { status: e.statusCode, headers: t });
  if (((n.options = e), e.throw)) throw n;
  return n;
}
function Ht(e) {
  return e instanceof Response && !!e.options;
}
function Ut(e) {
  if (typeof e == `object` && e && e.isSerializedRedirect) return Vt(e);
}
function Wt(e) {
  return {
    input: ({ url: t }) => {
      for (let n of e) t = Kt(n, t);
      return t;
    },
    output: ({ url: t }) => {
      for (let n = e.length - 1; n >= 0; n--) t = qt(e[n], t);
      return t;
    },
  };
}
function Gt(e) {
  let t = ut(e.basepath),
    n = `/${t}`,
    r = e.caseSensitive ? n : n.toLowerCase(),
    i = `${r}/`;
  return {
    input: ({ url: t }) => {
      let a = e.caseSensitive ? t.pathname : t.pathname.toLowerCase();
      return (
        a === r ? (t.pathname = `/`) : a.startsWith(i) && (t.pathname = t.pathname.slice(n.length)),
        t
      );
    },
    output: ({ url: e }) => ((e.pathname = ot([`/`, t, e.pathname])), e),
  };
}
function Kt(e, t) {
  let n = e?.input?.({ url: t });
  if (n) {
    if (typeof n == `string`) return new URL(n);
    if (n instanceof URL) return n;
  }
  return t;
}
function qt(e, t) {
  let n = e?.output?.({ url: t });
  if (n) {
    if (typeof n == `string`) return new URL(n);
    if (n instanceof URL) return n;
  }
  return t;
}
function Jt(e, t) {
  let { createMutableStore: n, createReadonlyStore: r, batch: i, init: a } = t,
    o = new Map(),
    s = new Map(),
    c = new Map(),
    l = n(e.status),
    u = n(e.loadedAt),
    d = n(e.isLoading),
    f = n(e.isTransitioning),
    p = n(e.location),
    m = n(e.resolvedLocation),
    h = n(e.statusCode),
    g = n(e.redirect),
    _ = n([]),
    v = n([]),
    y = n([]),
    b = r(() => Yt(o, _.get())),
    x = r(() => Yt(s, v.get())),
    S = r(() => Yt(c, y.get())),
    C = r(() => _.get()[0]),
    ee = r(() => _.get().some((e) => o.get(e)?.get().status === `pending`)),
    te = r(() => ({
      locationHref: p.get().href,
      resolvedLocationHref: m.get()?.href,
      status: l.get(),
    })),
    ne = r(() => ({
      status: l.get(),
      loadedAt: u.get(),
      isLoading: d.get(),
      isTransitioning: f.get(),
      matches: b.get(),
      location: p.get(),
      resolvedLocation: m.get(),
      statusCode: h.get(),
      redirect: g.get(),
    })),
    re = Fe(64);
  function w(e) {
    let t = re.get(e);
    return (
      t ||
        ((t = r(() => {
          let t = _.get();
          for (let n of t) {
            let t = o.get(n);
            if (t && t.routeId === e) return t.get();
          }
        })),
        re.set(e, t)),
      t
    );
  }
  let ie = {
    status: l,
    loadedAt: u,
    isLoading: d,
    isTransitioning: f,
    location: p,
    resolvedLocation: m,
    statusCode: h,
    redirect: g,
    matchesId: _,
    pendingIds: v,
    cachedIds: y,
    matches: b,
    pendingMatches: x,
    cachedMatches: S,
    firstId: C,
    hasPending: ee,
    matchRouteDeps: te,
    matchStores: o,
    pendingMatchStores: s,
    cachedMatchStores: c,
    __store: ne,
    getRouteMatchStore: w,
    setMatches: ae,
    setPending: oe,
    setCached: se,
  };
  (ae(e.matches), a?.(ie));
  function ae(e) {
    Xt(e, o, _, n, i);
  }
  function oe(e) {
    Xt(e, s, v, n, i);
  }
  function se(e) {
    Xt(e, c, y, n, i);
  }
  return ie;
}
function Yt(e, t) {
  let n = [];
  for (let r of t) {
    let t = e.get(r);
    t && n.push(t.get());
  }
  return n;
}
function Xt(e, t, n, r, i) {
  let a = e.map((e) => e.id),
    o = new Set(a);
  i(() => {
    for (let e of t.keys()) o.has(e) || t.delete(e);
    for (let n of e) {
      let e = t.get(n.id);
      if (!e) {
        let e = r(n);
        ((e.routeId = n.routeId), t.set(n.id, e));
        continue;
      }
      ((e.routeId = n.routeId), e.get() !== n && e.set(n));
    }
    Ne(n.get(), a) || n.set(a);
  });
}
var Zt = (e) => {
    if (!e.rendered) return ((e.rendered = !0), e.onReady?.());
  },
  Qt = (e) =>
    e.stores.matchesId.get().some((t) => e.stores.matchStores.get(t)?.get()._forcePending),
  $t = (e, t) => !!(e.preload && !e.router.stores.matchStores.has(t)),
  en = (e, t, n = !0) => {
    let r = { ...(e.router.options.context ?? {}) },
      i = n ? t : t - 1;
    for (let t = 0; t <= i; t++) {
      let n = e.matches[t];
      if (!n) continue;
      let i = e.router.getMatch(n.id);
      i && Object.assign(r, i.__routeContext, i.__beforeLoadContext);
    }
    return r;
  },
  tn = (e, t) => {
    if (!e.matches.length) return;
    let n = t.routeId,
      r = e.matches.findIndex((t) => t.routeId === e.router.routeTree.id),
      i = r >= 0 ? r : 0,
      a = n
        ? e.matches.findIndex((e) => e.routeId === n)
        : (e.firstBadMatchIndex ?? e.matches.length - 1);
    a < 0 && (a = i);
    for (let t = a; t >= 0; t--) {
      let n = e.matches[t];
      if (e.router.looseRoutesById[n.routeId].options.notFoundComponent) return t;
    }
    return n ? a : i;
  },
  nn = (e, t, n) => {
    if (!(!Ht(n) && !vt(n)))
      throw Ht(n) && n.redirectHandled && !n.options.reloadDocument
        ? n
        : (t &&
            (t._nonReactive.beforeLoadPromise?.resolve(),
            t._nonReactive.loaderPromise?.resolve(),
            (t._nonReactive.beforeLoadPromise = void 0),
            (t._nonReactive.loaderPromise = void 0),
            (t._nonReactive.error = n),
            e.updateMatch(t.id, (r) => ({
              ...r,
              status: Ht(n)
                ? `redirected`
                : vt(n)
                  ? `notFound`
                  : r.status === `pending`
                    ? `success`
                    : r.status,
              context: en(e, t.index),
              isFetching: !1,
              error: n,
            })),
            vt(n) && !n.routeId && (n.routeId = t.routeId),
            t._nonReactive.loadPromise?.resolve()),
          Ht(n) &&
            ((e.rendered = !0),
            (n.options._fromLocation = e.location),
            (n.redirectHandled = !0),
            (n = e.router.resolveRedirect(n))),
          n);
  },
  rn = (e, t) => {
    let n = e.router.getMatch(t);
    return !!(!n || n._nonReactive.dehydrated);
  },
  an = (e, t, n) => {
    let r = en(e, n);
    e.updateMatch(t, (e) => ({ ...e, context: r }));
  },
  on = (e, t, n) => {
    let { id: r, routeId: i } = e.matches[t],
      a = e.router.looseRoutesById[i];
    if (n instanceof Promise) throw n;
    ((e.firstBadMatchIndex ??= t), nn(e, e.router.getMatch(r), n));
    try {
      a.options.onError?.(n);
    } catch (t) {
      ((n = t), nn(e, e.router.getMatch(r), n));
    }
    (e.updateMatch(
      r,
      (e) => (
        e._nonReactive.beforeLoadPromise?.resolve(),
        (e._nonReactive.beforeLoadPromise = void 0),
        e._nonReactive.loadPromise?.resolve(),
        {
          ...e,
          error: n,
          status: `error`,
          isFetching: !1,
          updatedAt: Date.now(),
          abortController: new AbortController(),
        }
      ),
    ),
      !e.preload && !Ht(n) && !vt(n) && (e.serialError ??= n));
  },
  sn = (e, t, n, r) => {
    if (r._nonReactive.pendingTimeout !== void 0) return;
    let i = n.options.pendingMs ?? e.router.options.defaultPendingMs;
    if (
      e.onReady &&
      !$t(e, t) &&
      (n.options.loader || n.options.beforeLoad || vn(n)) &&
      typeof i == `number` &&
      i !== 1 / 0 &&
      (n.options.pendingComponent ?? e.router.options?.defaultPendingComponent)
    ) {
      let t = setTimeout(() => {
        Zt(e);
      }, i);
      r._nonReactive.pendingTimeout = t;
    }
  },
  cn = (e, t, n) => {
    let r = e.router.getMatch(t);
    if (!r._nonReactive.beforeLoadPromise && !r._nonReactive.loaderPromise) return;
    sn(e, t, n, r);
    let i = () => {
      let n = e.router.getMatch(t);
      n.preload && (n.status === `redirected` || n.status === `notFound`) && nn(e, n, n.error);
    };
    return r._nonReactive.beforeLoadPromise ? r._nonReactive.beforeLoadPromise.then(i) : i();
  },
  ln = (e, t, n, r) => {
    let i = e.router.getMatch(t),
      a = i._nonReactive.loadPromise;
    i._nonReactive.loadPromise = be(() => {
      (a?.resolve(), (a = void 0));
    });
    let { paramsError: o, searchError: s } = i;
    (o && on(e, n, o), s && on(e, n, s), sn(e, t, r, i));
    let c = new AbortController(),
      l = !1,
      u = () => {
        l ||
          ((l = !0),
          e.updateMatch(t, (e) => ({
            ...e,
            isFetching: `beforeLoad`,
            fetchCount: e.fetchCount + 1,
            abortController: c,
          })));
      },
      d = () => {
        (i._nonReactive.beforeLoadPromise?.resolve(),
          (i._nonReactive.beforeLoadPromise = void 0),
          e.updateMatch(t, (e) => ({ ...e, isFetching: !1 })));
      };
    if (!r.options.beforeLoad) {
      e.router.batch(() => {
        (u(), d());
      });
      return;
    }
    i._nonReactive.beforeLoadPromise = be();
    let f = { ...en(e, n, !1), ...i.__routeContext },
      { search: p, params: m, cause: h } = i,
      g = $t(e, t),
      _ = {
        search: p,
        abortController: c,
        params: m,
        preload: g,
        context: f,
        location: e.location,
        navigate: (t) => e.router.navigate({ ...t, _fromLocation: e.location }),
        buildLocation: e.router.buildLocation,
        cause: g ? `preload` : h,
        matches: e.matches,
        routeId: r.id,
        ...e.router.options.additionalContext,
      },
      v = (r) => {
        if (r === void 0) {
          e.router.batch(() => {
            (u(), d());
          });
          return;
        }
        ((Ht(r) || vt(r)) && (u(), on(e, n, r)),
          e.router.batch(() => {
            (u(), e.updateMatch(t, (e) => ({ ...e, __beforeLoadContext: r })), d());
          }));
      },
      y;
    try {
      if (((y = r.options.beforeLoad(_)), Se(y)))
        return (
          u(),
          y
            .catch((t) => {
              on(e, n, t);
            })
            .then(v)
        );
    } catch (t) {
      (u(), on(e, n, t));
    }
    v(y);
  },
  un = (e, t) => {
    let { id: n, routeId: r } = e.matches[t],
      i = e.router.looseRoutesById[r],
      a = () => s(),
      o = () => ln(e, n, t, i),
      s = () => {
        if (rn(e, n)) return;
        let t = cn(e, n, i);
        return Se(t) ? t.then(o) : o();
      };
    return a();
  },
  dn = (e, t, n) => {
    let r = e.router.getMatch(t);
    if (!r || (!n.options.head && !n.options.scripts && !n.options.headers)) return;
    let i = {
      ssr: e.router.options.ssr,
      matches: e.matches,
      match: r,
      params: r.params,
      loaderData: r.loaderData,
    };
    return Promise.all([n.options.head?.(i), n.options.scripts?.(i), n.options.headers?.(i)]).then(
      ([e, t, n]) => ({
        meta: e?.meta,
        links: e?.links,
        headScripts: e?.scripts,
        headers: n,
        scripts: t,
        styles: e?.styles,
      }),
    );
  },
  fn = (e, t, n, r, i) => {
    let a = t[r - 1],
      { params: o, loaderDeps: s, abortController: c, cause: l } = e.router.getMatch(n),
      u = en(e, r),
      d = $t(e, n);
    return {
      params: o,
      deps: s,
      preload: !!d,
      parentMatchPromise: a,
      abortController: c,
      context: u,
      location: e.location,
      navigate: (t) => e.router.navigate({ ...t, _fromLocation: e.location }),
      cause: d ? `preload` : l,
      route: i,
      ...e.router.options.additionalContext,
    };
  },
  pn = async (e, t, n, r, i) => {
    try {
      let a = e.router.getMatch(n);
      try {
        _n(i);
        let o = i.options.loader,
          s = typeof o == `function` ? o : o?.handler,
          c = s?.(fn(e, t, n, r, i)),
          l = !!s && Se(c);
        if (
          ((l ||
            i._lazyPromise ||
            i._componentsPromise ||
            i.options.head ||
            i.options.scripts ||
            i.options.headers ||
            a._nonReactive.minPendingPromise) &&
            e.updateMatch(n, (e) => ({ ...e, isFetching: `loader` })),
          s)
        ) {
          let t = l ? await c : c;
          (nn(e, e.router.getMatch(n), t),
            t !== void 0 && e.updateMatch(n, (e) => ({ ...e, loaderData: t })));
        }
        i._lazyPromise && (await i._lazyPromise);
        let u = a._nonReactive.minPendingPromise;
        (u && (await u),
          i._componentsPromise && (await i._componentsPromise),
          e.updateMatch(n, (t) => ({
            ...t,
            error: void 0,
            context: en(e, r),
            status: `success`,
            isFetching: !1,
            updatedAt: Date.now(),
          })));
      } catch (t) {
        let o = t;
        if (o?.name === `AbortError`) {
          if (a.abortController.signal.aborted) {
            (a._nonReactive.loaderPromise?.resolve(), (a._nonReactive.loaderPromise = void 0));
            return;
          }
          e.updateMatch(n, (t) => ({
            ...t,
            status: t.status === `pending` ? `success` : t.status,
            isFetching: !1,
            context: en(e, r),
          }));
          return;
        }
        let s = a._nonReactive.minPendingPromise;
        (s && (await s),
          vt(t) && (await i.options.notFoundComponent?.preload?.()),
          nn(e, e.router.getMatch(n), t));
        try {
          i.options.onError?.(t);
        } catch (t) {
          ((o = t), nn(e, e.router.getMatch(n), t));
        }
        (!Ht(o) && !vt(o) && (await _n(i, [`errorComponent`])),
          e.updateMatch(n, (t) => ({
            ...t,
            error: o,
            context: en(e, r),
            status: `error`,
            isFetching: !1,
          })));
      }
    } catch (t) {
      let r = e.router.getMatch(n);
      (r && (r._nonReactive.loaderPromise = void 0), nn(e, r, t));
    }
  },
  mn = async (e, t, n) => {
    async function r(r, a, c, l, d) {
      let f = Date.now() - a.updatedAt,
        p = r
          ? (d.options.preloadStaleTime ?? e.router.options.defaultPreloadStaleTime ?? 3e4)
          : (d.options.staleTime ?? e.router.options.defaultStaleTime ?? 0),
        m = d.options.shouldReload,
        h = typeof m == `function` ? m(fn(e, t, i, n, d)) : m,
        { status: g, invalid: _ } = l,
        v = f >= p && (!!e.forceStaleReload || l.cause === `enter` || (c !== void 0 && c !== l.id));
      ((o = g === `success` && (_ || (h ?? v))),
        (r && d.options.preload === !1) ||
          (o && !e.sync && u
            ? ((s = !0),
              (async () => {
                try {
                  await pn(e, t, i, n, d);
                  let r = e.router.getMatch(i);
                  (r._nonReactive.loaderPromise?.resolve(),
                    r._nonReactive.loadPromise?.resolve(),
                    (r._nonReactive.loaderPromise = void 0),
                    (r._nonReactive.loadPromise = void 0));
                } catch (t) {
                  Ht(t) && (await e.router.navigate(t.options));
                }
              })())
            : g !== `success` || o
              ? await pn(e, t, i, n, d)
              : an(e, i, n)));
    }
    let { id: i, routeId: a } = e.matches[n],
      o = !1,
      s = !1,
      c = e.router.looseRoutesById[a],
      l = c.options.loader,
      u =
        ((typeof l == `function` ? void 0 : l?.staleReloadMode) ??
          e.router.options.defaultStaleReloadMode) !== `blocking`;
    if (rn(e, i)) {
      if (!e.router.getMatch(i)) return e.matches[n];
      an(e, i, n);
    } else {
      let t = e.router.getMatch(i),
        o = e.router.stores.matchesId.get()[n],
        s =
          ((o && e.router.stores.matchStores.get(o)) || null)?.routeId === a
            ? o
            : e.router.stores.matches.get().find((e) => e.routeId === a)?.id,
        l = $t(e, i);
      if (t._nonReactive.loaderPromise) {
        if (t.status === `success` && !e.sync && !t.preload && u) return t;
        await t._nonReactive.loaderPromise;
        let n = e.router.getMatch(i),
          a = n._nonReactive.error || n.error;
        (a && nn(e, n, a), n.status === `pending` && (await r(l, t, s, n, c)));
      } else {
        let n = l && !e.router.stores.matchStores.has(i),
          a = e.router.getMatch(i);
        ((a._nonReactive.loaderPromise = be()),
          n !== a.preload && e.updateMatch(i, (e) => ({ ...e, preload: n })),
          await r(l, t, s, a, c));
      }
    }
    let d = e.router.getMatch(i);
    (s ||
      (d._nonReactive.loaderPromise?.resolve(),
      d._nonReactive.loadPromise?.resolve(),
      (d._nonReactive.loadPromise = void 0)),
      clearTimeout(d._nonReactive.pendingTimeout),
      (d._nonReactive.pendingTimeout = void 0),
      s || (d._nonReactive.loaderPromise = void 0),
      (d._nonReactive.dehydrated = void 0));
    let f = s ? d.isFetching : !1;
    return f !== d.isFetching || d.invalid !== !1
      ? (e.updateMatch(i, (e) => ({ ...e, isFetching: f, invalid: !1 })), e.router.getMatch(i))
      : d;
  };
async function hn(e) {
  let t = e,
    n = [];
  Qt(t.router) && Zt(t);
  let r;
  for (let e = 0; e < t.matches.length; e++) {
    try {
      let n = un(t, e);
      Se(n) && (await n);
    } catch (e) {
      if (Ht(e)) throw e;
      if (vt(e)) r = e;
      else if (!t.preload) throw e;
      break;
    }
    if (t.serialError || t.firstBadMatchIndex != null) break;
  }
  let i = t.firstBadMatchIndex ?? t.matches.length,
    a = r && !t.preload ? tn(t, r) : void 0,
    o = r && t.preload ? 0 : a === void 0 ? i : Math.min(a + 1, i),
    s,
    c;
  for (let e = 0; e < o; e++) n.push(mn(t, n, e));
  try {
    await Promise.all(n);
  } catch {
    let e = await Promise.allSettled(n);
    for (let t of e) {
      if (t.status !== `rejected`) continue;
      let e = t.reason;
      if (Ht(e)) throw e;
      vt(e) ? (s ??= e) : (c ??= e);
    }
    if (c !== void 0) throw c;
  }
  let l = s ?? (r && !t.preload ? r : void 0),
    u = t.firstBadMatchIndex === void 0 ? t.matches.length - 1 : t.firstBadMatchIndex;
  if (!l && r && t.preload) return t.matches;
  if (l) {
    let e = tn(t, l);
    e === void 0 && Pe();
    let n = t.matches[e],
      r = t.router.looseRoutesById[n.routeId],
      i = t.router.options?.defaultNotFoundComponent;
    (!r.options.notFoundComponent && i && (r.options.notFoundComponent = i),
      (l.routeId = n.routeId));
    let a = n.routeId === t.router.routeTree.id;
    (t.updateMatch(n.id, (e) => ({
      ...e,
      ...(a
        ? { status: `success`, globalNotFound: !0, error: void 0 }
        : { status: `notFound`, error: l }),
      isFetching: !1,
    })),
      (u = e),
      await _n(r, [`notFoundComponent`]));
  } else if (!t.preload) {
    let e = t.matches[0];
    e.globalNotFound ||
      (t.router.getMatch(e.id)?.globalNotFound &&
        t.updateMatch(e.id, (e) => ({ ...e, globalNotFound: !1, error: void 0 })));
  }
  if (t.serialError && t.firstBadMatchIndex !== void 0) {
    let e = t.router.looseRoutesById[t.matches[t.firstBadMatchIndex].routeId];
    await _n(e, [`errorComponent`]);
  }
  for (let e = 0; e <= u; e++) {
    let { id: n, routeId: r } = t.matches[e],
      i = t.router.looseRoutesById[r];
    try {
      let e = dn(t, n, i);
      if (e) {
        let r = await e;
        t.updateMatch(n, (e) => ({ ...e, ...r }));
      }
    } catch (e) {
      console.error(`Error executing head for route ${r}:`, e);
    }
  }
  let d = Zt(t);
  if ((Se(d) && (await d), l)) throw l;
  if (t.serialError && !t.preload && !t.onReady) throw t.serialError;
  return t.matches;
}
function gn(e, t) {
  let n = t.map((t) => e.options[t]?.preload?.()).filter(Boolean);
  if (n.length !== 0) return Promise.all(n);
}
function _n(e, t = yn) {
  !e._lazyLoaded &&
    e._lazyPromise === void 0 &&
    (e.lazyFn
      ? (e._lazyPromise = e.lazyFn().then((t) => {
          let { id: n, ...r } = t.options;
          (Object.assign(e.options, r), (e._lazyLoaded = !0), (e._lazyPromise = void 0));
        }))
      : (e._lazyLoaded = !0));
  let n = () =>
    e._componentsLoaded
      ? void 0
      : t === yn
        ? (() => {
            if (e._componentsPromise === void 0) {
              let t = gn(e, yn);
              t
                ? (e._componentsPromise = t.then(() => {
                    ((e._componentsLoaded = !0), (e._componentsPromise = void 0));
                  }))
                : (e._componentsLoaded = !0);
            }
            return e._componentsPromise;
          })()
        : gn(e, t);
  return e._lazyPromise ? e._lazyPromise.then(n) : n();
}
function vn(e) {
  for (let t of yn) if (e.options[t]?.preload) return !0;
  return !1;
}
var yn = [`component`, `errorComponent`, `pendingComponent`, `notFoundComponent`],
  bn = `__TSR_index`,
  xn = `popstate`,
  Sn = `beforeunload`;
function Cn(e) {
  let t = e.getLocation(),
    n = new Set(),
    r = (r) => {
      ((t = e.getLocation()), n.forEach((e) => e({ location: t, action: r })));
    },
    i = (n) => {
      (e.notifyOnIndexChange ?? !0) ? r(n) : (t = e.getLocation());
    },
    a = async ({ task: n, navigateOpts: r, ...i }) => {
      if (r?.ignoreBlocker ?? !1) {
        n();
        return;
      }
      let a = e.getBlockers?.() ?? [],
        o = i.type === `PUSH` || i.type === `REPLACE`;
      if (typeof document < `u` && a.length && o)
        for (let n of a) {
          let r = Dn(i.path, i.state);
          if (await n.blockerFn({ currentLocation: t, nextLocation: r, action: i.type })) {
            e.onBlocked?.();
            return;
          }
        }
      n();
    };
  return {
    get location() {
      return t;
    },
    get length() {
      return e.getLength();
    },
    subscribers: n,
    subscribe: (e) => (
      n.add(e),
      () => {
        n.delete(e);
      }
    ),
    push: (n, i, o) => {
      let s = t.state[bn];
      ((i = wn(s + 1, i)),
        a({
          task: () => {
            (e.pushState(n, i), r({ type: `PUSH` }));
          },
          navigateOpts: o,
          type: `PUSH`,
          path: n,
          state: i,
        }));
    },
    replace: (n, i, o) => {
      let s = t.state[bn];
      ((i = wn(s, i)),
        a({
          task: () => {
            (e.replaceState(n, i), r({ type: `REPLACE` }));
          },
          navigateOpts: o,
          type: `REPLACE`,
          path: n,
          state: i,
        }));
    },
    go: (t, n) => {
      a({
        task: () => {
          (e.go(t), i({ type: `GO`, index: t }));
        },
        navigateOpts: n,
        type: `GO`,
      });
    },
    back: (t) => {
      a({
        task: () => {
          (e.back(t?.ignoreBlocker ?? !1), i({ type: `BACK` }));
        },
        navigateOpts: t,
        type: `BACK`,
      });
    },
    forward: (t) => {
      a({
        task: () => {
          (e.forward(t?.ignoreBlocker ?? !1), i({ type: `FORWARD` }));
        },
        navigateOpts: t,
        type: `FORWARD`,
      });
    },
    canGoBack: () => t.state[bn] !== 0,
    createHref: (t) => e.createHref(t),
    block: (t) => {
      if (!e.setBlockers) return () => {};
      let n = e.getBlockers?.() ?? [];
      return (
        e.setBlockers([...n, t]),
        () => {
          let n = e.getBlockers?.() ?? [];
          e.setBlockers?.(n.filter((e) => e !== t));
        }
      );
    },
    flush: () => e.flush?.(),
    destroy: () => e.destroy?.(),
    notify: r,
  };
}
function wn(e, t) {
  t ||= {};
  let n = On();
  return { ...t, key: n, __TSR_key: n, [bn]: e };
}
function Tn(e) {
  let t = e?.window ?? (typeof document < `u` ? window : void 0),
    n = t.history.pushState,
    r = t.history.replaceState,
    i = [],
    a = () => i,
    o = (e) => (i = e),
    s = e?.createHref ?? ((e) => e),
    c =
      e?.parseLocation ??
      (() => Dn(`${t.location.pathname}${t.location.search}${t.location.hash}`, t.history.state));
  if (!t.history.state?.__TSR_key && !t.history.state?.key) {
    let e = On();
    t.history.replaceState({ [bn]: 0, key: e, __TSR_key: e }, ``);
  }
  let l = c(),
    u,
    d = !1,
    f = !1,
    p = !1,
    m = !1,
    h = () => l,
    g,
    _,
    v = () => {
      g &&
        ((C._ignoreSubscribers = !0),
        (g.isPush ? t.history.pushState : t.history.replaceState)(g.state, ``, g.href),
        (C._ignoreSubscribers = !1),
        (g = void 0),
        (_ = void 0),
        (u = void 0));
    },
    y = (e, t, n) => {
      let r = s(t);
      (_ || (u = l),
        (l = Dn(t, n)),
        (g = { href: r, state: n, isPush: g?.isPush || e === `push` }),
        (_ ||= Promise.resolve().then(() => v())));
    },
    b = (e) => {
      ((l = c()), C.notify({ type: e }));
    },
    x = async () => {
      if (f) {
        f = !1;
        return;
      }
      let e = c(),
        n = e.state[bn] - l.state[bn],
        r = n === 1,
        i = n === -1,
        o = (!r && !i) || d;
      d = !1;
      let s = o ? `GO` : i ? `BACK` : `FORWARD`,
        u = o ? { type: `GO`, index: n } : { type: i ? `BACK` : `FORWARD` };
      if (p) p = !1;
      else {
        let n = a();
        if (typeof document < `u` && n.length) {
          for (let r of n)
            if (await r.blockerFn({ currentLocation: l, nextLocation: e, action: s })) {
              ((f = !0), t.history.go(1), C.notify(u));
              return;
            }
        }
      }
      ((l = c()), C.notify(u));
    },
    S = (e) => {
      if (m) {
        m = !1;
        return;
      }
      let t = !1,
        n = a();
      if (typeof document < `u` && n.length)
        for (let e of n) {
          let n = e.enableBeforeUnload ?? !0;
          if (n === !0) {
            t = !0;
            break;
          }
          if (typeof n == `function` && n() === !0) {
            t = !0;
            break;
          }
        }
      if (t) return (e.preventDefault(), (e.returnValue = ``));
    },
    C = Cn({
      getLocation: h,
      getLength: () => t.history.length,
      pushState: (e, t) => y(`push`, e, t),
      replaceState: (e, t) => y(`replace`, e, t),
      back: (e) => (e && (p = !0), (m = !0), t.history.back()),
      forward: (e) => {
        (e && (p = !0), (m = !0), t.history.forward());
      },
      go: (e) => {
        ((d = !0), t.history.go(e));
      },
      createHref: (e) => s(e),
      flush: v,
      destroy: () => {
        ((t.history.pushState = n),
          (t.history.replaceState = r),
          t.removeEventListener(Sn, S, { capture: !0 }),
          t.removeEventListener(xn, x));
      },
      onBlocked: () => {
        u && l !== u && (l = u);
      },
      getBlockers: a,
      setBlockers: o,
      notifyOnIndexChange: !1,
    });
  return (
    t.addEventListener(Sn, S, { capture: !0 }),
    t.addEventListener(xn, x),
    (t.history.pushState = function (...e) {
      let r = n.apply(t.history, e);
      return (C._ignoreSubscribers || b(`PUSH`), r);
    }),
    (t.history.replaceState = function (...e) {
      let n = r.apply(t.history, e);
      return (C._ignoreSubscribers || b(`REPLACE`), n);
    }),
    C
  );
}
function En(e) {
  let t = e.replace(/[\x00-\x1f\x7f]/g, ``);
  return (t.startsWith(`//`) && (t = `/` + t.replace(/^\/+/, ``)), t);
}
function Dn(e, t) {
  let n = En(e),
    r = n.indexOf(`#`),
    i = n.indexOf(`?`),
    a = On();
  return {
    href: n,
    pathname: n.substring(0, r > 0 ? (i > 0 ? Math.min(r, i) : r) : i > 0 ? i : n.length),
    hash: r > -1 ? n.substring(r) : ``,
    search: i > -1 ? n.slice(i, r === -1 ? void 0 : r) : ``,
    state: t || { [bn]: 0, key: a, __TSR_key: a },
  };
}
function On() {
  return (Math.random() + 1).toString(36).substring(7);
}
function kn(e) {
  return e instanceof Error ? { name: e.name, message: e.message } : { data: e };
}
function An(e, t) {
  let n = t,
    r = e;
  return {
    fromLocation: n,
    toLocation: r,
    pathChanged: n?.pathname !== r.pathname,
    hrefChanged: n?.href !== r.href,
    hashChanged: n?.hash !== r.hash,
  };
}
var jn = class {
    constructor(e, t) {
      ((this.tempLocationKey = `${Math.round(Math.random() * 1e7)}`),
        (this._scroll = { next: !0 }),
        (this.shouldViewTransition = void 0),
        (this.isViewTransitionTypesSupported = void 0),
        (this.subscribers = new Set()),
        (this.routeBranchCache = new WeakMap()),
        (this.lightweightCache = new WeakMap()),
        (this.startTransition = (e) => e()),
        (this.update = (e) => {
          let t = this.options,
            n = this.basepath ?? t?.basepath ?? `/`,
            r = this.basepath === void 0,
            i = t?.rewrite;
          if (
            ((this.options = { ...t, ...e }),
            (this.isServer = this.options.isServer ?? typeof document > `u`),
            (this.protocolAllowlist = new Set(this.options.protocolAllowlist)),
            this.options.pathParamsAllowedCharacters &&
              (this.pathParamsDecoder = mt(this.options.pathParamsAllowedCharacters)),
            (!this.history || (this.options.history && this.options.history !== this.history)) &&
              (this.options.history
                ? (this.history = this.options.history)
                : (this.history = Tn())),
            (this.origin = this.options.origin),
            this.origin ||
              (window?.origin && window.origin !== `null`
                ? (this.origin = window.origin)
                : (this.origin = `http://localhost`)),
            this.history && this.updateLatestLocation(),
            this.options.routeTree !== this.routeTree)
          ) {
            this.routeTree = this.options.routeTree;
            let e;
            ((this.resolvePathCache = Fe(1e3)), (e = this.buildRouteTree()), this.setRoutes(e));
          }
          if (!this.stores && this.latestLocation) {
            let e = this.getStoreConfig(this);
            ((this.batch = e.batch), (this.stores = Jt(Pn(this.latestLocation), e)), Mt(this));
          }
          let a = !1,
            o = this.options.basepath ?? `/`,
            s = this.options.rewrite;
          if (r || n !== o || i !== s) {
            this.basepath = o;
            let e = [],
              t = ut(o);
            (t && t !== `/` && e.push(Gt({ basepath: o })),
              s && e.push(s),
              (this.rewrite = e.length === 0 ? void 0 : e.length === 1 ? e[0] : Wt(e)),
              this.history && this.updateLatestLocation(),
              (a = !0));
          }
          (a && this.stores && this.stores.location.set(this.latestLocation),
            typeof window < `u` &&
              `CSS` in window &&
              typeof window.CSS?.supports == `function` &&
              (this.isViewTransitionTypesSupported = window.CSS.supports(
                `selector(:active-view-transition-type(a))`,
              )));
        }),
        (this.updateLatestLocation = () => {
          this.latestLocation = this.parseLocation(this.history.location, this.latestLocation);
        }),
        (this.buildRouteTree = () => {
          let e = Xe(this.routeTree, this.options.caseSensitive, (e, t) => {
            e.init({ originalIndex: t });
          });
          return (this.options.routeMasks && Ge(this.options.routeMasks, e.processedTree), e);
        }),
        (this.subscribe = (e, t) => {
          let n = { eventType: e, fn: t };
          return (
            this.subscribers.add(n),
            () => {
              this.subscribers.delete(n);
            }
          );
        }),
        (this.emit = (e) => {
          this.subscribers.forEach((t) => {
            t.eventType === e.type && t.fn(e);
          });
        }),
        (this.parseLocation = (e, t) => {
          let n = ({ pathname: e, search: n, hash: r, href: i, state: a }) => {
              if (!this.rewrite && !/[ \x00-\x1f\x7f\u0080-\uffff]/.test(e)) {
                let i = this.options.parseSearch(n),
                  o = this.options.stringifySearch(i);
                return {
                  href: e + o + r,
                  publicHref: e + o + r,
                  pathname: je(e).path,
                  external: !1,
                  searchStr: o,
                  search: he(t?.search, i),
                  hash: je(r.slice(1)).path,
                  state: ge(t?.state, a),
                };
              }
              let o = new URL(i, this.origin),
                s = Kt(this.rewrite, o),
                c = this.options.parseSearch(s.search),
                l = this.options.stringifySearch(c);
              return (
                (s.search = l),
                {
                  href: s.href.replace(s.origin, ``),
                  publicHref: i,
                  pathname: je(s.pathname).path,
                  external: !!this.rewrite && s.origin !== this.origin,
                  searchStr: l,
                  search: he(t?.search, c),
                  hash: je(s.hash.slice(1)).path,
                  state: ge(t?.state, a),
                }
              );
            },
            r = n(e),
            { __tempLocation: i, __tempKey: a } = r.state;
          if (i && (!a || a === this.tempLocationKey)) {
            let e = n(i);
            return (
              (e.state.key = r.state.key),
              (e.state.__TSR_key = r.state.__TSR_key),
              delete e.state.__tempLocation,
              { ...e, maskedLocation: r }
            );
          }
          return r;
        }),
        (this.resolvePathWithBase = (e, t) =>
          pt({
            base: e,
            to: t.includes(`//`) ? st(t) : t,
            trailingSlash: this.options.trailingSlash,
            cache: this.resolvePathCache,
          })),
        (this.matchRoutes = (e, t, n) =>
          typeof e == `string`
            ? this.matchRoutesInternal({ pathname: e, search: t }, n)
            : this.matchRoutesInternal(e, t)),
        (this.getMatchedRoutes = (e) =>
          In({ pathname: e, routesById: this.routesById, processedTree: this.processedTree })),
        (this.cancelMatch = (e) => {
          let t = this.getMatch(e);
          t &&
            (t.abortController.abort(),
            clearTimeout(t._nonReactive.pendingTimeout),
            (t._nonReactive.pendingTimeout = void 0));
        }),
        (this.cancelMatches = () => {
          (this.stores.pendingIds.get().forEach((e) => {
            this.cancelMatch(e);
          }),
            this.stores.matchesId.get().forEach((e) => {
              if (this.stores.pendingMatchStores.has(e)) return;
              let t = this.stores.matchStores.get(e)?.get();
              t && (t.status === `pending` || t.isFetching === `loader`) && this.cancelMatch(e);
            }));
        }),
        (this.buildLocation = (e) => {
          let t = (t = {}) => {
              let n = t._fromLocation || this.pendingBuiltLocation || this.latestLocation,
                r = this.matchRoutesLightweight(n);
              t.from;
              let i = t.unsafeRelative === `path` ? n.pathname : (t.from ?? r.fullPath),
                a = t.to ? `${t.to}` : void 0,
                o = r.search,
                s = Object.assign(Object.create(null), r.params),
                c = a?.charCodeAt(0) === 47 ? `/` : this.resolvePathWithBase(i, `.`),
                l = a ? this.resolvePathWithBase(c, a) : c,
                u =
                  t.params === !1 || t.params === null
                    ? Object.create(null)
                    : (t.params ?? !0) === !0
                      ? s
                      : Object.assign(s, fe(t.params, s)),
                d = this.routesByPath[lt(l)],
                f;
              if (d) f = this.getRouteBranch(d);
              else if (l.includes(`$`)) f = [];
              else {
                let e = this.getMatchedRoutes(l);
                ((f = e.matchedRoutes),
                  this.options.notFoundRoute &&
                    (!e.foundRoute || (e.foundRoute.path !== `/` && e.routeParams[`**`])) &&
                    (f = [...f, this.options.notFoundRoute]));
              }
              if (f.length && O(u))
                for (let e of f) {
                  let t = e.options.params?.stringify ?? e.options.stringifyParams;
                  if (t)
                    try {
                      Object.assign(u, t(u));
                    } catch {}
                }
              let p = e.leaveParams
                  ? l
                  : je(
                      gt({
                        path: l,
                        params: u,
                        decoder: this.pathParamsDecoder,
                        server: this.isServer,
                      }).interpolatedPath,
                    ).path,
                m = o;
              if (e._includeValidateSearch && this.options.search?.strict) {
                let e = {};
                (f.forEach((t) => {
                  if (t.options.validateSearch)
                    try {
                      Object.assign(e, Fn(t.options.validateSearch, { ...e, ...m }));
                    } catch {}
                }),
                  (m = e));
              }
              ((m = Ln({
                search: m,
                dest: t,
                destRoutes: f,
                _includeValidateSearch: e._includeValidateSearch,
              })),
                (m = he(o, m)));
              let h = this.options.stringifySearch(m),
                g = t.hash === !0 ? n.hash : t.hash ? fe(t.hash, n.hash) : void 0,
                _ = g ? `#${g}` : ``,
                v = t.state === !0 ? n.state : t.state ? fe(t.state, n.state) : {};
              v = ge(n.state, v);
              let y = `${p}${h}${_}`,
                b,
                x,
                S = !1;
              if (this.rewrite) {
                let e = new URL(y, this.origin),
                  t = qt(this.rewrite, e);
                ((b = e.href.replace(e.origin, ``)),
                  t.origin === this.origin
                    ? (x = t.pathname + t.search + t.hash)
                    : ((x = t.href), (S = !0)));
              } else ((b = Me(y)), (x = b));
              return {
                publicHref: x,
                href: b,
                pathname: p,
                search: m,
                searchStr: h,
                state: v,
                hash: g ?? ``,
                external: S,
                unmaskOnReload: t.unmaskOnReload,
              };
            },
            n = (n = {}, r) => {
              let i = t(n),
                a = r ? t(r) : void 0;
              if (!a) {
                let n = Object.create(null);
                if (this.options.routeMasks) {
                  let o = Ke(i.pathname, this.processedTree);
                  if (o) {
                    Object.assign(n, o.rawParams);
                    let { from: i, params: s, ...c } = o.route,
                      l =
                        s === !1 || s === null
                          ? Object.create(null)
                          : (s ?? !0) === !0
                            ? n
                            : Object.assign(n, fe(s, n));
                    ((r = { from: e.from, ...c, params: l }), (a = t(r)));
                  }
                }
              }
              return (a && (i.maskedLocation = a), i);
            };
          return e.mask ? n(e, { from: e.from, ...e.mask }) : n(e);
        }),
        (this.commitLocation = async ({ viewTransition: e, ignoreBlocker: t, ...n }) => {
          let r,
            i = () => {
              let e = [`key`, `__TSR_key`, `__TSR_index`, `__hashScrollIntoViewOptions`];
              e.forEach((e) => {
                n.state[e] = this.latestLocation.state[e];
              });
              let t = j(n.state, this.latestLocation.state);
              return (
                e.forEach((e) => {
                  delete n.state[e];
                }),
                t
              );
            },
            a = lt(this.latestLocation.href) === lt(n.href),
            o = this.commitLocationPromise;
          if (
            ((this.commitLocationPromise = be(() => {
              (o?.resolve(), (o = void 0));
            })),
            a && i())
          )
            this.load();
          else {
            let { maskedLocation: i, hashScrollIntoView: a, ...o } = n;
            (i &&
              ((o = {
                ...i,
                state: {
                  ...i.state,
                  __tempKey: void 0,
                  __tempLocation: {
                    ...o,
                    search: o.searchStr,
                    state: {
                      ...o.state,
                      __tempKey: void 0,
                      __tempLocation: void 0,
                      __TSR_key: void 0,
                      key: void 0,
                    },
                  },
                },
              }),
              (o.unmaskOnReload ?? this.options.unmaskOnReload ?? !1) &&
                (o.state.__tempKey = this.tempLocationKey)),
              (o.state.__hashScrollIntoViewOptions =
                a ?? this.options.defaultHashScrollIntoView ?? !0),
              (this.shouldViewTransition = e),
              (r = n.replace ? `REPLACE` : `PUSH`),
              this.history[r === `REPLACE` ? `replace` : `push`](o.publicHref, o.state, {
                ignoreBlocker: t,
              }));
          }
          return (
            (this._scroll.next = n.resetScroll ?? !0),
            this.history.subscribers.size || this.load(r ? { action: { type: r } } : void 0),
            this.commitLocationPromise
          );
        }),
        (this.buildAndCommitLocation = ({
          replace: e,
          resetScroll: t,
          hashScrollIntoView: n,
          viewTransition: r,
          ignoreBlocker: i,
          href: a,
          ...o
        } = {}) => {
          if (a) {
            let t = this.history.location.state.__TSR_index,
              n = Dn(a, { __TSR_index: e ? t : t + 1 }),
              r = new URL(n.pathname, this.origin);
            ((o.to = Kt(this.rewrite, r).pathname),
              (o.search = this.options.parseSearch(n.search)),
              (o.hash = n.hash.slice(1)));
          }
          let s = this.buildLocation({ ...o, _includeValidateSearch: !0 });
          this.pendingBuiltLocation = s;
          let c = this.commitLocation({
            ...s,
            viewTransition: r,
            replace: e,
            resetScroll: t,
            hashScrollIntoView: n,
            ignoreBlocker: i,
          });
          return (
            queueMicrotask(() => {
              this.pendingBuiltLocation === s && (this.pendingBuiltLocation = void 0);
            }),
            c
          );
        }),
        (this.navigate = async ({ to: e, reloadDocument: t, href: n, publicHref: r, ...i }) => {
          let a = !1;
          if (n)
            try {
              (new URL(`${n}`), (a = !0));
            } catch {}
          if ((a && !t && (t = !0), t)) {
            if (e !== void 0 || !n) {
              let t = this.buildLocation({ to: e, ...i });
              ((n ??= t.publicHref), (r ??= t.publicHref));
            }
            let t = !a && r ? r : n;
            if (De(t, this.protocolAllowlist)) return;
            if (!i.ignoreBlocker) {
              let e = this.history.getBlockers?.() ?? [];
              for (let t of e)
                if (
                  t?.blockerFn &&
                  (await t.blockerFn({
                    currentLocation: this.latestLocation,
                    nextLocation: this.latestLocation,
                    action: `PUSH`,
                  }))
                )
                  return;
            }
            i.replace ? window.location.replace(t) : (window.location.href = t);
            return;
          }
          return this.buildAndCommitLocation({ ...i, href: n, to: e, _isNavigate: !0 });
        }),
        (this.beforeLoad = () => {
          (this.cancelMatches(), this.updateLatestLocation());
          let e = this.matchRoutes(this.latestLocation),
            t = this.stores.cachedMatches.get().filter((t) => !e.some((e) => e.id === t.id));
          this.batch(() => {
            (this.stores.status.set(`pending`),
              this.stores.statusCode.set(200),
              this.stores.isLoading.set(!0),
              this.stores.location.set(this.latestLocation),
              this.stores.setPending(e),
              this.stores.setCached(t));
          });
        }),
        (this.load = async (e) => {
          let t = e?.action?.type,
            n,
            r,
            i,
            a = this.stores.resolvedLocation.get() ?? this.stores.location.get();
          for (
            i = new Promise((o) => {
              this.startTransition(async () => {
                try {
                  (this.beforeLoad(), t && (this._scroll.hash = t === `PUSH` || t === `REPLACE`));
                  let n = this.latestLocation,
                    r = An(n, this.stores.resolvedLocation.get());
                  (this.stores.redirect.get() || this.emit({ type: `onBeforeNavigate`, ...r }),
                    this.emit({ type: `onBeforeLoad`, ...r }),
                    await hn({
                      router: this,
                      sync: e?.sync,
                      forceStaleReload: a.href === n.href,
                      matches: this.stores.pendingMatches.get(),
                      location: n,
                      updateMatch: this.updateMatch,
                      onReady: async () => {
                        this.startTransition(() => {
                          this.startViewTransition(async () => {
                            let e = null,
                              t = null,
                              n = null,
                              r = null;
                            this.batch(() => {
                              let i = this.stores.pendingMatches.get(),
                                a = i.length,
                                o = this.stores.matches.get();
                              e = a
                                ? o.filter((e) => !this.stores.pendingMatchStores.has(e.id))
                                : null;
                              let s = new Set();
                              for (let e of this.stores.pendingMatchStores.values())
                                e.routeId && s.add(e.routeId);
                              let c = new Set();
                              for (let e of this.stores.matchStores.values())
                                e.routeId && c.add(e.routeId);
                              ((t = a ? o.filter((e) => !s.has(e.routeId)) : null),
                                (n = a ? i.filter((e) => !c.has(e.routeId)) : null),
                                (r = a ? i.filter((e) => c.has(e.routeId)) : o),
                                this.stores.isLoading.set(!1),
                                this.stores.loadedAt.set(Date.now()),
                                a &&
                                  (this.stores.setMatches(i),
                                  this.stores.setPending([]),
                                  this.stores.setCached([
                                    ...this.stores.cachedMatches.get(),
                                    ...e.filter(
                                      (e) =>
                                        e.status !== `error` &&
                                        e.status !== `notFound` &&
                                        e.status !== `redirected`,
                                    ),
                                  ]),
                                  this.clearExpiredCache()));
                            });
                            for (let [e, i] of [
                              [t, `onLeave`],
                              [n, `onEnter`],
                              [r, `onStay`],
                            ])
                              if (e)
                                for (let t of e) this.looseRoutesById[t.routeId].options[i]?.(t);
                          });
                        });
                      },
                    }));
                } catch (e) {
                  Ht(e)
                    ? ((n = e), this.navigate({ ...n.options, replace: !0, ignoreBlocker: !0 }))
                    : vt(e) && (r = e);
                  let t = n
                    ? n.status
                    : r
                      ? 404
                      : this.stores.matches.get().some((e) => e.status === `error`)
                        ? 500
                        : 200;
                  this.batch(() => {
                    (this.stores.statusCode.set(t), this.stores.redirect.set(n));
                  });
                }
                (this.latestLoadPromise === i &&
                  (this.commitLocationPromise?.resolve(),
                  (this.latestLoadPromise = void 0),
                  (this.commitLocationPromise = void 0)),
                  o());
              });
            }),
              this.latestLoadPromise = i,
              await i;
            this.latestLoadPromise && i !== this.latestLoadPromise;
          )
            await this.latestLoadPromise;
          let o;
          (this.hasNotFoundMatch()
            ? (o = 404)
            : this.stores.matches.get().some((e) => e.status === `error`) && (o = 500),
            o !== void 0 && this.stores.statusCode.set(o));
        }),
        (this.startViewTransition = (e) => {
          let t = this.shouldViewTransition ?? this.options.defaultViewTransition;
          if (
            ((this.shouldViewTransition = void 0),
            t &&
              typeof document < `u` &&
              `startViewTransition` in document &&
              typeof document.startViewTransition == `function`)
          ) {
            let n;
            if (typeof t == `object` && this.isViewTransitionTypesSupported) {
              let r = this.latestLocation,
                i = this.stores.resolvedLocation.get(),
                a = typeof t.types == `function` ? t.types(An(r, i)) : t.types;
              if (a === !1) {
                e();
                return;
              }
              n = { update: e, types: a };
            } else n = e;
            document.startViewTransition(n);
          } else e();
        }),
        (this.updateMatch = (e, t) => {
          this.startTransition(() => {
            let n = this.stores.pendingMatchStores.get(e);
            if (n) {
              n.set(t);
              return;
            }
            let r = this.stores.matchStores.get(e);
            if (r) {
              r.set(t);
              return;
            }
            let i = this.stores.cachedMatchStores.get(e);
            if (i) {
              let n = t(i.get());
              n.status === `redirected`
                ? this.stores.cachedMatchStores.delete(e) &&
                  this.stores.cachedIds.set((t) => t.filter((t) => t !== e))
                : i.set(n);
            }
          });
        }),
        (this.getMatch = (e) =>
          this.stores.cachedMatchStores.get(e)?.get() ??
          this.stores.pendingMatchStores.get(e)?.get() ??
          this.stores.matchStores.get(e)?.get()),
        (this.invalidate = (e) => {
          let t = (t) =>
            (e?.filter?.(t) ?? !0)
              ? {
                  ...t,
                  invalid: !0,
                  ...(e?.forcePending || t.status === `error` || t.status === `notFound`
                    ? { status: `pending`, error: void 0 }
                    : void 0),
                }
              : t;
          return (
            this.batch(() => {
              (this.stores.setMatches(this.stores.matches.get().map(t)),
                this.stores.setCached(this.stores.cachedMatches.get().map(t)),
                this.stores.setPending(this.stores.pendingMatches.get().map(t)));
            }),
            (this.shouldViewTransition = !1),
            this.load({ sync: e?.sync })
          );
        }),
        (this.getParsedLocationHref = (e) => e.publicHref || `/`),
        (this.resolveRedirect = (e) => {
          let t = e.headers.get(`Location`);
          if (!e.options.href || e.options._builtLocation) {
            let t = e.options._builtLocation ?? this.buildLocation(e.options),
              n = this.getParsedLocationHref(t);
            ((e.options.href = n), e.headers.set(`Location`, n));
          } else if (t)
            try {
              let n = new URL(t);
              if (this.origin && n.origin === this.origin) {
                let t = n.pathname + n.search + n.hash;
                ((e.options.href = t), e.headers.set(`Location`, t));
              }
            } catch {}
          if (
            e.options.href &&
            !e.options._builtLocation &&
            De(e.options.href, this.protocolAllowlist)
          )
            throw Error(`Redirect blocked: unsafe protocol`);
          return (e.headers.get(`Location`) || e.headers.set(`Location`, e.options.href), e);
        }),
        (this.clearCache = (e) => {
          let t = e?.filter;
          t === void 0
            ? this.stores.setCached([])
            : this.stores.setCached(this.stores.cachedMatches.get().filter((e) => !t(e)));
        }),
        (this.clearExpiredCache = () => {
          let e = Date.now();
          this.clearCache({
            filter: (t) => {
              let n = this.looseRoutesById[t.routeId];
              if (!n.options.loader) return !0;
              let r =
                (t.preload
                  ? (n.options.preloadGcTime ?? this.options.defaultPreloadGcTime)
                  : (n.options.gcTime ?? this.options.defaultGcTime)) ?? 300 * 1e3;
              return t.status === `error` || e - t.updatedAt >= r;
            },
          });
        }),
        (this.loadRouteChunk = _n),
        (this.preloadRoute = async (e) => {
          let t = e._builtLocation ?? this.buildLocation(e),
            n = this.matchRoutes(t, { throwOnError: !0, preload: !0, dest: e }),
            r = new Set([...this.stores.matchesId.get(), ...this.stores.pendingIds.get()]),
            i = new Set([...r, ...this.stores.cachedIds.get()]),
            a = n.filter((e) => !i.has(e.id));
          if (a.length) {
            let e = this.stores.cachedMatches.get();
            this.stores.setCached([...e, ...a]);
          }
          try {
            return (
              (n = await hn({
                router: this,
                matches: n,
                location: t,
                preload: !0,
                updateMatch: (e, t) => {
                  r.has(e) ? (n = n.map((n) => (n.id === e ? t(n) : n))) : this.updateMatch(e, t);
                },
              })),
              n
            );
          } catch (e) {
            if (Ht(e))
              return e.options.reloadDocument
                ? void 0
                : await this.preloadRoute({ ...e.options, _fromLocation: t });
            vt(e) || console.error(e);
            return;
          }
        }),
        (this.matchRoute = (e, t) => {
          let n = {
              ...e,
              to: e.to ? this.resolvePathWithBase(e.from || ``, e.to) : void 0,
              params: e.params || {},
              leaveParams: !0,
            },
            r = this.buildLocation(n);
          if (t?.pending && this.stores.status.get() !== `pending`) return !1;
          let i = (t?.pending === void 0 ? !this.stores.isLoading.get() : t.pending)
              ? this.latestLocation
              : this.stores.resolvedLocation.get() || this.stores.location.get(),
            a = qe(
              r.pathname,
              t?.caseSensitive ?? !1,
              t?.fuzzy ?? !1,
              i.pathname,
              this.processedTree,
            );
          return !a || (e.params && !j(a.rawParams, e.params, { partial: !0 }))
            ? !1
            : (t?.includeSearch ?? !0)
              ? j(i.search, r.search, { partial: !0 })
                ? a.rawParams
                : !1
              : a.rawParams;
        }),
        (this.hasNotFoundMatch = () =>
          this.stores.matches.get().some((e) => e.status === `notFound` || e.globalNotFound)),
        (this.getStoreConfig = t),
        this.update({
          defaultPreloadDelay: 50,
          defaultPendingMs: 1e3,
          defaultPendingMinMs: 500,
          context: void 0,
          ...e,
          caseSensitive: e.caseSensitive ?? !1,
          notFoundMode: e.notFoundMode ?? `fuzzy`,
          stringifySearch: e.stringifySearch ?? Lt,
          parseSearch: e.parseSearch ?? It,
          protocolAllowlist: e.protocolAllowlist ?? Ee,
        }),
        typeof document < `u` && (self.__TSR_ROUTER__ = this));
    }
    isShell() {
      return !!this.options.isShell;
    }
    isPrerendering() {
      return !!this.options.isPrerendering;
    }
    get state() {
      return this.stores.__store.get();
    }
    setRoutes({ routesById: e, routesByPath: t, processedTree: n }) {
      ((this.routesById = e), (this.routesByPath = t), (this.processedTree = n));
      let r = this.options.notFoundRoute;
      r && (r.init({ originalIndex: 99999999999 }), (this.routesById[r.id] = r));
    }
    getRouteBranch(e) {
      let t = this.routeBranchCache.get(e);
      return (t || ((t = $e(e)), this.routeBranchCache.set(e, t)), t);
    }
    get looseRoutesById() {
      return this.routesById;
    }
    getParentContext(e) {
      return e?.id
        ? (e.context ?? this.options.context ?? void 0)
        : (this.options.context ?? void 0);
    }
    matchRoutesInternal(e, t) {
      let n = this.getMatchedRoutes(e.pathname),
        { foundRoute: r, routeParams: i } = n,
        { matchedRoutes: a } = n,
        o = !1;
      (r ? r.path !== `/` && i[`**`] : lt(e.pathname)) &&
        (this.options.notFoundRoute ? (a = [...a, this.options.notFoundRoute]) : (o = !0));
      let s = o ? zn(this.options.notFoundMode, a) : void 0,
        c = Array(a.length),
        l = new Map();
      for (let e of this.stores.matchStores.values()) e.routeId && l.set(e.routeId, e.get());
      for (let n = 0; n < a.length; n++) {
        let r = a[n],
          o = c[n - 1],
          u,
          d,
          f;
        {
          let n = o?.search ?? e.search,
            i = o?._strictSearch ?? void 0;
          try {
            let e = Fn(r.options.validateSearch, { ...n }) ?? void 0;
            ((u = { ...n, ...e }), (d = { ...i, ...e }), (f = void 0));
          } catch (e) {
            let r = e;
            if ((e instanceof Mn || (r = new Mn(e.message, { cause: e })), t?.throwOnError))
              throw r;
            ((u = n), (d = {}), (f = r));
          }
        }
        let p = r.options.loaderDeps?.({ search: u }) ?? ``,
          m = p ? JSON.stringify(p) : ``,
          { interpolatedPath: h, usedParams: g } = gt({
            path: r.fullPath,
            params: i,
            decoder: this.pathParamsDecoder,
            server: this.isServer,
          }),
          _ = r.id + h + m,
          v = this.getMatch(_),
          y = l.get(r.id),
          b = v?._strictParams ?? g,
          x;
        if (!v)
          try {
            Bn(r, b);
          } catch (e) {
            if (((x = vt(e) || Ht(e) ? e : new Nn(e.message, { cause: e })), t?.throwOnError))
              throw x;
          }
        Object.assign(i, b);
        let S = y ? `stay` : `enter`,
          C;
        if (v)
          C = {
            ...v,
            cause: S,
            params: y?.params ?? i,
            _strictParams: b,
            search: he(y ? y.search : v.search, u),
            _strictSearch: d,
          };
        else {
          let e =
            r.options.loader || r.options.beforeLoad || r.lazyFn || vn(r) ? `pending` : `success`;
          C = {
            id: _,
            ssr: r.options.ssr,
            index: n,
            routeId: r.id,
            params: y?.params ?? i,
            _strictParams: b,
            pathname: h,
            updatedAt: Date.now(),
            search: y ? he(y.search, u) : u,
            _strictSearch: d,
            searchError: void 0,
            status: e,
            isFetching: !1,
            error: void 0,
            paramsError: x,
            __routeContext: void 0,
            _nonReactive: { loadPromise: be() },
            __beforeLoadContext: void 0,
            context: {},
            abortController: new AbortController(),
            fetchCount: 0,
            cause: S,
            loaderDeps: y ? ge(y.loaderDeps, p) : p,
            invalid: !1,
            preload: !1,
            links: void 0,
            scripts: void 0,
            headScripts: void 0,
            meta: void 0,
            staticData: r.options.staticData || {},
            fullPath: r.fullPath,
          };
        }
        (t?.preload || (C.globalNotFound = s === r.id), (C.searchError = f));
        let ee = this.getParentContext(o);
        ((C.context = { ...ee, ...C.__routeContext, ...C.__beforeLoadContext }), (c[n] = C));
      }
      for (let t = 0; t < c.length; t++) {
        let n = c[t],
          r = this.looseRoutesById[n.routeId],
          a = this.getMatch(n.id),
          o = l.get(n.routeId);
        if (((n.params = o ? he(o.params, i) : i), !a)) {
          let i = c[t - 1],
            a = this.getParentContext(i);
          if (r.options.context) {
            let t = {
              deps: n.loaderDeps,
              params: n.params,
              context: a ?? {},
              location: e,
              navigate: (t) => this.navigate({ ...t, _fromLocation: e }),
              buildLocation: this.buildLocation,
              cause: n.cause,
              abortController: n.abortController,
              preload: !!n.preload,
              matches: c,
              routeId: r.id,
            };
            n.__routeContext = r.options.context(t) ?? void 0;
          }
          n.context = { ...a, ...n.__routeContext, ...n.__beforeLoadContext };
        }
      }
      return c;
    }
    matchRoutesLightweight(e) {
      let t = D(this.stores.matchesId.get()),
        n = this.lightweightCache.get(e);
      if (n && n[0] === t) return n[1];
      let { matchedRoutes: r, routeParams: i } = this.getMatchedRoutes(e.pathname),
        a = D(r),
        o = { ...e.search };
      for (let e of r)
        try {
          Object.assign(o, Fn(e.options.validateSearch, o));
        } catch {}
      let s = t && this.stores.matchStores.get(t)?.get(),
        c = s && s.routeId === a.id && s.pathname === e.pathname,
        l;
      if (c) l = s.params;
      else {
        let e = Object.assign(Object.create(null), i);
        for (let t of r)
          try {
            Bn(t, e);
          } catch {}
        l = e;
      }
      let u = { matchedRoutes: r, fullPath: a.fullPath, search: o, params: l };
      return (this.lightweightCache.set(e, [t, u]), u);
    }
  },
  Mn = class extends Error {},
  Nn = class extends Error {};
function Pn(e) {
  return {
    loadedAt: 0,
    isLoading: !1,
    isTransitioning: !1,
    status: `idle`,
    resolvedLocation: void 0,
    location: e,
    matches: [],
    statusCode: 200,
  };
}
function Fn(e, t) {
  if (e == null) return {};
  if (`~standard` in e) {
    let n = e[`~standard`].validate(t);
    if (n instanceof Promise) throw new Mn(`Async validation not supported`);
    if (n.issues) throw new Mn(JSON.stringify(n.issues, void 0, 2), { cause: n });
    return n.value;
  }
  return `parse` in e ? e.parse(t) : typeof e == `function` ? e(t) : {};
}
function In({ pathname: e, routesById: t, processedTree: n }) {
  let r = Object.create(null),
    i = lt(e),
    a,
    o = Je(i, n, !0);
  return (
    o && ((a = o.route), Object.assign(r, o.rawParams)),
    { matchedRoutes: o?.branch || [t.__root__], routeParams: r, foundRoute: a }
  );
}
function Ln({ search: e, dest: t, destRoutes: n, _includeValidateSearch: r }) {
  return Rn(n)(e, t, r ?? !1);
}
function Rn(e) {
  let t,
    n,
    r = [];
  for (let t of e) {
    let e = t.options;
    `search` in e
      ? e.search?.middlewares && r.push(...e.search.middlewares)
      : (e.preSearchFilters || e.postSearchFilters) &&
        r.push(({ search: t, next: n }) => {
          let r = n(e.preSearchFilters ? e.preSearchFilters.reduce((e, t) => t(e), t) : t);
          return e.postSearchFilters ? e.postSearchFilters.reduce((e, t) => t(e), r) : r;
        });
    let i = e.validateSearch;
    i &&
      r.push(({ search: e, next: t, meta: r }) => {
        let a = t(e);
        if (n)
          try {
            let e = Fn(i, a);
            if (r && e) for (let t in e) t in a || (r.defaulted ||= new Map()).set(t, e[t]);
            return { ...a, ...e };
          } catch {}
        return a;
      });
  }
  let i = (e, n, a) => {
    if (e >= r.length) {
      if (!t.search) return {};
      if (t.search === !0) return n;
      let e = fe(t.search, n);
      return (a && (a.explicit = e), e);
    }
    return r[e]({
      search: n,
      next: (t, n) => {
        if (n) {
          let n = a || {};
          return { search: i(e + 1, t, n), meta: n };
        }
        return i(e + 1, t, a);
      },
      meta: a,
    });
  };
  return function (e, r, a) {
    return ((t = r), (n = a), i(0, e));
  };
}
function zn(e, t) {
  if (e !== `root`)
    for (let e = t.length - 1; e >= 0; e--) {
      let n = t[e];
      if (n.children) return n.id;
    }
  return Bt;
}
function Bn(e, t) {
  let n = e.options.params?.parse ?? e.options.parseParams;
  if (n) {
    let e = n(t);
    if (e === !1) throw Error(`Route params.parse returned false for a matched route`);
    Object.assign(t, e);
  }
}
var Vn = Symbol.for(`TSR_DEFERRED_PROMISE`);
function Hn(e, t) {
  let n = e;
  return n[Vn]
    ? n
    : ((n[Vn] = { status: `pending` }),
      n
        .then((e) => {
          ((n[Vn].status = `success`), (n[Vn].data = e));
        })
        .catch((e) => {
          ((n[Vn].status = `error`),
            (n[Vn].error = { data: (t?.serializeError ?? kn)(e), __isServerError: !0 }));
        }),
      n);
}
var Un = `Error preloading route! ☝️`;
function Wn(e, t) {
  if (e) return typeof e == `string` ? e : e[t];
}
function Gn(e) {
  return e?.scriptFormat ?? `module`;
}
function Kn(e, t, n) {
  let r = qn(t),
    i = Wn(n, `script`) ?? r.crossOrigin;
  return {
    ...(Gn(e) === `iife` ? { rel: `preload`, as: `script` } : { rel: `modulepreload` }),
    href: r.href,
    ...(i ? { crossOrigin: i } : {}),
  };
}
function qn(e) {
  return typeof e == `string` ? { href: e, crossOrigin: void 0 } : e;
}
function Jn(e, t) {
  if (t.length === 0) return;
  if (t.length === 1) {
    e.push(t[0]);
    return;
  }
  let n = new Set();
  for (let r of t) {
    let t = JSON.stringify(r);
    n.has(t) || (n.add(t), e.push(r));
  }
}
function Yn(e) {
  return typeof e == `string` ? { href: e, crossOrigin: void 0 } : e;
}
var Xn = class {
    get to() {
      return this._to;
    }
    get id() {
      return this._id;
    }
    get path() {
      return this._path;
    }
    get fullPath() {
      return this._fullPath;
    }
    constructor(e) {
      if (
        ((this.init = (e) => {
          this.originalIndex = e.originalIndex;
          let t = this.options,
            n = !t?.path && !t?.id;
          ((this.parentRoute = this.options.getParentRoute?.()),
            n ? (this._path = Bt) : this.parentRoute || Pe());
          let r = n ? Bt : t?.path;
          r && r !== `/` && (r = ct(r));
          let i = t?.id || r,
            a = n ? Bt : ot([this.parentRoute.id === `__root__` ? `` : this.parentRoute.id, i]);
          (r === `__root__` && (r = `/`), a !== `__root__` && (a = ot([`/`, a])));
          let o = a === `__root__` ? `/` : ot([this.parentRoute.fullPath, r]);
          ((this._path = r), (this._id = a), (this._fullPath = o), (this._to = lt(o)));
        }),
        (this.addChildren = (e) => this._addFileChildren(e)),
        (this._addFileChildren = (e) => (
          Array.isArray(e) && (this.children = e),
          typeof e == `object` && e && (this.children = Object.values(e)),
          this
        )),
        (this._addFileTypes = () => this),
        (this.updateLoader = (e) => (Object.assign(this.options, e), this)),
        (this.update = (e) => (Object.assign(this.options, e), this)),
        (this.lazy = (e) => ((this.lazyFn = e), this)),
        (this.redirect = (e) => Vt({ from: this.fullPath, ...e })),
        (this.options = e || {}),
        (this.isRoot = !e?.getParentRoute),
        e?.id && e?.path)
      )
        throw Error(`Route cannot have both an 'id' and a 'path' option.`);
    }
  },
  Zn = class extends Xn {
    constructor(e) {
      super(e);
    }
  },
  Qn = ((e) => (
    (e[(e.AggregateError = 1)] = `AggregateError`),
    (e[(e.ArrowFunction = 2)] = `ArrowFunction`),
    (e[(e.ErrorPrototypeStack = 4)] = `ErrorPrototypeStack`),
    (e[(e.ObjectAssign = 8)] = `ObjectAssign`),
    (e[(e.BigIntTypedArray = 16)] = `BigIntTypedArray`),
    (e[(e.RegExp = 32)] = `RegExp`),
    e
  ))(Qn || {}),
  $n = Symbol.asyncIterator,
  er = Symbol.hasInstance,
  tr = Symbol.isConcatSpreadable,
  nr = Symbol.iterator,
  rr = Symbol.match,
  ir = Symbol.matchAll,
  ar = Symbol.replace,
  or = Symbol.search,
  sr = Symbol.species,
  cr = Symbol.split,
  lr = Symbol.toPrimitive,
  ur = Symbol.toStringTag,
  dr = Symbol.unscopables,
  fr = {
    [$n]: 0,
    [er]: 1,
    [tr]: 2,
    [nr]: 3,
    [rr]: 4,
    [ir]: 5,
    [ar]: 6,
    [or]: 7,
    [sr]: 8,
    [cr]: 9,
    [lr]: 10,
    [ur]: 11,
    [dr]: 12,
  },
  pr = {
    0: $n,
    1: er,
    2: tr,
    3: nr,
    4: rr,
    5: ir,
    6: ar,
    7: or,
    8: sr,
    9: cr,
    10: lr,
    11: ur,
    12: dr,
  },
  M = void 0,
  mr = { 2: !0, 3: !1, 1: M, 0: null, 4: -0, 5: 1 / 0, 6: -1 / 0, 7: NaN },
  hr = {
    0: `Error`,
    1: `EvalError`,
    2: `RangeError`,
    3: `ReferenceError`,
    4: `SyntaxError`,
    5: `TypeError`,
    6: `URIError`,
  },
  gr = {
    0: Error,
    1: EvalError,
    2: RangeError,
    3: ReferenceError,
    4: SyntaxError,
    5: TypeError,
    6: URIError,
  };
function N(e, t, n, r, i, a, o, s, c, l, u, d) {
  return { t: e, i: t, s: n, c: r, m: i, p: a, e: o, a: s, f: c, b: l, o: u, l: d };
}
function _r(e) {
  return N(2, M, e, M, M, M, M, M, M, M, M, M);
}
var vr = _r(2),
  yr = _r(3),
  br = _r(1),
  xr = _r(0),
  Sr = _r(4),
  Cr = _r(5),
  wr = _r(6),
  Tr = _r(7);
function Er(e) {
  switch (e) {
    case `"`:
      return `\\"`;
    case `\\`:
      return `\\\\`;
    case `
`:
      return `\\n`;
    case `\r`:
      return `\\r`;
    case `\b`:
      return `\\b`;
    case `	`:
      return `\\t`;
    case `\f`:
      return `\\f`;
    case `<`:
      return `\\x3C`;
    case `\u2028`:
      return `\\u2028`;
    case `\u2029`:
      return `\\u2029`;
    default:
      return M;
  }
}
function Dr(e) {
  let t = ``,
    n = 0,
    r;
  for (let i = 0, a = e.length; i < a; i++)
    ((r = Er(e[i])), r && ((t += e.slice(n, i) + r), (n = i + 1)));
  return (n === 0 ? (t = e) : (t += e.slice(n)), t);
}
function Or(e) {
  switch (e) {
    case `\\\\`:
      return `\\`;
    case `\\"`:
      return `"`;
    case `\\n`:
      return `
`;
    case `\\r`:
      return `\r`;
    case `\\b`:
      return `\b`;
    case `\\t`:
      return `	`;
    case `\\f`:
      return `\f`;
    case `\\x3C`:
      return `<`;
    case `\\u2028`:
      return `\u2028`;
    case `\\u2029`:
      return `\u2029`;
    default:
      return e;
  }
}
function kr(e) {
  return e.replace(/(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g, Or);
}
var Ar = `__SEROVAL_REFS__`,
  jr = new Map(),
  Mr = new Map();
function Nr(e) {
  return jr.has(e);
}
function Pr(e) {
  return Mr.has(e);
}
function Fr(e) {
  if (Nr(e)) return jr.get(e);
  throw new Ci(e);
}
function Ir(e) {
  if (Pr(e)) return Mr.get(e);
  throw new wi(e);
}
typeof globalThis < `u`
  ? Object.defineProperty(globalThis, Ar, {
      value: Mr,
      configurable: !0,
      writable: !1,
      enumerable: !1,
    })
  : typeof window < `u`
    ? Object.defineProperty(window, Ar, {
        value: Mr,
        configurable: !0,
        writable: !1,
        enumerable: !1,
      })
    : typeof self < `u`
      ? Object.defineProperty(self, Ar, {
          value: Mr,
          configurable: !0,
          writable: !1,
          enumerable: !1,
        })
      : typeof global < `u` &&
        Object.defineProperty(global, Ar, {
          value: Mr,
          configurable: !0,
          writable: !1,
          enumerable: !1,
        });
function Lr(e) {
  return e instanceof EvalError
    ? 1
    : e instanceof RangeError
      ? 2
      : e instanceof ReferenceError
        ? 3
        : e instanceof SyntaxError
          ? 4
          : e instanceof TypeError
            ? 5
            : e instanceof URIError
              ? 6
              : 0;
}
function Rr(e) {
  let t = hr[Lr(e)];
  return e.name === t
    ? e.constructor.name === t
      ? {}
      : { name: e.constructor.name }
    : { name: e.name };
}
function zr(e, t) {
  let n = Rr(e),
    r = Object.getOwnPropertyNames(e);
  for (let i = 0, a = r.length, o; i < a; i++)
    ((o = r[i]),
      o !== `name` &&
        o !== `message` &&
        (o === `stack` ? t & 4 && ((n ||= {}), (n[o] = e[o])) : ((n ||= {}), (n[o] = e[o]))));
  return n;
}
function Br(e) {
  return Object.isFrozen(e) ? 3 : Object.isSealed(e) ? 2 : +!Object.isExtensible(e);
}
function Vr(e) {
  switch (e) {
    case 1 / 0:
      return Cr;
    case -1 / 0:
      return wr;
  }
  return e === e ? (Object.is(e, -0) ? Sr : N(0, M, e, M, M, M, M, M, M, M, M, M)) : Tr;
}
function Hr(e) {
  return N(1, M, Dr(e), M, M, M, M, M, M, M, M, M);
}
function Ur(e) {
  return N(3, M, `` + e, M, M, M, M, M, M, M, M, M);
}
function Wr(e) {
  return N(4, e, M, M, M, M, M, M, M, M, M, M);
}
function Gr(e, t) {
  let n = t.valueOf();
  return N(5, e, n === n ? t.toISOString() : ``, M, M, M, M, M, M, M, M, M);
}
function Kr(e, t) {
  return N(6, e, M, Dr(t.source), t.flags, M, M, M, M, M, M, M);
}
function qr(e, t) {
  return N(17, e, fr[t], M, M, M, M, M, M, M, M, M);
}
function Jr(e, t) {
  return N(18, e, Dr(Fr(t)), M, M, M, M, M, M, M, M, M);
}
function Yr(e, t, n) {
  return N(25, e, n, Dr(t), M, M, M, M, M, M, M, M);
}
function Xr(e, t, n) {
  return N(9, e, M, M, M, M, M, n, M, M, Br(t), M);
}
function Zr(e, t) {
  return N(21, e, M, M, M, M, M, M, t, M, M, M);
}
function Qr(e, t, n) {
  return N(15, e, M, t.constructor.name, M, M, M, M, n, t.byteOffset, M, t.length);
}
function $r(e, t, n) {
  return N(16, e, M, t.constructor.name, M, M, M, M, n, t.byteOffset, M, t.length);
}
function ei(e, t, n) {
  return N(20, e, M, M, M, M, M, M, n, t.byteOffset, M, t.byteLength);
}
function ti(e, t, n) {
  return N(13, e, Lr(t), M, Dr(t.message), n, M, M, M, M, M, M);
}
function ni(e, t, n) {
  return N(14, e, Lr(t), M, Dr(t.message), n, M, M, M, M, M, M);
}
function ri(e, t) {
  return N(7, e, M, M, M, M, M, t, M, M, M, M);
}
function ii(e, t) {
  return N(28, M, M, M, M, M, M, [e, t], M, M, M, M);
}
function ai(e, t) {
  return N(30, M, M, M, M, M, M, [e, t], M, M, M, M);
}
function oi(e, t, n) {
  return N(31, e, M, M, M, M, M, n, t, M, M, M);
}
function si(e, t) {
  return N(32, e, M, M, M, M, M, M, t, M, M, M);
}
function ci(e, t) {
  return N(33, e, M, M, M, M, M, M, t, M, M, M);
}
function li(e, t) {
  return N(34, e, M, M, M, M, M, M, t, M, M, M);
}
function ui(e, t, n, r) {
  return N(35, e, n, M, M, M, M, t, M, M, M, r);
}
var { toString: di } = Object.prototype,
  fi = { parsing: 1, serialization: 2, deserialization: 3 };
function pi(e) {
  return `Seroval Error (step: ${fi[e]})`;
}
var mi = (e, t) => pi(e),
  hi = class extends Error {
    constructor(e, t) {
      (super(mi(e, t)), (this.cause = t));
    }
  },
  gi = class extends hi {
    constructor(e) {
      super(`parsing`, e);
    }
  },
  _i = class extends hi {
    constructor(e) {
      super(`deserialization`, e);
    }
  };
function vi(e) {
  return `Seroval Error (specific: ${e})`;
}
var yi = class extends Error {
    constructor(e) {
      (super(vi(1)), (this.value = e));
    }
  },
  bi = class extends Error {
    constructor(e) {
      super(vi(2));
    }
  },
  xi = class extends Error {
    constructor(e) {
      super(vi(3));
    }
  },
  Si = class extends Error {
    constructor(e) {
      super(vi(4));
    }
  },
  Ci = class extends Error {
    constructor(e) {
      (super(vi(5)), (this.value = e));
    }
  },
  wi = class extends Error {
    constructor(e) {
      super(vi(6));
    }
  },
  Ti = class extends Error {
    constructor(e) {
      super(vi(7));
    }
  },
  Ei = class extends Error {
    constructor(e) {
      super(vi(8));
    }
  },
  Di = class extends Error {
    constructor(e) {
      super(vi(9));
    }
  },
  Oi = class {
    constructor(e, t) {
      ((this.value = e), (this.replacement = t));
    }
  },
  ki = () => {
    let e = { p: 0, s: 0, f: 0 };
    return (
      (e.p = new Promise((t, n) => {
        ((e.s = t), (e.f = n));
      })),
      e
    );
  };
(ki.toString(),
  ((e, t) => {
    (e.s(t), (e.p.s = 1), (e.p.v = t));
  }).toString(),
  ((e, t) => {
    (e.f(t), (e.p.s = 2), (e.p.v = t));
  }).toString());
var Ai = () => {
  let e = [],
    t = [],
    n = !0,
    r = !1,
    i = 0,
    a = (e, n, r) => {
      for (r = 0; r < i; r++) t[r] && t[r][n](e);
    },
    o = (t, i, a, o) => {
      for (i = 0, a = e.length; i < a; i++)
        ((o = e[i]), !n && i === a - 1 ? t[r ? `return` : `throw`](o) : t.next(o));
    },
    s = (e, r) => (
      n && ((r = i++), (t[r] = e)),
      o(e),
      () => {
        n && ((t[r] = t[i]), (t[i--] = void 0));
      }
    );
  return {
    __SEROVAL_STREAM__: !0,
    on: (e) => s(e),
    next: (t) => {
      n && (e.push(t), a(t, `next`));
    },
    throw: (i) => {
      n && (e.push(i), a(i, `throw`), (n = !1), (r = !1), (t.length = 0));
    },
    return: (i) => {
      n && (e.push(i), a(i, `return`), (n = !1), (r = !0), (t.length = 0));
    },
  };
};
Ai.toString();
var ji = (e) => (t) => () => {
  let n = 0,
    r = {
      [e]: () => r,
      next: () => {
        if (n > t.d) return { done: !0, value: void 0 };
        let e = n++,
          r = t.v[e];
        if (e === t.t) throw r;
        return { done: e === t.d, value: r };
      },
    };
  return r;
};
ji.toString();
var Mi = (e, t) => (n) => () => {
  let r = 0,
    i = -1,
    a = !1,
    o = [],
    s = [],
    c = (e = 0, t = s.length) => {
      for (; e < t; e++) s[e].s({ done: !0, value: void 0 });
    };
  n.on({
    next: (e) => {
      let t = s.shift();
      (t && t.s({ done: !1, value: e }), o.push(e));
    },
    throw: (e) => {
      let t = s.shift();
      (t && t.f(e), c(), (i = o.length), (a = !0), o.push(e));
    },
    return: (e) => {
      let t = s.shift();
      (t && t.s({ done: !0, value: e }), c(), (i = o.length), o.push(e));
    },
  });
  let l = {
    [e]: () => l,
    next: () => {
      if (i === -1) {
        let e = r++;
        if (e >= o.length) {
          let e = t();
          return (s.push(e), e.p);
        }
        return { done: !1, value: o[e] };
      }
      if (r > i) return { done: !0, value: void 0 };
      let e = r++,
        n = o[e];
      if (e !== i) return { done: !1, value: n };
      if (a) throw n;
      return { done: !0, value: n };
    },
  };
  return l;
};
Mi.toString();
var Ni = (e) => {
  let t = atob(e),
    n = t.length,
    r = new Uint8Array(n);
  for (let e = 0; e < n; e++) r[e] = t.charCodeAt(e);
  return r.buffer;
};
Ni.toString();
function Pi(e) {
  return `__SEROVAL_SEQUENCE__` in e;
}
function Fi(e, t, n) {
  return { __SEROVAL_SEQUENCE__: !0, v: e, t, d: n };
}
function Ii(e) {
  let t = [],
    n = -1,
    r = -1,
    i = e[nr]();
  for (;;)
    try {
      let e = i.next();
      if ((t.push(e.value), e.done)) {
        r = t.length - 1;
        break;
      }
    } catch (e) {
      ((n = t.length), t.push(e));
    }
  return Fi(t, n, r);
}
var Li = ji(nr);
function Ri(e) {
  return Li(e);
}
var zi = {},
  P = {},
  F = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
function Bi(e) {
  return `__SEROVAL_STREAM__` in e;
}
function Vi() {
  return Ai();
}
function Hi(e) {
  let t = Vi(),
    n = e[$n]();
  async function r() {
    try {
      let e = await n.next();
      e.done ? t.return(e.value) : (t.next(e.value), await r());
    } catch (e) {
      t.throw(e);
    }
  }
  return (r().catch(() => {}), t);
}
var Ui = Mi($n, ki);
function Wi(e) {
  return Ui(e);
}
async function Gi(e) {
  try {
    return [1, await e];
  } catch (e) {
    return [0, e];
  }
}
function Ki(e, t) {
  return {
    plugins: t.plugins,
    mode: e,
    marked: new Set(),
    features: 63 ^ (t.disabledFeatures || 0),
    refs: t.refs || new Map(),
    depthLimit: t.depthLimit || 1e3,
  };
}
function qi(e, t) {
  e.marked.add(t);
}
function Ji(e, t) {
  let n = e.refs.size;
  return (e.refs.set(t, n), n);
}
function Yi(e, t) {
  let n = e.refs.get(t);
  return n == null ? { type: 0, value: Ji(e, t) } : (qi(e, n), { type: 1, value: Wr(n) });
}
function Xi(e, t) {
  let n = Yi(e, t);
  return n.type === 1 ? n : Nr(t) ? { type: 2, value: Jr(n.value, t) } : n;
}
function Zi(e, t) {
  let n = Xi(e, t);
  if (n.type !== 0) return n.value;
  if (t in fr) return qr(n.value, t);
  throw new yi(t);
}
function Qi(e, t) {
  let n = Yi(e, F[t]);
  return n.type === 1 ? n.value : N(26, n.value, t, M, M, M, M, M, M, M, M, M);
}
function $i(e) {
  let t = Yi(e, zi);
  return t.type === 1 ? t.value : N(27, t.value, M, M, M, M, M, M, Zi(e, nr), M, M, M);
}
function ea(e) {
  let t = Yi(e, P);
  return t.type === 1 ? t.value : N(29, t.value, M, M, M, M, M, [Qi(e, 1), Zi(e, $n)], M, M, M, M);
}
function ta(e, t, n, r) {
  return N(n ? 11 : 10, e, M, M, M, r, M, M, M, M, Br(t), M);
}
function na(e, t, n, r) {
  return N(8, t, M, M, M, M, { k: n, v: r }, M, Qi(e, 0), M, M, M);
}
function ra(e, t, n) {
  let r = new Uint8Array(n),
    i = ``;
  for (let e = 0, t = r.length; e < t; e++) i += String.fromCharCode(r[e]);
  return N(19, t, Dr(btoa(i)), M, M, M, M, M, Qi(e, 5), M, M, M);
}
function ia(e, t) {
  return { base: Ki(e, t), child: void 0 };
}
var aa = class {
  constructor(e, t) {
    ((this._p = e), (this.depth = t));
  }
  parse(e) {
    return Ta(this._p, this.depth, e);
  }
};
async function oa(e, t, n) {
  let r = [];
  for (let i = 0, a = n.length; i < a; i++) i in n ? (r[i] = await Ta(e, t, n[i])) : (r[i] = 0);
  return r;
}
async function sa(e, t, n, r) {
  return Xr(n, r, await oa(e, t, r));
}
async function ca(e, t, n) {
  let r = Object.entries(n),
    i = [],
    a = [];
  for (let n = 0, o = r.length; n < o; n++) (i.push(Dr(r[n][0])), a.push(await Ta(e, t, r[n][1])));
  return (
    nr in n && (i.push(Zi(e.base, nr)), a.push(ii($i(e.base), await Ta(e, t, Ii(n))))),
    $n in n && (i.push(Zi(e.base, $n)), a.push(ai(ea(e.base), await Ta(e, t, Hi(n))))),
    ur in n && (i.push(Zi(e.base, ur)), a.push(Hr(n[ur]))),
    tr in n && (i.push(Zi(e.base, tr)), a.push(n[tr] ? vr : yr)),
    { k: i, v: a }
  );
}
async function la(e, t, n, r, i) {
  return ta(n, r, i, await ca(e, t, r));
}
async function ua(e, t, n, r) {
  return Zr(n, await Ta(e, t, r.valueOf()));
}
async function da(e, t, n, r) {
  return Qr(n, r, await Ta(e, t, r.buffer));
}
async function fa(e, t, n, r) {
  return $r(n, r, await Ta(e, t, r.buffer));
}
async function pa(e, t, n, r) {
  return ei(n, r, await Ta(e, t, r.buffer));
}
async function ma(e, t, n, r) {
  let i = zr(r, e.base.features);
  return ti(n, r, i ? await ca(e, t, i) : M);
}
async function ha(e, t, n, r) {
  let i = zr(r, e.base.features);
  return ni(n, r, i ? await ca(e, t, i) : M);
}
async function ga(e, t, n, r) {
  let i = [],
    a = [];
  for (let [n, o] of r.entries()) (i.push(await Ta(e, t, n)), a.push(await Ta(e, t, o)));
  return na(e.base, n, i, a);
}
async function _a(e, t, n, r) {
  let i = [];
  for (let n of r.keys()) i.push(await Ta(e, t, n));
  return ri(n, i);
}
async function va(e, t, n, r) {
  let i = e.base.plugins;
  if (i)
    for (let a = 0, o = i.length; a < o; a++) {
      let o = i[a];
      if (o.parse.async && o.test(r))
        return Yr(n, o.tag, await o.parse.async(r, new aa(e, t), { id: n }));
    }
  return M;
}
async function ya(e, t, n, r) {
  let [i, a] = await Gi(r);
  return N(12, n, i, M, M, M, M, M, await Ta(e, t, a), M, M, M);
}
function ba(e, t, n, r, i) {
  let a = [],
    o = n.on({
      next: (n) => {
        (qi(this.base, t),
          Ta(this, e, n).then(
            (e) => {
              a.push(si(t, e));
            },
            (e) => {
              (i(e), o());
            },
          ));
      },
      throw: (n) => {
        (qi(this.base, t),
          Ta(this, e, n).then(
            (e) => {
              (a.push(ci(t, e)), r(a), o());
            },
            (e) => {
              (i(e), o());
            },
          ));
      },
      return: (n) => {
        (qi(this.base, t),
          Ta(this, e, n).then(
            (e) => {
              (a.push(li(t, e)), r(a), o());
            },
            (e) => {
              (i(e), o());
            },
          ));
      },
    });
}
async function xa(e, t, n, r) {
  return oi(n, Qi(e.base, 4), await new Promise(ba.bind(e, t, n, r)));
}
async function Sa(e, t, n, r) {
  let i = [];
  for (let n = 0, a = r.v.length; n < a; n++) i[n] = await Ta(e, t, r.v[n]);
  return ui(n, i, r.t, r.d);
}
async function Ca(e, t, n, r) {
  if (Array.isArray(r)) return sa(e, t, n, r);
  if (Bi(r)) return xa(e, t, n, r);
  if (Pi(r)) return Sa(e, t, n, r);
  let i = r.constructor;
  if (i === Oi) return Ta(e, t, r.replacement);
  let a = await va(e, t, n, r);
  if (a) return a;
  switch (i) {
    case Object:
      return la(e, t, n, r, !1);
    case M:
      return la(e, t, n, r, !0);
    case Date:
      return Gr(n, r);
    case Error:
    case EvalError:
    case RangeError:
    case ReferenceError:
    case SyntaxError:
    case TypeError:
    case URIError:
      return ma(e, t, n, r);
    case Number:
    case Boolean:
    case String:
    case BigInt:
      return ua(e, t, n, r);
    case ArrayBuffer:
      return ra(e.base, n, r);
    case Int8Array:
    case Int16Array:
    case Int32Array:
    case Uint8Array:
    case Uint16Array:
    case Uint32Array:
    case Uint8ClampedArray:
    case Float32Array:
    case Float64Array:
      return da(e, t, n, r);
    case DataView:
      return pa(e, t, n, r);
    case Map:
      return ga(e, t, n, r);
    case Set:
      return _a(e, t, n, r);
    default:
      break;
  }
  if (i === Promise || r instanceof Promise) return ya(e, t, n, r);
  let o = e.base.features;
  if (o & 32 && i === RegExp) return Kr(n, r);
  if (o & 16)
    switch (i) {
      case BigInt64Array:
      case BigUint64Array:
        return fa(e, t, n, r);
      default:
        break;
    }
  if (o & 1 && typeof AggregateError < `u` && (i === AggregateError || r instanceof AggregateError))
    return ha(e, t, n, r);
  if (r instanceof Error) return ma(e, t, n, r);
  if (nr in r || $n in r) return la(e, t, n, r, !!i);
  throw new yi(r);
}
async function wa(e, t, n) {
  let r = Xi(e.base, n);
  if (r.type !== 0) return r.value;
  let i = await va(e, t, r.value, n);
  if (i) return i;
  throw new yi(n);
}
async function Ta(e, t, n) {
  switch (typeof n) {
    case `boolean`:
      return n ? vr : yr;
    case `undefined`:
      return br;
    case `string`:
      return Hr(n);
    case `number`:
      return Vr(n);
    case `bigint`:
      return Ur(n);
    case `object`:
      if (n) {
        let r = Xi(e.base, n);
        return r.type === 0 ? await Ca(e, t + 1, r.value, n) : r.value;
      }
      return xr;
    case `symbol`:
      return Zi(e.base, n);
    case `function`:
      return wa(e, t, n);
    default:
      throw new yi(n);
  }
}
async function Ea(e, t) {
  try {
    return await Ta(e, 0, t);
  } catch (e) {
    throw e instanceof gi ? e : new gi(e);
  }
}
var Da = ((e) => ((e[(e.Vanilla = 1)] = `Vanilla`), (e[(e.Cross = 2)] = `Cross`), e))(Da || {});
function Oa(e) {
  return e;
}
function ka(e, t) {
  for (let n = 0, r = t.length; n < r; n++) {
    let r = t[n];
    e.has(r) || (e.add(r), r.extends && ka(e, r.extends));
  }
}
function Aa(e) {
  if (e) {
    let t = new Set();
    return (ka(t, e), [...t]);
  }
}
function ja(e) {
  switch (e) {
    case `Int8Array`:
      return Int8Array;
    case `Int16Array`:
      return Int16Array;
    case `Int32Array`:
      return Int32Array;
    case `Uint8Array`:
      return Uint8Array;
    case `Uint16Array`:
      return Uint16Array;
    case `Uint32Array`:
      return Uint32Array;
    case `Uint8ClampedArray`:
      return Uint8ClampedArray;
    case `Float32Array`:
      return Float32Array;
    case `Float64Array`:
      return Float64Array;
    case `BigInt64Array`:
      return BigInt64Array;
    case `BigUint64Array`:
      return BigUint64Array;
    default:
      throw new Ti(e);
  }
}
function Ma(e) {
  switch (e) {
    case `constructor`:
    case `__proto__`:
    case `prototype`:
    case `__defineGetter__`:
    case `__defineSetter__`:
    case `__lookupGetter__`:
    case `__lookupSetter__`:
      return !1;
    default:
      return !0;
  }
}
function Na(e) {
  switch (e) {
    case $n:
    case tr:
    case ur:
    case nr:
      return !0;
    default:
      return !1;
  }
}
var Pa = 1e6,
  Fa = 1e4,
  Ia = 2e4;
function La(e, t) {
  switch (t) {
    case 3:
      return Object.freeze(e);
    case 1:
      return Object.preventExtensions(e);
    case 2:
      return Object.seal(e);
    default:
      return e;
  }
}
var Ra = 1e3;
function za(e, t) {
  let n = t.refs || new Map();
  return (
    `types` in n || Object.assign(n, { types: new Map() }),
    {
      mode: e,
      plugins: t.plugins,
      refs: n,
      features: t.features ?? 63 ^ (t.disabledFeatures || 0),
      depthLimit: t.depthLimit || Ra,
    }
  );
}
function Ba(e) {
  return { mode: 2, base: za(2, e), child: M };
}
var Va = class {
  constructor(e, t) {
    ((this._p = e), (this.depth = t));
  }
  deserialize(e) {
    return z(this._p, this.depth, e);
  }
};
function Ha(e, t) {
  if (t < 0 || !Number.isFinite(t) || !Number.isInteger(t)) throw new Ei({ t: 4, i: t });
  if (e.refs.has(t)) throw Error(`Conflicted ref id: ` + t);
}
function Ua(e, t, n) {
  return (Ha(e.base, t), e.state.marked.has(t) && e.base.refs.set(t, n), n);
}
function Wa(e, t, n) {
  return (Ha(e.base, t), e.base.refs.set(t, n), n);
}
function I(e, t, n) {
  return e.mode === 1 ? Ua(e, t, n) : Wa(e, t, n);
}
function Ga(e, t, n) {
  if (Object.hasOwn(t, n)) return t[n];
  throw new Ei(e);
}
function Ka(e, t) {
  return I(e, t.i, Ir(kr(t.s)));
}
function qa(e, t, n) {
  let r = n.a,
    i = r.length,
    a = I(e, n.i, Array(i));
  for (let n = 0, o; n < i; n++) ((o = r[n]), o && (a[n] = z(e, t, o)));
  return (La(a, n.o), a);
}
function Ja(e, t, n) {
  Ma(t)
    ? (e[t] = n)
    : Object.defineProperty(e, t, { value: n, configurable: !0, enumerable: !0, writable: !0 });
}
function Ya(e, t, n, r, i) {
  if (typeof r == `string`) Ja(n, kr(r), z(e, t, i));
  else {
    let a = z(e, t, r);
    switch (typeof a) {
      case `string`:
        Ja(n, a, z(e, t, i));
        break;
      case `symbol`:
        Na(a) && (n[a] = z(e, t, i));
        break;
      default:
        throw new Ei(r);
    }
  }
}
function Xa(e, t, n) {
  e.base.refs.types.set(t, n);
}
function Za(e, t, n, r) {
  if (e.base.refs.types.get(n) !== r) throw new Ei(t);
}
function Qa(e, t, n, r) {
  let i = n.k;
  if (i.length > 0) for (let a = 0, o = n.v, s = i.length; a < s; a++) Ya(e, t, r, i[a], o[a]);
  return r;
}
function $a(e, t, n) {
  let r = I(e, n.i, n.t === 10 ? {} : Object.create(null));
  return (Qa(e, t, n.p, r), La(r, n.o), r);
}
function eo(e, t) {
  return I(e, t.i, new Date(t.s));
}
function to(e, t) {
  if (e.base.features & 32) {
    let n = kr(t.c);
    if (n.length > Ia) throw new Ei(t);
    return I(e, t.i, new RegExp(n, t.m));
  }
  throw new bi(t);
}
function no(e, t, n) {
  let r = I(e, n.i, new Set());
  for (let i = 0, a = n.a, o = a.length; i < o; i++) r.add(z(e, t, a[i]));
  return r;
}
function ro(e, t, n) {
  let r = I(e, n.i, new Map());
  for (let i = 0, a = n.e.k, o = n.e.v, s = a.length; i < s; i++)
    r.set(z(e, t, a[i]), z(e, t, o[i]));
  return r;
}
function io(e, t) {
  if (t.s.length > Pa) throw new Ei(t);
  return I(e, t.i, Ni(kr(t.s)));
}
function ao(e, t, n) {
  let r = ja(n.c),
    i = z(e, t, n.f),
    a = n.b ?? 0;
  if (a < 0 || a > i.byteLength) throw new Ei(n);
  return I(e, n.i, new r(i, a, n.l));
}
function oo(e, t, n) {
  let r = z(e, t, n.f),
    i = n.b ?? 0;
  if (i < 0 || i > r.byteLength) throw new Ei(n);
  return I(e, n.i, new DataView(r, i, n.l));
}
function so(e, t, n, r) {
  if (n.p) {
    let i = Qa(e, t, n.p, {});
    Object.defineProperties(r, Object.getOwnPropertyDescriptors(i));
  }
  return r;
}
function co(e, t, n) {
  return so(e, t, n, I(e, n.i, AggregateError([], kr(n.m))));
}
function lo(e, t, n) {
  let r = Ga(n, gr, n.s);
  return so(e, t, n, I(e, n.i, new r(kr(n.m))));
}
function uo(e, t, n) {
  let r = ki(),
    i = I(e, n.i, r.p),
    a = z(e, t, n.f);
  return (n.s ? r.s(a) : r.f(a), i);
}
function fo(e, t, n) {
  return I(e, n.i, Object(z(e, t, n.f)));
}
function po(e, t, n) {
  let r = e.base.plugins;
  if (r) {
    let i = kr(n.c);
    for (let a = 0, o = r.length; a < o; a++) {
      let o = r[a];
      if (o.tag === i) return I(e, n.i, o.deserialize(n.s, new Va(e, t), { id: n.i }));
    }
  }
  throw new xi(n.c);
}
function mo(e, t) {
  let n = I(e, t.i, I(e, t.s, ki()).p);
  return (Xa(e, t.s, 22), n);
}
function ho(e, t, n) {
  let r = e.base.refs.get(n.i);
  if (r) return (Za(e, n, n.i, 22), r.s(z(e, t, n.a[1])), M);
  throw new Si(`Promise`);
}
function go(e, t, n) {
  let r = e.base.refs.get(n.i);
  if (r) return (Za(e, n, n.i, 22), r.f(z(e, t, n.a[1])), M);
  throw new Si(`Promise`);
}
function _o(e, t, n) {
  return (z(e, t, n.a[0]), Ri(z(e, t, n.a[1])));
}
function L(e, t, n) {
  return (z(e, t, n.a[0]), Wi(z(e, t, n.a[1])));
}
function R(e, t, n) {
  let r = I(e, n.i, Vi());
  Xa(e, n.i, 31);
  let i = n.a,
    a = i.length;
  if (a) for (let n = 0; n < a; n++) z(e, t, i[n]);
  return r;
}
function vo(e, t, n) {
  let r = e.base.refs.get(n.i);
  if (r) return (Za(e, n, n.i, 31), r.next(z(e, t, n.f)), M);
  throw new Si(`Stream`);
}
function yo(e, t, n) {
  let r = e.base.refs.get(n.i);
  if (r) return (Za(e, n, n.i, 31), r.throw(z(e, t, n.f)), M);
  throw new Si(`Stream`);
}
function bo(e, t, n) {
  let r = e.base.refs.get(n.i);
  if (r) return (Za(e, n, n.i, 31), r.return(z(e, t, n.f)), M);
  throw new Si(`Stream`);
}
function xo(e, t, n) {
  return (z(e, t, n.f), M);
}
function So(e, t, n) {
  return (z(e, t, n.a[1]), M);
}
function Co(e, t, n) {
  let r = I(e, n.i, Fi([], n.s, n.l));
  for (let i = 0, a = n.a.length; i < a; i++) r.v[i] = z(e, t, n.a[i]);
  return r;
}
function z(e, t, n) {
  if (t > e.base.depthLimit) throw new Di(e.base.depthLimit);
  switch (((t += 1), n.t)) {
    case 2:
      return Ga(n, mr, n.s);
    case 0:
      return Number(n.s);
    case 1:
      return kr(String(n.s));
    case 3:
      if (String(n.s).length > Fa) throw new Ei(n);
      return BigInt(n.s);
    case 4:
      return e.base.refs.get(n.i);
    case 18:
      return Ka(e, n);
    case 9:
      return qa(e, t, n);
    case 10:
    case 11:
      return $a(e, t, n);
    case 5:
      return eo(e, n);
    case 6:
      return to(e, n);
    case 7:
      return no(e, t, n);
    case 8:
      return ro(e, t, n);
    case 19:
      return io(e, n);
    case 16:
    case 15:
      return ao(e, t, n);
    case 20:
      return oo(e, t, n);
    case 14:
      return co(e, t, n);
    case 13:
      return lo(e, t, n);
    case 12:
      return uo(e, t, n);
    case 17:
      return Ga(n, pr, n.s);
    case 21:
      return fo(e, t, n);
    case 25:
      return po(e, t, n);
    case 22:
      return mo(e, n);
    case 23:
      return ho(e, t, n);
    case 24:
      return go(e, t, n);
    case 28:
      return _o(e, t, n);
    case 30:
      return L(e, t, n);
    case 31:
      return R(e, t, n);
    case 32:
      return vo(e, t, n);
    case 33:
      return yo(e, t, n);
    case 34:
      return bo(e, t, n);
    case 27:
      return xo(e, t, n);
    case 29:
      return So(e, t, n);
    case 35:
      return Co(e, t, n);
    default:
      throw new bi(n);
  }
}
function wo(e, t) {
  try {
    return z(e, 0, t);
  } catch (e) {
    throw new _i(e);
  }
}
var To = (() => T).toString();
/=>/.test(To);
function Eo(e, t) {
  return wo(
    Ba({
      plugins: Aa(t.plugins),
      refs: t.refs,
      features: t.features,
      disabledFeatures: t.disabledFeatures,
      depthLimit: t.depthLimit,
    }),
    e,
  );
}
async function Do(e, t = {}) {
  let n = ia(1, { plugins: Aa(t.plugins), disabledFeatures: t.disabledFeatures });
  return { t: await Ea(n, e), f: n.base.features, m: Array.from(n.base.marked) };
}
function Oo(e) {
  return e;
}
function ko(e) {
  return Oa({
    tag: `$TSR/t/` + e.key,
    test: e.test,
    parse: {
      sync(t, n, r) {
        return { v: n.parse(e.toSerializable(t)) };
      },
      async async(t, n, r) {
        return { v: await n.parse(e.toSerializable(t)) };
      },
      stream(t, n, r) {
        return { v: n.parse(e.toSerializable(t)) };
      },
    },
    serialize: void 0,
    deserialize(t, n, r) {
      return e.fromSerializable(n.deserialize(t.v));
    },
  });
}
var Ao = class {
    constructor(e, t) {
      ((this.stream = e), (this.hint = t?.hint ?? `binary`));
    }
  },
  jo = globalThis.Buffer,
  Mo = !!jo && typeof jo.from == `function`;
function No(e) {
  if (e.length === 0) return ``;
  if (Mo) return jo.from(e).toString(`base64`);
  let t = 32768,
    n = [];
  for (let r = 0; r < e.length; r += t) {
    let i = e.subarray(r, r + t);
    n.push(String.fromCharCode.apply(null, i));
  }
  return btoa(n.join(``));
}
function Po(e) {
  if (e.length === 0) return new Uint8Array();
  if (Mo) {
    let t = jo.from(e, `base64`);
    return new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
  }
  let t = atob(e),
    n = new Uint8Array(t.length);
  for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
  return n;
}
var B = Object.create(null),
  Fo = Object.create(null),
  Io = (e) =>
    new ReadableStream({
      start(t) {
        e.on({
          next(e) {
            try {
              t.enqueue(Po(e));
            } catch {}
          },
          throw(e) {
            t.error(e);
          },
          return() {
            try {
              t.close();
            } catch {}
          },
        });
      },
    }),
  Lo = new TextEncoder(),
  Ro = (e) =>
    new ReadableStream({
      start(t) {
        e.on({
          next(e) {
            try {
              typeof e == `string` ? t.enqueue(Lo.encode(e)) : t.enqueue(Po(e.$b64));
            } catch {}
          },
          throw(e) {
            t.error(e);
          },
          return() {
            try {
              t.close();
            } catch {}
          },
        });
      },
    }),
  zo = `(s=>new ReadableStream({start(c){s.on({next(b){try{const d=atob(b),a=new Uint8Array(d.length);for(let i=0;i<d.length;i++)a[i]=d.charCodeAt(i);c.enqueue(a)}catch(_){}},throw(e){c.error(e)},return(){try{c.close()}catch(_){}}})}}))`,
  Bo = `(s=>{const e=new TextEncoder();return new ReadableStream({start(c){s.on({next(v){try{if(typeof v==='string'){c.enqueue(e.encode(v))}else{const d=atob(v.$b64),a=new Uint8Array(d.length);for(let i=0;i<d.length;i++)a[i]=d.charCodeAt(i);c.enqueue(a)}}catch(_){}},throw(x){c.error(x)},return(){try{c.close()}catch(_){}}})}})})`;
function Vo(e) {
  let t = Vi(),
    n = e.getReader();
  return (
    (async () => {
      try {
        for (;;) {
          let { done: e, value: r } = await n.read();
          if (e) {
            t.return(void 0);
            break;
          }
          t.next(No(r));
        }
      } catch (e) {
        t.throw(e);
      } finally {
        n.releaseLock();
      }
    })(),
    t
  );
}
function Ho(e) {
  let t = Vi(),
    n = e.getReader(),
    r = new TextDecoder(`utf-8`, { fatal: !0 });
  return (
    (async () => {
      try {
        for (;;) {
          let { done: e, value: i } = await n.read();
          if (e) {
            try {
              let e = r.decode();
              e.length > 0 && t.next(e);
            } catch {}
            t.return(void 0);
            break;
          }
          try {
            let e = r.decode(i, { stream: !0 });
            e.length > 0 && t.next(e);
          } catch {
            t.next({ $b64: No(i) });
          }
        }
      } catch (e) {
        t.throw(e);
      } finally {
        n.releaseLock();
      }
    })(),
    t
  );
}
var Uo = Oa({
  tag: `tss/RawStream`,
  extends: [
    Oa({
      tag: `tss/RawStreamFactory`,
      test(e) {
        return e === B;
      },
      parse: {
        sync(e, t, n) {
          return {};
        },
        async async(e, t, n) {
          return {};
        },
        stream(e, t, n) {
          return {};
        },
      },
      serialize(e, t, n) {
        return zo;
      },
      deserialize(e, t, n) {
        return B;
      },
    }),
    Oa({
      tag: `tss/RawStreamFactoryText`,
      test(e) {
        return e === Fo;
      },
      parse: {
        sync(e, t, n) {
          return {};
        },
        async async(e, t, n) {
          return {};
        },
        stream(e, t, n) {
          return {};
        },
      },
      serialize(e, t, n) {
        return Bo;
      },
      deserialize(e, t, n) {
        return Fo;
      },
    }),
  ],
  test(e) {
    return e instanceof Ao;
  },
  parse: {
    sync(e, t, n) {
      let r = e.hint === `text` ? Fo : B;
      return { hint: t.parse(e.hint), factory: t.parse(r), stream: t.parse(Vi()) };
    },
    async async(e, t, n) {
      let r = e.hint === `text` ? Fo : B,
        i = e.hint === `text` ? Ho(e.stream) : Vo(e.stream);
      return { hint: await t.parse(e.hint), factory: await t.parse(r), stream: await t.parse(i) };
    },
    stream(e, t, n) {
      let r = e.hint === `text` ? Fo : B,
        i = e.hint === `text` ? Ho(e.stream) : Vo(e.stream);
      return { hint: t.parse(e.hint), factory: t.parse(r), stream: t.parse(i) };
    },
  },
  serialize(e, t, n) {
    return `(` + t.serialize(e.factory) + `)(` + t.serialize(e.stream) + `)`;
  },
  deserialize(e, t, n) {
    let r = t.deserialize(e.stream);
    return t.deserialize(e.hint) === `text` ? Ro(r) : Io(r);
  },
});
function Wo(e) {
  return Oa({
    tag: `tss/RawStream`,
    test: () => !1,
    parse: {},
    serialize() {
      throw Error(
        `RawStreamDeserializePlugin.serialize should not be called. Client only deserializes.`,
      );
    },
    deserialize(t, n, r) {
      return e(typeof n?.deserialize == `function` ? n.deserialize(t.streamId) : t.streamId);
    },
  });
}
var Go = Oa({
    tag: `$TSR/Error`,
    test(e) {
      return e instanceof Error;
    },
    parse: {
      sync(e, t) {
        return { message: t.parse(e.message) };
      },
      async async(e, t) {
        return { message: await t.parse(e.message) };
      },
      stream(e, t) {
        return { message: t.parse(e.message) };
      },
    },
    serialize(e, t) {
      return `new Error(` + t.serialize(e.message) + `)`;
    },
    deserialize(e, t) {
      return Error(t.deserialize(e.message));
    },
  }),
  Ko = {},
  qo = (e) =>
    new ReadableStream({
      start: (t) => {
        e.on({
          next: (e) => {
            try {
              t.enqueue(e);
            } catch {}
          },
          throw: (e) => {
            t.error(e);
          },
          return: () => {
            try {
              t.close();
            } catch {}
          },
        });
      },
    }),
  Jo = Oa({
    tag: `seroval-plugins/web/ReadableStreamFactory`,
    test(e) {
      return e === Ko;
    },
    parse: {
      sync() {
        return Ko;
      },
      async async() {
        return await Promise.resolve(Ko);
      },
      stream() {
        return Ko;
      },
    },
    serialize() {
      return qo.toString();
    },
    deserialize() {
      return Ko;
    },
  });
async function Yo(e, t) {
  try {
    let n = await t.read();
    n.done ? (e.return(n.value), t.releaseLock()) : (e.next(n.value), await Yo(e, t));
  } catch (t) {
    e.throw(t);
  }
}
function Xo(e) {
  (e.cancel().catch(() => {}), e.releaseLock());
}
function Zo(e) {
  let t = Vi(),
    n = e.getReader(),
    r = Xo.bind(null, n);
  return (Yo(t, n).catch(r), [t, r]);
}
var Qo = [
  Go,
  Uo,
  Oa({
    tag: `seroval/plugins/web/ReadableStream`,
    extends: [Jo],
    test(e) {
      return typeof ReadableStream > `u` ? !1 : e instanceof ReadableStream;
    },
    parse: {
      sync(e, t) {
        return { factory: t.parse(Ko), stream: t.parse(Vi()) };
      },
      async async(e, t) {
        return { factory: await t.parse(Ko), stream: await t.parse(Zo(e)[0]) };
      },
      stream(e, t) {
        let [n, r] = Zo(e);
        return (t.addCleanup(r), { factory: t.parse(Ko), stream: t.parse(n) });
      },
    },
    serialize(e, t) {
      return `(` + t.serialize(e.factory) + `)(` + t.serialize(e.stream) + `)`;
    },
    deserialize(e, t) {
      return qo(t.deserialize(e.stream));
    },
  }),
];
function $o() {
  return [...(E()?.serializationAdapters?.map(ko) ?? []), ...Qo];
}
var es = new TextDecoder(),
  ts = new Uint8Array(),
  ns = 16 * 1024 * 1024,
  rs = 32 * 1024 * 1024,
  is = 1024,
  as = 1e5;
function os(e) {
  let t = new Map(),
    n = new Map(),
    r = new Set(),
    i = !1,
    a = null,
    o = 0,
    s,
    c = new ReadableStream({
      start(e) {
        s = e;
      },
      cancel() {
        i = !0;
        try {
          a?.cancel();
        } catch {}
        (t.forEach((e) => {
          try {
            e.error(Error(`Framed response cancelled`));
          } catch {}
        }),
          t.clear(),
          n.clear(),
          r.clear());
      },
    });
  function l(e) {
    let i = n.get(e);
    if (i) return i;
    if (r.has(e))
      return new ReadableStream({
        start(e) {
          e.close();
        },
      });
    if (n.size >= is) throw Error(`Too many raw streams in framed response (max ${is})`);
    let a = new ReadableStream({
      start(n) {
        t.set(e, n);
      },
      cancel() {
        (r.add(e), t.delete(e), n.delete(e));
      },
    });
    return (n.set(e, a), a);
  }
  function u(e) {
    return (l(e), t.get(e));
  }
  return (
    (async () => {
      let n = e.getReader();
      a = n;
      let c = [],
        l = 0;
      function d() {
        if (l < 9) return null;
        let e = c[0];
        if (e.length >= 9)
          return {
            type: e[0],
            streamId: ((e[1] << 24) | (e[2] << 16) | (e[3] << 8) | e[4]) >>> 0,
            length: ((e[5] << 24) | (e[6] << 16) | (e[7] << 8) | e[8]) >>> 0,
          };
        let t = new Uint8Array(9),
          n = 0,
          r = 9;
        for (let e = 0; e < c.length && r > 0; e++) {
          let i = c[e],
            a = Math.min(i.length, r);
          (t.set(i.subarray(0, a), n), (n += a), (r -= a));
        }
        return {
          type: t[0],
          streamId: ((t[1] << 24) | (t[2] << 16) | (t[3] << 8) | t[4]) >>> 0,
          length: ((t[5] << 24) | (t[6] << 16) | (t[7] << 8) | t[8]) >>> 0,
        };
      }
      function f(e) {
        if (e === 0) return ts;
        let t = c[0];
        if (t && t.length >= e) {
          let n = t.subarray(0, e);
          return (t.length === e ? c.shift() : (c[0] = t.subarray(e)), (l -= e), n);
        }
        let n = new Uint8Array(e),
          r = 0,
          i = e;
        for (; i > 0 && c.length > 0;) {
          let e = c[0];
          if (!e) break;
          let t = Math.min(e.length, i);
          (n.set(e.subarray(0, t), r),
            (r += t),
            (i -= t),
            t === e.length ? c.shift() : (c[0] = e.subarray(t)));
        }
        return ((l -= e), n);
      }
      try {
        for (;;) {
          let { done: e, value: a } = await n.read();
          if (i || e) break;
          if (a) {
            if (l + a.length > rs) throw Error(`Framed response buffer exceeded ${rs} bytes`);
            for (c.push(a), l += a.length; ;) {
              let e = d();
              if (!e) break;
              let { type: n, streamId: i, length: a } = e;
              if (n !== se.JSON && n !== se.CHUNK && n !== se.END && n !== se.ERROR)
                throw Error(`Unknown frame type: ${n}`);
              if (n === se.JSON) {
                if (i !== 0) throw Error(`Invalid JSON frame streamId (expected 0)`);
              } else if (i === 0) throw Error(`Invalid raw frame streamId (expected non-zero)`);
              if (a > ns) throw Error(`Frame payload too large: ${a} bytes (max ${ns})`);
              let c = 9 + a;
              if (l < c) break;
              if (++o > as) throw Error(`Too many frames in framed response (max ${as})`);
              f(9);
              let p = f(a);
              switch (n) {
                case se.JSON:
                  try {
                    s.enqueue(es.decode(p));
                  } catch {}
                  break;
                case se.CHUNK: {
                  let e = u(i);
                  e && e.enqueue(p);
                  break;
                }
                case se.END: {
                  let e = u(i);
                  if ((r.add(i), e)) {
                    try {
                      e.close();
                    } catch {}
                    t.delete(i);
                  }
                  break;
                }
                case se.ERROR: {
                  let e = u(i);
                  if ((r.add(i), e)) {
                    let n = es.decode(p);
                    (e.error(Error(n)), t.delete(i));
                  }
                  break;
                }
              }
            }
          }
        }
        if (l !== 0) throw Error(`Incomplete frame at end of framed response`);
        try {
          s.close();
        } catch {}
        (t.forEach((e) => {
          try {
            e.close();
          } catch {}
        }),
          t.clear());
      } catch (e) {
        try {
          s.error(e);
        } catch {}
        (t.forEach((t) => {
          try {
            t.error(e);
          } catch {}
        }),
          t.clear());
      } finally {
        try {
          n.releaseLock();
        } catch {}
        a = null;
      }
    })(),
    { getOrCreateStream: l, jsonChunks: c }
  );
}
var ss = null;
async function cs(e) {
  e.length > 0 && (await Promise.allSettled(e));
}
var ls = Object.prototype.hasOwnProperty;
function us(e) {
  for (let t in e) if (ls.call(e, t)) return !0;
  return !1;
}
async function ds(e, t, n) {
  ss ||= $o();
  let r = t[0],
    i = r.fetch ?? n,
    a = r.data instanceof FormData ? `formData` : `payload`,
    o = r.headers ? new Headers(r.headers) : new Headers();
  if (
    (o.set(`x-tsr-serverFn`, `true`),
    a === `payload` && o.set(`accept`, `${oe}, application/x-ndjson, application/json`),
    r.method === `GET`)
  ) {
    if (a === `formData`) throw Error(`FormData is not supported with GET requests`);
    let t = await fs(r);
    if (t !== void 0) {
      let n = Nt({ payload: t });
      e.includes(`?`) ? (e += `&${n}`) : (e += `?${n}`);
    }
  }
  let s;
  if (r.method === `POST`) {
    let e = await ms(r);
    (e?.contentType && o.set(`content-type`, e.contentType), (s = e?.body));
  }
  return await hs(async () => i(e, { method: r.method, headers: o, signal: r.signal, body: s }));
}
async function fs(e) {
  let t = !1,
    n = {};
  if (
    (e.data !== void 0 && ((t = !0), (n.data = e.data)),
    e.context && us(e.context) && ((t = !0), (n.context = e.context)),
    t)
  )
    return ps(n);
}
async function ps(e) {
  return JSON.stringify(await Promise.resolve(Do(e, { plugins: ss })));
}
async function ms(e) {
  if (e.data instanceof FormData) {
    let t;
    return (
      e.context && us(e.context) && (t = await ps(e.context)),
      t !== void 0 && e.data.set(ie, t),
      { body: e.data }
    );
  }
  let t = await fs(e);
  if (t) return { body: t, contentType: `application/json` };
}
async function hs(e) {
  let t;
  try {
    t = await e();
  } catch (e) {
    if (e instanceof Response) t = e;
    else throw (console.log(e), e);
  }
  if (t.headers.get(`x-tss-raw`) === `true`) return t;
  let n = t.headers.get(`content-type`);
  if ((n || Pe(), t.headers.get(`x-tss-serialized`))) {
    let e;
    if (n.includes(`application/x-tss-framed`)) {
      if ((ue(n), !t.body)) throw Error(`No response body for framed response`);
      let { getOrCreateStream: r, jsonChunks: i } = os(t.body),
        a = [Wo(r), ...(ss || [])],
        o = new Map();
      e = await gs({
        jsonStream: i,
        onMessage: (e) => Eo(e, { refs: o, plugins: a }),
        onError(e, t) {
          console.error(e, t);
        },
      });
    } else if (n.includes(`application/json`)) {
      let n = await t.json(),
        r = [];
      try {
        e = Eo(n, { plugins: ss });
      } finally {
      }
      await cs(r);
    }
    if ((e || Pe(), e instanceof Error)) throw e;
    return e;
  }
  if (n.includes(`application/json`)) {
    let e = await t.json(),
      n = Ut(e);
    if (n) throw n;
    if (vt(e)) throw e;
    return e;
  }
  if (!t.ok) throw Error(await t.text());
  return t;
}
async function gs({ jsonStream: e, onMessage: t, onError: n }) {
  let r = e.getReader(),
    { value: i, done: a } = await r.read();
  if (a || !i) throw Error(`Stream ended before first object`);
  let o = JSON.parse(i),
    s = !1,
    c = (async () => {
      try {
        for (;;) {
          let { value: e, done: i } = await r.read();
          if (i) break;
          if (e)
            try {
              let n = [];
              try {
                t(JSON.parse(e));
              } finally {
              }
              await cs(n);
            } catch (t) {
              n?.(`Invalid JSON: ${e}`, t);
            }
        }
      } catch (e) {
        s || n?.(`Stream processing error:`, e);
      }
    })(),
    l,
    u = [];
  try {
    l = t(o);
  } catch (e) {
    throw ((s = !0), r.cancel().catch(() => {}), e);
  }
  return (
    await cs(u),
    Promise.resolve(l).catch(() => {
      ((s = !0), r.cancel().catch(() => {}));
    }),
    c.finally(() => {
      try {
        r.releaseLock();
      } catch {}
    }),
    l
  );
}
function _s(e) {
  let t = `/_serverFn/` + e;
  return Object.assign(
    (...e) => {
      let n = E()?.serverFns?.fetch;
      return ds(t, e, n ?? fetch);
    },
    { url: t, serverFnMeta: { id: e }, [ae]: !0 },
  );
}
var vs = Oo({
  key: `$TSS/serverfn`,
  test: (e) => (typeof e != `function` || !(ae in e) ? !1 : !!e[ae]),
  toSerializable: ({ serverFnMeta: e }) => ({ functionId: e.id }),
  fromSerializable: ({ functionId: e }) => _s(e),
});
function ys(e) {
  return e.replaceAll(`\0`, `/`).replaceAll(`�`, `/`);
}
function bs(e, t) {
  ((e.id = t.i),
    (e.__beforeLoadContext = t.b),
    (e.loaderData = t.l),
    (e.status = t.s),
    (e.ssr = t.ssr),
    (e.updatedAt = t.u),
    (e.error = t.e),
    t.g !== void 0 && (e.globalNotFound = t.g));
}
async function xs(e) {
  window.$_TSR || Pe();
  let t = e.options.serializationAdapters;
  if (t?.length) {
    let e = new Map();
    (t.forEach((t) => {
      e.set(t.key, t.fromSerializable);
    }),
      (window.$_TSR.t = e),
      window.$_TSR.buffer.forEach((e) => e()));
  }
  ((window.$_TSR.initialized = !0), window.$_TSR.router || Pe());
  let n = window.$_TSR.router;
  (n.matches.forEach((e) => {
    e.i = ys(e.i);
  }),
    (n.lastMatchId &&= ys(n.lastMatchId)));
  let { manifest: r, dehydratedData: i, lastMatchId: a } = n;
  e.ssr = { manifest: r };
  let o = document.querySelector(`meta[property="csp-nonce"]`)?.content;
  ((e.options.ssr = { nonce: o }), await e.options.hydrate?.(i));
  let s = e.matchRoutes(e.stores.location.get()),
    c = Promise.all(s.map((t) => e.loadRouteChunk(e.looseRoutesById[t.routeId])));
  function l(t) {
    let n = e.looseRoutesById[t.routeId].options.pendingMinMs ?? e.options.defaultPendingMinMs;
    if (n) {
      let r = be();
      ((t._nonReactive.minPendingPromise = r),
        (t._forcePending = !0),
        setTimeout(() => {
          (r.resolve(),
            e.updateMatch(
              t.id,
              (e) => ((e._nonReactive.minPendingPromise = void 0), { ...e, _forcePending: void 0 }),
            ));
        }, n));
    }
  }
  function u(t) {
    let n = e.looseRoutesById[t.routeId];
    n && (n.options.ssr = t.ssr);
  }
  let d;
  (s.forEach((e) => {
    let t = n.matches.find((t) => t.i === e.id);
    if (!t) {
      ((e._nonReactive.dehydrated = !1), (e.ssr = !1), u(e));
      return;
    }
    (bs(e, t),
      u(e),
      (e._nonReactive.dehydrated = e.ssr !== !1),
      (e.ssr === `data-only` || e.ssr === !1) && d === void 0 && ((d = e.index), l(e)));
  }),
    e.stores.setMatches(s));
  let f = e.stores.matches.get(),
    p = e.stores.location.get();
  await Promise.all(
    f.map(async (t) => {
      try {
        let n = e.looseRoutesById[t.routeId],
          r = f[t.index - 1]?.context ?? e.options.context;
        if (n.options.context) {
          let i = {
            deps: t.loaderDeps,
            params: t.params,
            context: r ?? {},
            location: p,
            navigate: (t) => e.navigate({ ...t, _fromLocation: p }),
            buildLocation: e.buildLocation,
            cause: t.cause,
            abortController: t.abortController,
            preload: !1,
            matches: s,
            routeId: n.id,
          };
          t.__routeContext = n.options.context(i) ?? void 0;
        }
        t.context = { ...r, ...t.__routeContext, ...t.__beforeLoadContext };
        let i = {
            ssr: e.options.ssr,
            matches: f,
            match: t,
            params: t.params,
            loaderData: t.loaderData,
          },
          a = await n.options.head?.(i),
          o = await n.options.scripts?.(i);
        ((t.meta = a?.meta),
          (t.links = a?.links),
          (t.headScripts = a?.scripts),
          (t.styles = a?.styles),
          (t.scripts = o));
      } catch (e) {
        if (vt(e))
          ((t.error = { isNotFound: !0 }),
            console.error(`NotFound error during hydration for routeId: ${t.routeId}`, e));
        else
          throw (
            (t.error = e),
            console.error(`Error during hydration for route ${t.routeId}:`, e),
            e
          );
      }
    }),
  );
  let m = s[s.length - 1].id !== a;
  if (!s.some((e) => e.ssr === !1) && !m)
    return (
      s.forEach((e) => {
        e._nonReactive.dehydrated = void 0;
      }),
      e.stores.resolvedLocation.set(e.stores.location.get()),
      c
    );
  let h = Promise.resolve()
    .then(() => e.load())
    .catch((e) => {
      console.error(`Error during router hydration:`, e);
    });
  if (m) {
    let t = s[1];
    (t || Pe(),
      l(t),
      (t._displayPending = !0),
      (t._nonReactive.displayPendingPromise = h),
      h.then(() => {
        e.batch(() => {
          (e.stores.status.get() === `pending` &&
            (e.stores.status.set(`idle`), e.stores.resolvedLocation.set(e.stores.location.get())),
            e.updateMatch(t.id, (e) => ({
              ...e,
              _displayPending: void 0,
              displayPendingPromise: void 0,
            })));
        });
      }));
  }
  return c;
}
var V = e(o(), 1),
  Ss = V.use,
  Cs = typeof window < `u` ? V.useLayoutEffect : V.useEffect;
function ws(e) {
  let t = V.useRef({ value: e, prev: null }),
    n = t.current.value;
  return (e !== n && (t.current = { value: e, prev: n }), t.current.prev);
}
function Ts(e, t, n = {}, r = {}) {
  V.useEffect(() => {
    if (!e.current || r.disabled || typeof IntersectionObserver != `function`) return;
    let i = new IntersectionObserver(([e]) => {
      t(e);
    }, n);
    return (
      i.observe(e.current),
      () => {
        i.disconnect();
      }
    );
  }, [t, n, r.disabled, e]);
}
function Es(e) {
  let t = V.useRef(null);
  return (V.useImperativeHandle(e, () => t.current, []), t);
}
var H = i();
function Ds({ promise: e }) {
  if (Ss) return Ss(e);
  let t = Hn(e);
  if (t[Vn].status === `pending`) throw t;
  if (t[Vn].status === `error`) throw t[Vn].error;
  return t[Vn].data;
}
function Os(e) {
  let t = (0, H.jsx)(ks, { ...e });
  return e.fallback ? (0, H.jsx)(V.Suspense, { fallback: e.fallback, children: t }) : t;
}
function ks(e) {
  let t = Ds(e);
  return e.children(t);
}
function As(e) {
  let t = e.errorComponent ?? Ms;
  return (0, H.jsx)(js, {
    getResetKey: e.getResetKey,
    onCatch: e.onCatch,
    children: ({ error: n, reset: r }) =>
      n ? V.createElement(t, { error: n, reset: r }) : e.children,
  });
}
var js = class extends V.Component {
  constructor(...e) {
    (super(...e), (this.state = { error: null }));
  }
  static getDerivedStateFromProps(e, t) {
    let n = e.getResetKey();
    return t.error && t.resetKey !== n ? { resetKey: n, error: null } : { resetKey: n };
  }
  static getDerivedStateFromError(e) {
    return { error: e };
  }
  reset() {
    this.setState({ error: null });
  }
  componentDidCatch(e, t) {
    this.props.onCatch && this.props.onCatch(e, t);
  }
  render() {
    return this.props.children({
      error: this.state.error,
      reset: () => {
        this.reset();
      },
    });
  }
};
function Ms({ error: e }) {
  let [t, n] = V.useState(!1);
  return (0, H.jsxs)(`div`, {
    style: { padding: `.5rem`, maxWidth: `100%` },
    children: [
      (0, H.jsxs)(`div`, {
        style: { display: `flex`, alignItems: `center`, gap: `.5rem` },
        children: [
          (0, H.jsx)(`strong`, { style: { fontSize: `1rem` }, children: `Something went wrong!` }),
          (0, H.jsx)(`button`, {
            style: {
              appearance: `none`,
              fontSize: `.6em`,
              border: `1px solid currentColor`,
              padding: `.1rem .2rem`,
              fontWeight: `bold`,
              borderRadius: `.25rem`,
            },
            onClick: () => n((e) => !e),
            children: t ? `Hide Error` : `Show Error`,
          }),
        ],
      }),
      (0, H.jsx)(`div`, { style: { height: `.25rem` } }),
      t
        ? (0, H.jsx)(`div`, {
            children: (0, H.jsx)(`pre`, {
              style: {
                fontSize: `.7em`,
                border: `1px solid red`,
                borderRadius: `.25rem`,
                padding: `.3rem`,
                color: `red`,
                overflow: `auto`,
              },
              children: e.message ? (0, H.jsx)(`code`, { children: e.message }) : null,
            }),
          })
        : null,
    ],
  });
}
function Ns({ children: e, fallback: t = null }) {
  return Ps() ? (0, H.jsx)(V.Fragment, { children: e }) : (0, H.jsx)(V.Fragment, { children: t });
}
function Ps() {
  return V.useSyncExternalStore(
    Fs,
    () => !0,
    () => !1,
  );
}
function Fs() {
  return () => {};
}
var Is = V.createContext(null);
function Ls(e) {
  return V.useContext(Is);
}
var Rs = V.createContext(void 0),
  zs = V.createContext(void 0),
  U = ((e) => (
    (e[(e.None = 0)] = `None`),
    (e[(e.Mutable = 1)] = `Mutable`),
    (e[(e.Watching = 2)] = `Watching`),
    (e[(e.RecursedCheck = 4)] = `RecursedCheck`),
    (e[(e.Recursed = 8)] = `Recursed`),
    (e[(e.Dirty = 16)] = `Dirty`),
    (e[(e.Pending = 32)] = `Pending`),
    e
  ))(U || {});
function Bs({ update: e, notify: t, unwatched: n }) {
  return { link: r, unlink: i, propagate: a, checkDirty: o, shallowPropagate: s };
  function r(e, t, n) {
    let r = t.depsTail;
    if (r !== void 0 && r.dep === e) return;
    let i = r === void 0 ? t.deps : r.nextDep;
    if (i !== void 0 && i.dep === e) {
      ((i.version = n), (t.depsTail = i));
      return;
    }
    let a = e.subsTail;
    if (a !== void 0 && a.version === n && a.sub === t) return;
    let o =
      (t.depsTail =
      e.subsTail =
        { version: n, dep: e, sub: t, prevDep: r, nextDep: i, prevSub: a, nextSub: void 0 });
    (i !== void 0 && (i.prevDep = o),
      r === void 0 ? (t.deps = o) : (r.nextDep = o),
      a === void 0 ? (e.subs = o) : (a.nextSub = o));
  }
  function i(e, t = e.sub) {
    let r = e.dep,
      i = e.prevDep,
      a = e.nextDep,
      o = e.nextSub,
      s = e.prevSub;
    return (
      a === void 0 ? (t.depsTail = i) : (a.prevDep = i),
      i === void 0 ? (t.deps = a) : (i.nextDep = a),
      o === void 0 ? (r.subsTail = s) : (o.prevSub = s),
      s === void 0 ? (r.subs = o) === void 0 && n(r) : (s.nextSub = o),
      a
    );
  }
  function a(e) {
    let n = e.nextSub,
      r;
    top: do {
      let i = e.sub,
        a = i.flags;
      if (
        (a & 60
          ? a & 12
            ? a & 4
              ? !(a & 48) && c(e, i)
                ? ((i.flags = a | 40), (a &= 1))
                : (a = 0)
              : (i.flags = (a & -9) | 32)
            : (a = 0)
          : (i.flags = a | 32),
        a & 2 && t(i),
        a & 1)
      ) {
        let t = i.subs;
        if (t !== void 0) {
          let i = (e = t).nextSub;
          i !== void 0 && ((r = { value: n, prev: r }), (n = i));
          continue;
        }
      }
      if ((e = n) !== void 0) {
        n = e.nextSub;
        continue;
      }
      for (; r !== void 0;)
        if (((e = r.value), (r = r.prev), e !== void 0)) {
          n = e.nextSub;
          continue top;
        }
      break;
    } while (!0);
  }
  function o(t, n) {
    let r,
      i = 0,
      a = !1;
    top: do {
      let o = t.dep,
        c = o.flags;
      if (n.flags & 16) a = !0;
      else if ((c & 17) == 17) {
        if (e(o)) {
          let e = o.subs;
          (e.nextSub !== void 0 && s(e), (a = !0));
        }
      } else if ((c & 33) == 33) {
        ((t.nextSub !== void 0 || t.prevSub !== void 0) && (r = { value: t, prev: r }),
          (t = o.deps),
          (n = o),
          ++i);
        continue;
      }
      if (!a) {
        let e = t.nextDep;
        if (e !== void 0) {
          t = e;
          continue;
        }
      }
      for (; i--;) {
        let i = n.subs,
          o = i.nextSub !== void 0;
        if ((o ? ((t = r.value), (r = r.prev)) : (t = i), a)) {
          if (e(n)) {
            (o && s(i), (n = t.sub));
            continue;
          }
          a = !1;
        } else n.flags &= -33;
        n = t.sub;
        let c = t.nextDep;
        if (c !== void 0) {
          t = c;
          continue top;
        }
      }
      return a;
    } while (!0);
  }
  function s(e) {
    do {
      let n = e.sub,
        r = n.flags;
      (r & 48) == 32 && ((n.flags = r | 16), (r & 6) == 2 && t(n));
    } while ((e = e.nextSub) !== void 0);
  }
  function c(e, t) {
    let n = t.depsTail;
    for (; n !== void 0;) {
      if (n === e) return !0;
      n = n.prevDep;
    }
    return !1;
  }
}
function Vs(e, t, n) {
  let r = typeof e == `object`,
    i = r ? e : void 0;
  return {
    next: (r ? e.next : e)?.bind(i),
    error: (r ? e.error : t)?.bind(i),
    complete: (r ? e.complete : n)?.bind(i),
  };
}
var Hs = [],
  Us = 0,
  {
    link: Ws,
    unlink: Gs,
    propagate: Ks,
    checkDirty: qs,
    shallowPropagate: Js,
  } = Bs({
    update(e) {
      return e._update();
    },
    notify(e) {
      ((Hs[Xs++] = e), (e.flags &= ~U.Watching));
    },
    unwatched(e) {
      e.depsTail !== void 0 && ((e.depsTail = void 0), (e.flags = U.Mutable | U.Dirty), ec(e));
    },
  }),
  Ys = 0,
  Xs = 0,
  Zs,
  Qs = 0;
function $s(e) {
  try {
    (++Qs, e());
  } finally {
    --Qs || tc();
  }
}
function ec(e) {
  let t = e.depsTail,
    n = t === void 0 ? e.deps : t.nextDep;
  for (; n !== void 0;) n = Gs(n, e);
}
function tc() {
  if (!(Qs > 0)) {
    for (; Ys < Xs;) {
      let e = Hs[Ys];
      ((Hs[Ys++] = void 0), e.notify());
    }
    ((Ys = 0), (Xs = 0));
  }
}
function nc(e, t) {
  let n = typeof e == `function`,
    r = e,
    i = {
      _snapshot: n ? void 0 : e,
      subs: void 0,
      subsTail: void 0,
      deps: void 0,
      depsTail: void 0,
      flags: n ? U.None : U.Mutable,
      get() {
        return (Zs !== void 0 && Ws(i, Zs, Us), i._snapshot);
      },
      subscribe(e) {
        let t = Vs(e),
          n = { current: !1 },
          r = rc(() => {
            (i.get(), n.current ? t.next?.(i._snapshot) : (n.current = !0));
          });
        return {
          unsubscribe: () => {
            r.stop();
          },
        };
      },
      _update(e) {
        let a = Zs,
          o = t?.compare ?? Object.is;
        if (n) ((Zs = i), ++Us, (i.depsTail = void 0));
        else if (e === void 0) return !1;
        n && (i.flags = U.Mutable | U.RecursedCheck);
        try {
          let t = i._snapshot,
            a = typeof e == `function` ? e(t) : e === void 0 && n ? r(t) : e;
          return t === void 0 || !o(t, a) ? ((i._snapshot = a), !0) : !1;
        } finally {
          ((Zs = a), n && (i.flags &= ~U.RecursedCheck), ec(i));
        }
      },
    };
  return (
    n
      ? ((i.flags = U.Mutable | U.Dirty),
        (i.get = function () {
          let e = i.flags;
          if (e & U.Dirty || (e & U.Pending && qs(i.deps, i))) {
            if (i._update()) {
              let e = i.subs;
              e !== void 0 && Js(e);
            }
          } else e & U.Pending && (i.flags = e & ~U.Pending);
          return (Zs !== void 0 && Ws(i, Zs, Us), i._snapshot);
        }))
      : (i.set = function (e) {
          if (i._update(e)) {
            let e = i.subs;
            e !== void 0 && (Ks(e), Js(e), tc());
          }
        }),
    i
  );
}
function rc(e) {
  let t = () => {
      let t = Zs;
      ((Zs = n), ++Us, (n.depsTail = void 0), (n.flags = U.Watching | U.RecursedCheck));
      try {
        return e();
      } finally {
        ((Zs = t), (n.flags &= ~U.RecursedCheck), ec(n));
      }
    },
    n = {
      deps: void 0,
      depsTail: void 0,
      subs: void 0,
      subsTail: void 0,
      flags: U.Watching | U.RecursedCheck,
      notify() {
        let e = this.flags;
        e & U.Dirty || (e & U.Pending && qs(this.deps, this)) ? t() : (this.flags = U.Watching);
      },
      stop() {
        ((this.flags = U.None), (this.depsTail = void 0), ec(this));
      },
    };
  return (t(), n);
}
var ic = t((e) => {
    var t = o();
    function n(e, t) {
      return (e === t && (e !== 0 || 1 / e == 1 / t)) || (e !== e && t !== t);
    }
    var r = typeof Object.is == `function` ? Object.is : n,
      i = t.useState,
      a = t.useEffect,
      s = t.useLayoutEffect,
      c = t.useDebugValue;
    function l(e, t) {
      var n = t(),
        r = i({ inst: { value: n, getSnapshot: t } }),
        o = r[0].inst,
        l = r[1];
      return (
        s(
          function () {
            ((o.value = n), (o.getSnapshot = t), u(o) && l({ inst: o }));
          },
          [e, n, t],
        ),
        a(
          function () {
            return (
              u(o) && l({ inst: o }),
              e(function () {
                u(o) && l({ inst: o });
              })
            );
          },
          [e],
        ),
        c(n),
        n
      );
    }
    function u(e) {
      var t = e.getSnapshot;
      e = e.value;
      try {
        var n = t();
        return !r(e, n);
      } catch {
        return !0;
      }
    }
    function d(e, t) {
      return t();
    }
    var f =
      typeof window > `u` || window.document === void 0 || window.document.createElement === void 0
        ? d
        : l;
    e.useSyncExternalStore = t.useSyncExternalStore === void 0 ? f : t.useSyncExternalStore;
  }),
  ac = t((e, t) => {
    t.exports = ic();
  }),
  oc = t((e) => {
    var t = o(),
      n = ac();
    function r(e, t) {
      return (e === t && (e !== 0 || 1 / e == 1 / t)) || (e !== e && t !== t);
    }
    var i = typeof Object.is == `function` ? Object.is : r,
      a = n.useSyncExternalStore,
      s = t.useRef,
      c = t.useEffect,
      l = t.useMemo,
      u = t.useDebugValue;
    e.useSyncExternalStoreWithSelector = function (e, t, n, r, o) {
      var d = s(null);
      if (d.current === null) {
        var f = { hasValue: !1, value: null };
        d.current = f;
      } else f = d.current;
      d = l(
        function () {
          function e(e) {
            if (!a) {
              if (((a = !0), (s = e), (e = r(e)), o !== void 0 && f.hasValue)) {
                var t = f.value;
                if (o(t, e)) return (c = t);
              }
              return (c = e);
            }
            if (((t = c), i(s, e))) return t;
            var n = r(e);
            return o !== void 0 && o(t, n) ? ((s = e), t) : ((s = e), (c = n));
          }
          var a = !1,
            s,
            c,
            l = n === void 0 ? null : n;
          return [
            function () {
              return e(t());
            },
            l === null
              ? void 0
              : function () {
                  return e(l());
                },
          ];
        },
        [t, n, r, o],
      );
      var p = a(e, d[0], d[1]);
      return (
        c(
          function () {
            ((f.hasValue = !0), (f.value = p));
          },
          [p],
        ),
        u(p),
        p
      );
    };
  }),
  sc = t((e, t) => {
    t.exports = oc();
  })();
function cc(e, t) {
  return e === t;
}
function lc(e, t, n = cc) {
  let r = (0, V.useCallback)(
      (t) => {
        if (!e) return () => {};
        let { unsubscribe: n } = e.subscribe(t);
        return n;
      },
      [e],
    ),
    i = (0, V.useCallback)(() => e?.get(), [e]);
  return (0, sc.useSyncExternalStoreWithSelector)(r, i, i, t, n);
}
var uc = {
  get() {},
  subscribe() {
    return { unsubscribe() {} };
  },
};
function dc(e, t) {
  let n = V.useRef();
  return (r) => {
    let i = e?.select ? e.select(r) : r;
    return (e?.structuralSharing ?? t.options.defaultStructuralSharing)
      ? (n.current = ge(n.current, i))
      : i;
  };
}
function fc(e) {
  let t = Ls(),
    n = V.useContext(e.from ? zs : Rs),
    r = e.from ? t.stores.getRouteMatchStore(e.from) : t.stores.matchStores.get(n),
    i = dc(e, t),
    a = lc(r ?? uc, (e) => (e ? i(e) : uc));
  if (a !== uc) return a;
  (e.shouldThrow ?? !0) && Pe();
}
function pc(e) {
  return fc({
    from: e.from,
    strict: e.strict,
    structuralSharing: e.structuralSharing,
    select: (t) => (e.select ? e.select(t.loaderData) : t.loaderData),
  });
}
function mc(e) {
  let { select: t, ...n } = e;
  return fc({ ...n, select: (e) => (t ? t(e.loaderDeps) : e.loaderDeps) });
}
function hc(e) {
  return fc({
    from: e.from,
    shouldThrow: e.shouldThrow,
    structuralSharing: e.structuralSharing,
    strict: e.strict,
    select: (t) => {
      let n = e.strict === !1 ? t.params : t._strictParams;
      return e.select ? e.select(n) : n;
    },
  });
}
function gc(e) {
  return fc({
    from: e.from,
    strict: e.strict,
    shouldThrow: e.shouldThrow,
    structuralSharing: e.structuralSharing,
    select: (t) => (e.select ? e.select(t.search) : t.search),
  });
}
function _c(e) {
  let t = Ls();
  return V.useCallback((n) => t.navigate({ ...n, from: n.from ?? e?.from }), [e?.from, t]);
}
function vc(e) {
  return fc({ ...e, select: (t) => (e.select ? e.select(t.context) : t.context) });
}
var yc = e(a(), 1);
function bc(e, t) {
  let n = Ls(),
    r = Es(t),
    {
      activeProps: i,
      inactiveProps: a,
      activeOptions: o,
      to: s,
      preload: c,
      preloadDelay: l,
      preloadIntentProximity: u,
      hashScrollIntoView: d,
      replace: f,
      startTransition: p,
      resetScroll: m,
      viewTransition: h,
      children: g,
      target: _,
      disabled: v,
      style: y,
      className: b,
      onClick: x,
      onBlur: S,
      onFocus: C,
      onMouseEnter: ee,
      onMouseLeave: te,
      onTouchStart: ne,
      ignoreBlocker: re,
      params: w,
      search: ie,
      hash: ae,
      state: oe,
      mask: se,
      reloadDocument: ce,
      unsafeRelative: le,
      from: ue,
      _fromLocation: E,
      ...D
    } = e,
    de = Ps(),
    pe = V.useMemo(
      () => e,
      [
        n,
        e.from,
        e._fromLocation,
        e.hash,
        e.to,
        e.search,
        e.params,
        e.state,
        e.mask,
        e.unsafeRelative,
      ],
    ),
    me = lc(
      n.stores.location,
      (e) => e,
      (e, t) => e.href === t.href,
    ),
    O = V.useMemo(() => {
      let e = { _fromLocation: me, ...pe };
      return n.buildLocation(e);
    }, [n, me, pe]),
    k = O.maskedLocation ? O.maskedLocation.publicHref : O.publicHref,
    he = O.maskedLocation ? O.maskedLocation.external : O.external,
    ge = V.useMemo(() => kc(k, he, n.history, v), [v, he, k, n.history]),
    _e = V.useMemo(() => {
      if (ge?.external) return De(ge.href, n.protocolAllowlist) ? void 0 : ge.href;
      if (!Ac(s) && !(typeof s != `string` || s.indexOf(`:`) === -1))
        try {
          return (new URL(s), De(s, n.protocolAllowlist) ? void 0 : s);
        } catch {}
    }, [s, ge, n.protocolAllowlist]),
    ve = V.useMemo(() => {
      if (_e) return !1;
      if (o?.exact) {
        if (!ft(me.pathname, O.pathname, n.basepath)) return !1;
      } else {
        let e = dt(me.pathname, n.basepath),
          t = dt(O.pathname, n.basepath);
        if (!(e.startsWith(t) && (e.length === t.length || e[t.length] === `/`))) return !1;
      }
      return (o?.includeSearch ?? !0) &&
        !j(me.search, O.search, { partial: !o?.exact, ignoreUndefined: !o?.explicitUndefined })
        ? !1
        : !o?.includeHash || (de && me.hash === O.hash);
    }, [
      o?.exact,
      o?.explicitUndefined,
      o?.includeHash,
      o?.includeSearch,
      me,
      _e,
      de,
      O.hash,
      O.pathname,
      O.search,
      n.basepath,
    ]),
    ye = ve ? (fe(i, {}) ?? Sc) : xc,
    A = ve ? xc : (fe(a, {}) ?? xc),
    be = [b, ye.className, A.className].filter(Boolean).join(` `),
    xe = (y || ye.style || A.style) && { ...y, ...ye.style, ...A.style },
    [Se, Ce] = V.useState(!1),
    we = V.useRef(!1),
    Te = e.reloadDocument || _e ? !1 : (c ?? n.options.defaultPreload),
    Ee = l ?? n.options.defaultPreloadDelay ?? 0,
    Oe = V.useCallback(() => {
      n.preloadRoute({ ...pe, _builtLocation: O }).catch((e) => {
        (console.warn(e), console.warn(Un));
      });
    }, [n, pe, O]);
  (Ts(
    r,
    V.useCallback(
      (e) => {
        e?.isIntersecting && Oe();
      },
      [Oe],
    ),
    Dc,
    { disabled: !!v || Te !== `viewport` },
  ),
    V.useEffect(() => {
      we.current || (!v && Te === `render` && (Oe(), (we.current = !0)));
    }, [v, Oe, Te]));
  let ke = (e) => {
    let t = e.currentTarget.getAttribute(`target`),
      r = _ === void 0 ? t : _;
    if (!v && !Mc(e) && !e.defaultPrevented && (!r || r === `_self`) && e.button === 0) {
      (e.preventDefault(),
        (0, yc.flushSync)(() => {
          Ce(!0);
        }));
      let t = n.subscribe(`onResolved`, () => {
        (t(), Ce(!1));
      });
      n.navigate({
        ...pe,
        replace: f,
        resetScroll: m,
        hashScrollIntoView: d,
        startTransition: p,
        viewTransition: h,
        ignoreBlocker: re,
      });
    }
  };
  if (_e)
    return {
      ...D,
      ref: r,
      href: _e,
      ...(g && { children: g }),
      ...(_ && { target: _ }),
      ...(v && { disabled: v }),
      ...(y && { style: y }),
      ...(b && { className: b }),
      ...(x && { onClick: x }),
      ...(S && { onBlur: S }),
      ...(C && { onFocus: C }),
      ...(ee && { onMouseEnter: ee }),
      ...(te && { onMouseLeave: te }),
      ...(ne && { onTouchStart: ne }),
    };
  let Ae = (e) => {
      if (v || Te !== `intent`) return;
      if (!Ee) {
        Oe();
        return;
      }
      let t = e.currentTarget;
      if (Ec.has(t)) return;
      let n = setTimeout(() => {
        (Ec.delete(t), Oe());
      }, Ee);
      Ec.set(t, n);
    },
    je = (e) => {
      v || Te !== `intent` || Oe();
    },
    Me = (e) => {
      if (v || !Te || !Ee) return;
      let t = e.currentTarget,
        n = Ec.get(t);
      n && (clearTimeout(n), Ec.delete(t));
    };
  return {
    ...D,
    ...ye,
    ...A,
    href: ge?.href,
    ref: r,
    onClick: Oc([x, ke]),
    onBlur: Oc([S, Me]),
    onFocus: Oc([C, Ae]),
    onMouseEnter: Oc([ee, Ae]),
    onMouseLeave: Oc([te, Me]),
    onTouchStart: Oc([ne, je]),
    disabled: !!v,
    target: _,
    ...(xe && { style: xe }),
    ...(be && { className: be }),
    ...(v && Cc),
    ...(ve && wc),
    ...(de && Se && Tc),
  };
}
var xc = {},
  Sc = { className: `active` },
  Cc = { role: `link`, "aria-disabled": !0 },
  wc = { "data-status": `active`, "aria-current": `page` },
  Tc = { "data-transitioning": `transitioning` },
  Ec = new WeakMap(),
  Dc = { rootMargin: `100px` },
  Oc = (e) => (t) => {
    for (let n of e)
      if (n) {
        if (t.defaultPrevented) return;
        n(t);
      }
  };
function kc(e, t, n, r) {
  if (!r) return t ? { href: e, external: !0 } : { href: n.createHref(e) || `/`, external: !1 };
}
function Ac(e) {
  if (typeof e != `string`) return !1;
  let t = e.charCodeAt(0);
  return t === 47 ? e.charCodeAt(1) !== 47 : t === 46;
}
var jc = V.forwardRef((e, t) => {
  let { _asChild: n, ...r } = e,
    { type: i, ...a } = bc(r, t),
    o =
      typeof r.children == `function`
        ? r.children({ isActive: a[`data-status`] === `active` })
        : r.children;
  if (!n) {
    let { disabled: e, ...t } = a;
    return V.createElement(`a`, t, o);
  }
  return V.createElement(n, a, o);
});
function Mc(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}
var Nc = class extends Xn {
  constructor(e) {
    (super(e),
      (this.useMatch = (e) =>
        fc({ select: e?.select, from: this.id, structuralSharing: e?.structuralSharing })),
      (this.useRouteContext = (e) => vc({ ...e, from: this.id })),
      (this.useSearch = (e) =>
        gc({ select: e?.select, structuralSharing: e?.structuralSharing, from: this.id })),
      (this.useParams = (e) =>
        hc({ select: e?.select, structuralSharing: e?.structuralSharing, from: this.id })),
      (this.useLoaderDeps = (e) => mc({ ...e, from: this.id })),
      (this.useLoaderData = (e) => pc({ ...e, from: this.id })),
      (this.useNavigate = () => _c({ from: this.fullPath })),
      (this.Link = V.forwardRef((e, t) => (0, H.jsx)(jc, { ref: t, from: this.fullPath, ...e }))));
  }
};
function Pc(e) {
  return new Nc(e);
}
function Fc() {
  return (e) => Lc(e);
}
var Ic = class extends Zn {
  constructor(e) {
    (super(e),
      (this.useMatch = (e) =>
        fc({ select: e?.select, from: this.id, structuralSharing: e?.structuralSharing })),
      (this.useRouteContext = (e) => vc({ ...e, from: this.id })),
      (this.useSearch = (e) =>
        gc({ select: e?.select, structuralSharing: e?.structuralSharing, from: this.id })),
      (this.useParams = (e) =>
        hc({ select: e?.select, structuralSharing: e?.structuralSharing, from: this.id })),
      (this.useLoaderDeps = (e) => mc({ ...e, from: this.id })),
      (this.useLoaderData = (e) => pc({ ...e, from: this.id })),
      (this.useNavigate = () => _c({ from: this.fullPath })),
      (this.Link = V.forwardRef((e, t) => (0, H.jsx)(jc, { ref: t, from: this.fullPath, ...e }))));
  }
};
function Lc(e) {
  return new Ic(e);
}
function Rc(e) {
  return new W(e, { silent: !0 }).createRoute;
}
var W = class {
  constructor(e, t) {
    ((this.path = e),
      (this.createRoute = (e) => {
        let t = Pc(e);
        return ((t.isRoot = !1), t);
      }),
      (this.silent = t?.silent));
  }
};
function zc(e, t) {
  let n,
    r,
    i,
    a,
    o = () => (
      (n ||= e()
        .then((e) => {
          ((n = void 0), (r = e[t ?? `default`]));
        })
        .catch((e) => {
          if (
            ((i = e),
            xe(i) && i instanceof Error && typeof window < `u` && typeof sessionStorage < `u`)
          ) {
            let e = `tanstack_router_reload:${i.message}`;
            sessionStorage.getItem(e) || (sessionStorage.setItem(e, `1`), (a = !0));
          }
        })),
      n
    ),
    s = function (e) {
      if (a) throw (window.location.reload(), new Promise(() => {}));
      if (i) throw i;
      if (!r)
        if (Ss) Ss(o());
        else throw o();
      return V.createElement(r, e);
    };
  return ((s.preload = o), s);
}
function Bc(e) {
  let t = Ls(),
    n = `not-found-${lc(t.stores.location, (e) => e.pathname)}-${lc(t.stores.status, (e) => e)}`;
  return (0, H.jsx)(As, {
    getResetKey: () => n,
    onCatch: (t, n) => {
      if (vt(t)) e.onCatch?.(t, n);
      else throw t;
    },
    errorComponent: ({ error: t }) => {
      if (vt(t)) return e.fallback?.(t);
      throw t;
    },
    children: e.children,
  });
}
function Vc() {
  return (0, H.jsx)(`p`, { children: `Not Found` });
}
function Hc(e) {
  return (0, H.jsx)(H.Fragment, { children: e.children });
}
function Uc(e, t, n) {
  return t.options.notFoundComponent
    ? (0, H.jsx)(t.options.notFoundComponent, { ...n })
    : e.options.defaultNotFoundComponent
      ? (0, H.jsx)(e.options.defaultNotFoundComponent, { ...n })
      : (0, H.jsx)(Vc, {});
}
var Wc = (e, t) => e.routeId === t.routeId && e._displayPending === t._displayPending,
  Gc = (e, t) => e[0] === t[0] && e[1] === t[1],
  Kc = V.memo(function ({ matchId: e }) {
    let t = Ls(),
      n = t.stores.matchStores.get(e);
    n || Pe();
    let r = lc(t.stores.loadedAt, (e) => e),
      i = lc(n, (e) => e, Wc);
    return (0, H.jsx)(qc, {
      router: t,
      matchId: e,
      resetKey: r,
      matchState: V.useMemo(() => {
        let e = i.routeId,
          n = t.routesById[e].parentRoute?.id;
        return { routeId: e, ssr: i.ssr, _displayPending: i._displayPending, parentRouteId: n };
      }, [i._displayPending, i.routeId, i.ssr, t.routesById]),
    });
  });
function qc({ router: e, matchId: t, resetKey: n, matchState: r }) {
  let i = e.routesById[r.routeId],
    a = i.options.pendingComponent ?? e.options.defaultPendingComponent,
    o = a ? (0, H.jsx)(a, {}) : null,
    s = i.options.errorComponent ?? e.options.defaultErrorComponent,
    c = i.options.onCatch ?? e.options.defaultOnCatch,
    l = i.isRoot
      ? (i.options.notFoundComponent ?? e.options.notFoundRoute?.options.component)
      : i.options.notFoundComponent,
    u = r.ssr === !1 || r.ssr === `data-only`,
    d =
      (!i.isRoot || i.options.wrapInSuspense || u) &&
      (i.options.wrapInSuspense ?? a ?? (i.options.errorComponent?.preload || u))
        ? V.Suspense
        : Hc,
    f = s ? As : Hc,
    p = l ? Bc : Hc;
  return (0, H.jsxs)(i.isRoot ? (i.options.shellComponent ?? Hc) : Hc, {
    children: [
      (0, H.jsx)(Rs.Provider, {
        value: t,
        children: (0, H.jsx)(d, {
          fallback: o,
          children: (0, H.jsx)(f, {
            getResetKey: () => n,
            errorComponent: s || Ms,
            onCatch: (e, t) => {
              if (vt(e)) throw ((e.routeId ??= r.routeId), e);
              c?.(e, t);
            },
            children: (0, H.jsx)(p, {
              fallback: (e) => {
                if (
                  ((e.routeId ??= r.routeId),
                  !l || (e.routeId && e.routeId !== r.routeId) || (!e.routeId && !i.isRoot))
                )
                  throw e;
                return V.createElement(l, e);
              },
              children:
                u || r._displayPending
                  ? (0, H.jsx)(Ns, { fallback: o, children: (0, H.jsx)(Yc, { matchId: t }) })
                  : (0, H.jsx)(Yc, { matchId: t }),
            }),
          }),
        }),
      }),
      r.parentRouteId === `__root__`
        ? (0, H.jsxs)(H.Fragment, {
            children: [(0, H.jsx)(Jc, {}), (e.options.scrollRestoration, null)],
          })
        : null,
    ],
  });
}
function Jc() {
  let e = Ls(),
    t = V.useRef();
  return (
    Cs(() => {
      let n = e.stores.resolvedLocation.get(),
        r = t.current;
      (n &&
        (!r || r.href !== n.href) &&
        e.emit({ type: `onRendered`, ...An(e.stores.location.get(), r ?? n) }),
        (t.current = n));
    }, [lc(e.stores.resolvedLocation, (e) => e?.state.__TSR_key), e]),
    null
  );
}
var Yc = V.memo(function ({ matchId: e }) {
    let t = Ls(),
      n = (e, n) => t.getMatch(e.id)?._nonReactive[n] ?? e._nonReactive[n],
      r = t.stores.matchStores.get(e);
    r || Pe();
    let i = lc(r, (e) => e),
      a = i.routeId,
      o = t.routesById[a],
      s = V.useMemo(() => {
        let e = (t.routesById[a].options.remountDeps ?? t.options.defaultRemountDeps)?.({
          routeId: a,
          loaderDeps: i.loaderDeps,
          params: i._strictParams,
          search: i._strictSearch,
        });
        return e ? JSON.stringify(e) : void 0;
      }, [
        a,
        i.loaderDeps,
        i._strictParams,
        i._strictSearch,
        t.options.defaultRemountDeps,
        t.routesById,
      ]),
      c = V.useMemo(() => {
        let e = o.options.component ?? t.options.defaultComponent;
        return e ? (0, H.jsx)(e, {}, s) : (0, H.jsx)(Xc, {});
      }, [s, o.options.component, t.options.defaultComponent]);
    if (i._displayPending) throw n(i, `displayPendingPromise`);
    if (i._forcePending) throw n(i, `minPendingPromise`);
    if (i.status === `pending`) {
      let e = o.options.pendingMinMs ?? t.options.defaultPendingMinMs;
      if (e) {
        let n = t.getMatch(i.id);
        if (n && !n._nonReactive.minPendingPromise) {
          let t = be();
          ((n._nonReactive.minPendingPromise = t),
            setTimeout(() => {
              (t.resolve(), (n._nonReactive.minPendingPromise = void 0));
            }, e));
        }
      }
      throw n(i, `loadPromise`);
    }
    if (i.status === `notFound`) return (vt(i.error) || Pe(), Uc(t, o, i.error));
    if (i.status === `redirected`) throw (Ht(i.error) || Pe(), n(i, `loadPromise`));
    if (i.status === `error`) throw i.error;
    return c;
  }),
  Xc = V.memo(function () {
    let e = Ls(),
      t = V.useContext(Rs),
      n,
      r = !1,
      i;
    {
      let a = t ? e.stores.matchStores.get(t) : void 0;
      (([n, r] = lc(a, (e) => [e?.routeId, e?.globalNotFound ?? !1], Gc)),
        (i = lc(e.stores.matchesId, (e) => e[e.findIndex((e) => e === t) + 1])));
    }
    let a = n ? e.routesById[n] : void 0,
      o = e.options.defaultPendingComponent
        ? (0, H.jsx)(e.options.defaultPendingComponent, {})
        : null;
    if (r) return (a || Pe(), Uc(e, a, void 0));
    if (!i) return null;
    let s = (0, H.jsx)(Kc, { matchId: i });
    return n === `__root__` ? (0, H.jsx)(V.Suspense, { fallback: o, children: s }) : s;
  });
function Zc() {
  let e = Ls(),
    t = V.useRef({ router: e, mounted: !1 }),
    [n, r] = V.useState(!1),
    i = lc(e.stores.isLoading, (e) => e),
    a = lc(e.stores.hasPending, (e) => e),
    o = ws(i),
    s = i || n || a,
    c = ws(s),
    l = i || a,
    u = ws(l);
  return (
    (e.startTransition = (e) => {
      (r(!0),
        V.startTransition(() => {
          (e(), r(!1));
        }));
    }),
    V.useEffect(() => {
      let t = e.history.subscribe(e.load),
        n = e.buildLocation({
          to: e.latestLocation.pathname,
          search: !0,
          params: !0,
          hash: !0,
          state: !0,
          _includeValidateSearch: !0,
        });
      return (
        lt(e.latestLocation.publicHref) !== lt(n.publicHref) &&
          e.commitLocation({ ...n, replace: !0 }),
        () => {
          t();
        }
      );
    }, [e, e.history]),
    Cs(() => {
      (typeof window < `u` && e.ssr) ||
        (t.current.router === e && t.current.mounted) ||
        ((t.current = { router: e, mounted: !0 }),
        (async () => {
          try {
            await e.load();
          } catch (e) {
            console.error(e);
          }
        })());
    }, [e]),
    Cs(() => {
      o &&
        !i &&
        e.emit({ type: `onLoad`, ...An(e.stores.location.get(), e.stores.resolvedLocation.get()) });
    }, [o, e, i]),
    Cs(() => {
      u &&
        !l &&
        e.emit({
          type: `onBeforeRouteMount`,
          ...An(e.stores.location.get(), e.stores.resolvedLocation.get()),
        });
    }, [l, u, e]),
    Cs(() => {
      if (c && !s) {
        let t = An(e.stores.location.get(), e.stores.resolvedLocation.get());
        (e.emit({ type: `onResolved`, ...t }),
          $s(() => {
            (e.stores.status.set(`idle`), e.stores.resolvedLocation.set(e.stores.location.get()));
          }));
      }
    }, [s, c, e]),
    null
  );
}
function Qc() {
  let e = Ls(),
    t = e.routesById.__root__.options.pendingComponent ?? e.options.defaultPendingComponent,
    n = t ? (0, H.jsx)(t, {}) : null,
    r = (0, H.jsxs)(typeof document < `u` && e.ssr ? Hc : V.Suspense, {
      fallback: n,
      children: [(0, H.jsx)(Zc, {}), (0, H.jsx)($c, {})],
    });
  return e.options.InnerWrap ? (0, H.jsx)(e.options.InnerWrap, { children: r }) : r;
}
function $c() {
  let e = Ls(),
    t = lc(e.stores.firstId, (e) => e),
    n = lc(e.stores.loadedAt, (e) => e),
    r = t ? (0, H.jsx)(Kc, { matchId: t }) : null;
  return (0, H.jsx)(Rs.Provider, {
    value: t,
    children: e.options.disableGlobalCatchBoundary
      ? r
      : (0, H.jsx)(As, { getResetKey: () => n, errorComponent: Ms, onCatch: void 0, children: r }),
  });
}
var el = (e) => ({ createMutableStore: nc, createReadonlyStore: nc, batch: $s }),
  tl = (e) => new nl(e),
  nl = class extends jn {
    constructor(e) {
      super(e, el);
    }
  };
function rl({ router: e, children: t, ...n }) {
  O(n) && e.update({ ...e.options, ...n, context: { ...e.options.context, ...n.context } });
  let r = (0, H.jsx)(Is.Provider, { value: e, children: t });
  return e.options.Wrap ? (0, H.jsx)(e.options.Wrap, { children: r }) : r;
}
function il({ router: e, ...t }) {
  return (0, H.jsx)(rl, { router: e, ...t, children: (0, H.jsx)(Qc, {}) });
}
function al(e, t) {
  if (t)
    for (let [n, r] of Object.entries(t))
      n !== `suppressHydrationWarning` &&
        r !== void 0 &&
        r !== !1 &&
        e.setAttribute(n, typeof r == `boolean` ? `` : String(r));
}
function ol(e) {
  let { attrs: t, children: n, nonce: r, preventScriptHoist: i } = e;
  switch (e.tag) {
    case `title`:
      return (0, H.jsx)(`title`, { ...t, suppressHydrationWarning: !0, children: n });
    case `meta`:
      return (0, H.jsx)(`meta`, { ...t, suppressHydrationWarning: !0 });
    case `link`:
      return (0, H.jsx)(`link`, {
        ...t,
        precedence: t?.precedence ?? (t?.rel === `stylesheet` ? `default` : void 0),
        nonce: r,
        suppressHydrationWarning: !0,
      });
    case `style`:
      return (
        e.inlineCss,
        (0, H.jsx)(`style`, { ...t, dangerouslySetInnerHTML: { __html: n }, nonce: r })
      );
    case `script`:
      return (0, H.jsx)(sl, { attrs: t, preventScriptHoist: i, children: n });
    default:
      return null;
  }
}
function sl({ attrs: e, children: t, preventScriptHoist: n }) {
  Ls();
  let r = Ps(),
    i =
      typeof e?.type == `string` &&
      e.type !== `` &&
      e.type !== `text/javascript` &&
      e.type !== `module`;
  if (
    (V.useEffect(() => {
      if (!i) {
        if (e?.src) {
          let t = (() => {
            try {
              let t = document.baseURI || window.location.href;
              return new URL(e.src, t).href;
            } catch {
              return e.src;
            }
          })();
          for (let e of document.querySelectorAll(`script[src]`)) if (e.src === t) return;
          let n = document.createElement(`script`);
          return (al(n, e), document.head.appendChild(n), () => n.remove());
        }
        if (typeof t == `string`) {
          let n = typeof e?.type == `string` ? e.type : `text/javascript`,
            r = typeof e?.nonce == `string` ? e.nonce : void 0;
          for (let e of document.querySelectorAll(`script:not([src])`)) {
            if (!(e instanceof HTMLScriptElement)) continue;
            let i = e.getAttribute(`type`) ?? `text/javascript`,
              a = e.getAttribute(`nonce`) ?? void 0;
            if (e.textContent === t && i === n && a === r) return;
          }
          let i = document.createElement(`script`);
          return ((i.textContent = t), al(i, e), document.head.appendChild(i), () => i.remove());
        }
      }
    }, [e, t, i]),
    i && typeof t == `string`)
  )
    return (0, H.jsx)(`script`, {
      ...e,
      suppressHydrationWarning: !0,
      dangerouslySetInnerHTML: { __html: t },
    });
  if (!r) {
    if (e?.src) return (0, H.jsx)(`script`, { ...e, suppressHydrationWarning: !0 });
    if (typeof t == `string`)
      return (0, H.jsx)(`script`, {
        ...e,
        dangerouslySetInnerHTML: { __html: t },
        suppressHydrationWarning: !0,
      });
  }
  return null;
}
var cl = (e) => {
  let t = Ls(),
    n = t.options.ssr?.nonce,
    r = lc(t.stores.matches, (e) => e.map((e) => e.meta).filter((e) => e !== void 0), j),
    i = V.useMemo(() => {
      let e = [],
        t = {},
        i;
      for (let a = r.length - 1; a >= 0; a--) {
        let o = r[a];
        for (let r = o.length - 1; r >= 0; r--) {
          let a = o[r];
          if (a)
            if (a.title) i ||= { tag: `title`, children: a.title };
            else if (`script:ld+json` in a)
              try {
                let t = JSON.stringify(a[`script:ld+json`]);
                e.push({ tag: `script`, attrs: { type: `application/ld+json` }, children: Ae(t) });
              } catch {}
            else {
              let r = a.name ?? a.property;
              if (r) {
                if (t[r]) continue;
                t[r] = !0;
              }
              e.push({ tag: `meta`, attrs: { ...a, nonce: n } });
            }
        }
      }
      return (
        i && e.push(i),
        n && e.push({ tag: `meta`, attrs: { property: `csp-nonce`, content: n } }),
        e.reverse(),
        e
      );
    }, [r, n]),
    a = lc(
      t.stores.matches,
      (e) =>
        e
          .flatMap((e) => e.links ?? [])
          .filter((e) => e !== void 0)
          .map((e) => ({ tag: `link`, attrs: { ...e, nonce: n } })),
      j,
    ),
    o = lc(
      t.stores.matches,
      (r) => {
        let i = t.ssr?.manifest,
          a = [];
        return i
          ? (r.forEach((t) => {
              i.routes[t.routeId]?.css?.forEach((t) => {
                let r = Yn(t);
                a.push({
                  tag: `link`,
                  attrs: {
                    rel: `stylesheet`,
                    ...r,
                    crossOrigin: Wn(e, `stylesheet`) ?? r.crossOrigin,
                    suppressHydrationWarning: !0,
                    nonce: n,
                  },
                });
              });
            }),
            i.inlineStyle &&
              a.push({
                tag: `style`,
                attrs: { ...i.inlineStyle.attrs, nonce: n },
                children: i.inlineStyle.children,
                inlineCss: !0,
              }),
            a)
          : a;
      },
      j,
    ),
    s = lc(
      t.stores.matches,
      (r) => {
        let i = [],
          a = t.ssr?.manifest;
        return (
          a &&
            r.forEach((t) => {
              a.routes[t.routeId]?.preloads?.forEach((t) => {
                i.push({ tag: `link`, attrs: { ...Kn(a, t, e), nonce: n } });
              });
            }),
          i
        );
      },
      j,
    ),
    c = lc(
      t.stores.matches,
      (e) =>
        e
          .flatMap((e) => e.styles ?? [])
          .filter((e) => e !== void 0)
          .map(({ children: e, ...t }) => ({
            tag: `style`,
            attrs: { ...t, nonce: n },
            children: e,
          })),
      j,
    ),
    l = lc(
      t.stores.matches,
      (e) =>
        e
          .flatMap((e) => e.headScripts ?? [])
          .filter((e) => e !== void 0)
          .map(({ children: e, ...t }) => ({
            tag: `script`,
            attrs: { ...t, nonce: n },
            children: e,
          })),
      j,
    ),
    u = [];
  return (Jn(u, i), u.push(...s), Jn(u, a), u.push(...o), Jn(u, c), Jn(u, l), u);
};
function G(e) {
  let t = cl(e.assetCrossOrigin),
    n = Ls().options.ssr?.nonce;
  return (0, H.jsx)(H.Fragment, {
    children: t.map((e) =>
      (0, V.createElement)(ol, { ...e, key: `tsr-meta-${JSON.stringify(e)}`, nonce: n }),
    ),
  });
}
var ll = () => {
  let e = Ls(),
    t = e.options.ssr?.nonce,
    n = (n) => {
      let r = [],
        i = e.ssr?.manifest;
      if (!i) return [];
      for (let e of n) {
        let n = i.routes[e.routeId]?.scripts;
        if (n)
          for (let e of n)
            r.push({
              tag: `script`,
              attrs: { ...e.attrs, nonce: t },
              children: e.children,
              ...(typeof e.attrs?.src == `string` ? { preventScriptHoist: !0 } : {}),
            });
      }
      return r;
    },
    r = (e) =>
      e
        .map((e) => e.scripts)
        .flat(1)
        .filter(Boolean)
        .map(({ children: e, ...n }) => ({
          tag: `script`,
          attrs: { ...n, suppressHydrationWarning: !0, nonce: t },
          children: e,
        })),
    i = lc(e.stores.matches, n, j);
  return ul(e, lc(e.stores.matches, r, j), i);
};
function ul(e, t, n) {
  let r = [...t, ...n];
  return (0, H.jsx)(H.Fragment, {
    children: r.map((e, t) => (0, V.createElement)(ol, { ...e, key: `tsr-scripts-${e.tag}-${t}` })),
  });
}
var dl = (e, t) => {
  let n = { type: `request`, ...(t || e) },
    r = (e) => dl({}, Object.assign(n, { validator: e, inputValidator: e }));
  return {
    options: n,
    middleware: (e) => dl({}, Object.assign(n, { middleware: e })),
    validator: r,
    inputValidator: r,
    client: (e) => dl({}, Object.assign(n, { client: e })),
    server: (e) => dl({}, Object.assign(n, { server: e })),
  };
};
function fl(e, t) {
  for (let n = 0, r = t.length; n < r; n++) {
    let r = t[n];
    e.has(r) || (e.add(r), r.extends && fl(e, r.extends));
  }
}
var pl = (e) => ({
    getOptions: async () => {
      let t = await e();
      if (t.serializationAdapters) {
        let e = new Set();
        (fl(e, t.serializationAdapters), (t.serializationAdapters = Array.from(e)));
      }
      return t;
    },
    createMiddleware: dl,
  }),
  ml = dl(),
  hl = pl(() => ({ requestMiddleware: [ml] })),
  gl = class extends c {
    #e;
    #t;
    #n;
    #r;
    constructor(e) {
      (super(),
        (this.#e = e.client),
        (this.mutationId = e.mutationId),
        (this.#n = e.mutationCache),
        (this.#t = []),
        (this.state = e.state || _l()),
        this.setOptions(e.options),
        this.scheduleGc());
    }
    setOptions(e) {
      ((this.options = e), this.updateGcTime(this.options.gcTime));
    }
    get meta() {
      return this.options.meta;
    }
    addObserver(e) {
      this.#t.includes(e) ||
        (this.#t.push(e),
        this.clearGcTimeout(),
        this.#n.notify({ type: `observerAdded`, mutation: this, observer: e }));
    }
    removeObserver(e) {
      ((this.#t = this.#t.filter((t) => t !== e)),
        this.scheduleGc(),
        this.#n.notify({ type: `observerRemoved`, mutation: this, observer: e }));
    }
    optionalRemove() {
      this.#t.length ||
        (this.state.status === `pending` ? this.scheduleGc() : this.#n.remove(this));
    }
    continue() {
      return this.#r?.continue() ?? this.execute(this.state.variables);
    }
    async execute(e) {
      let t = () => {
          this.#i({ type: `continue` });
        },
        n = { client: this.#e, meta: this.options.meta, mutationKey: this.options.mutationKey };
      this.#r = m({
        fn: () =>
          this.options.mutationFn
            ? this.options.mutationFn(e, n)
            : Promise.reject(Error(`No mutationFn found`)),
        onFail: (e, t) => {
          this.#i({ type: `failed`, failureCount: e, error: t });
        },
        onPause: () => {
          this.#i({ type: `pause` });
        },
        onContinue: t,
        retry: this.options.retry ?? 0,
        retryDelay: this.options.retryDelay,
        networkMode: this.options.networkMode,
        canRun: () => this.#n.canRun(this),
      });
      let r = this.state.status === `pending`,
        i = !this.#r.canStart();
      try {
        if (r) t();
        else {
          (this.#i({ type: `pending`, variables: e, isPaused: i }),
            this.#n.config.onMutate && (await this.#n.config.onMutate(e, this, n)));
          let t = await this.options.onMutate?.(e, n);
          t !== this.state.context &&
            this.#i({ type: `pending`, context: t, variables: e, isPaused: i });
        }
        let a = await this.#r.start();
        return (
          await this.#n.config.onSuccess?.(a, e, this.state.context, this, n),
          await this.options.onSuccess?.(a, e, this.state.context, n),
          await this.#n.config.onSettled?.(
            a,
            null,
            this.state.variables,
            this.state.context,
            this,
            n,
          ),
          await this.options.onSettled?.(a, null, e, this.state.context, n),
          this.#i({ type: `success`, data: a }),
          a
        );
      } catch (t) {
        try {
          await this.#n.config.onError?.(t, e, this.state.context, this, n);
        } catch (e) {
          Promise.reject(e);
        }
        try {
          await this.options.onError?.(t, e, this.state.context, n);
        } catch (e) {
          Promise.reject(e);
        }
        try {
          await this.#n.config.onSettled?.(
            void 0,
            t,
            this.state.variables,
            this.state.context,
            this,
            n,
          );
        } catch (e) {
          Promise.reject(e);
        }
        try {
          await this.options.onSettled?.(void 0, t, e, this.state.context, n);
        } catch (e) {
          Promise.reject(e);
        }
        throw (this.#i({ type: `error`, error: t }), t);
      } finally {
        this.#n.runNext(this);
      }
    }
    #i(e) {
      let t = (t) => {
        switch (e.type) {
          case `failed`:
            return { ...t, failureCount: e.failureCount, failureReason: e.error };
          case `pause`:
            return { ...t, isPaused: !0 };
          case `continue`:
            return { ...t, isPaused: !1 };
          case `pending`:
            return {
              ...t,
              context: e.context,
              data: void 0,
              failureCount: 0,
              failureReason: null,
              error: null,
              isPaused: e.isPaused,
              status: `pending`,
              variables: e.variables,
              submittedAt: Date.now(),
            };
          case `success`:
            return {
              ...t,
              data: e.data,
              failureCount: 0,
              failureReason: null,
              error: null,
              status: `success`,
              isPaused: !1,
            };
          case `error`:
            return {
              ...t,
              data: void 0,
              error: e.error,
              failureCount: t.failureCount + 1,
              failureReason: e.error,
              isPaused: !1,
              status: `error`,
            };
        }
      };
      ((this.state = t(this.state)),
        l.batch(() => {
          (this.#t.forEach((t) => {
            t.onMutationUpdate(e);
          }),
            this.#n.notify({ mutation: this, type: `updated`, action: e }));
        }));
    }
  };
function _l() {
  return {
    context: void 0,
    data: void 0,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: !1,
    status: `idle`,
    variables: void 0,
    submittedAt: 0,
  };
}
var vl = class extends p {
  constructor(e = {}) {
    (super(), (this.config = e), (this.#e = new Set()), (this.#t = new Map()), (this.#n = 0));
  }
  #e;
  #t;
  #n;
  build(e, t, n) {
    let r = new gl({
      client: e,
      mutationCache: this,
      mutationId: ++this.#n,
      options: e.defaultMutationOptions(t),
      state: n,
    });
    return (this.add(r), r);
  }
  add(e) {
    this.#e.add(e);
    let t = yl(e);
    if (typeof t == `string`) {
      let n = this.#t.get(t);
      n ? n.push(e) : this.#t.set(t, [e]);
    }
    this.notify({ type: `added`, mutation: e });
  }
  remove(e) {
    if (this.#e.delete(e)) {
      let t = yl(e);
      if (typeof t == `string`) {
        let n = this.#t.get(t);
        if (n)
          if (n.length > 1) {
            let t = n.indexOf(e);
            t !== -1 && n.splice(t, 1);
          } else n[0] === e && this.#t.delete(t);
      }
    }
    this.notify({ type: `removed`, mutation: e });
  }
  canRun(e) {
    let t = yl(e);
    if (typeof t == `string`) {
      let n = this.#t.get(t)?.find((e) => e.state.status === `pending`);
      return !n || n === e;
    } else return !0;
  }
  runNext(e) {
    let t = yl(e);
    return typeof t == `string`
      ? (this.#t
          .get(t)
          ?.find((t) => t !== e && t.state.isPaused)
          ?.continue() ?? Promise.resolve())
      : Promise.resolve();
  }
  clear() {
    l.batch(() => {
      (this.#e.forEach((e) => {
        this.notify({ type: `removed`, mutation: e });
      }),
        this.#e.clear(),
        this.#t.clear());
    });
  }
  getAll() {
    return Array.from(this.#e);
  }
  find(e) {
    let t = { exact: !0, ...e };
    return this.getAll().find((e) => x(t, e));
  }
  findAll(e = {}) {
    return this.getAll().filter((t) => x(e, t));
  }
  notify(e) {
    l.batch(() => {
      this.listeners.forEach((t) => {
        t(e);
      });
    });
  }
  resumePausedMutations() {
    let e = this.getAll().filter((e) => e.state.isPaused);
    return l.batch(() => Promise.all(e.map((e) => e.continue().catch(s))));
  }
};
function yl(e) {
  return e.options.scope?.id;
}
var bl = class extends p {
    constructor(e = {}) {
      (super(), (this.config = e), (this.#e = new Map()));
    }
    #e;
    build(e, t, n) {
      let r = t.queryKey,
        i = t.queryHash ?? u(r, t),
        a = this.get(i);
      return (
        a ||
          ((a = new _({
            client: e,
            queryKey: r,
            queryHash: i,
            options: e.defaultQueryOptions(t),
            state: n,
            defaultOptions: e.getQueryDefaults(r),
          })),
          this.add(a)),
        a
      );
    }
    add(e) {
      this.#e.has(e.queryHash) ||
        (this.#e.set(e.queryHash, e), this.notify({ type: `added`, query: e }));
    }
    remove(e) {
      let t = this.#e.get(e.queryHash);
      t &&
        (e.destroy(),
        t === e && this.#e.delete(e.queryHash),
        this.notify({ type: `removed`, query: e }));
    }
    clear() {
      l.batch(() => {
        this.getAll().forEach((e) => {
          this.remove(e);
        });
      });
    }
    get(e) {
      return this.#e.get(e);
    }
    getAll() {
      return [...this.#e.values()];
    }
    find(e) {
      let t = { exact: !0, ...e };
      return this.getAll().find((e) => ee(t, e));
    }
    findAll(e = {}) {
      let t = this.getAll();
      return Object.keys(e).length > 0 ? t.filter((t) => ee(e, t)) : t;
    }
    notify(e) {
      l.batch(() => {
        this.listeners.forEach((t) => {
          t(e);
        });
      });
    }
    onFocus() {
      l.batch(() => {
        this.getAll().forEach((e) => {
          e.onFocus();
        });
      });
    }
    onOnline() {
      l.batch(() => {
        this.getAll().forEach((e) => {
          e.onOnline();
        });
      });
    }
  },
  xl = class {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    #o;
    #s;
    constructor(e = {}) {
      ((this.#e = e.queryCache || new bl()),
        (this.#t = e.mutationCache || new vl()),
        (this.#n = e.defaultOptions || {}),
        (this.#r = new Map()),
        (this.#i = new Map()),
        (this.#a = 0));
    }
    mount() {
      (this.#a++,
        this.#a === 1 &&
          ((this.#o = n.subscribe(async (e) => {
            e && (await this.resumePausedMutations(), this.#e.onFocus());
          })),
          (this.#s = b.subscribe(async (e) => {
            e && (await this.resumePausedMutations(), this.#e.onOnline());
          }))));
    }
    unmount() {
      (this.#a--,
        this.#a === 0 && (this.#o?.(), (this.#o = void 0), this.#s?.(), (this.#s = void 0)));
    }
    isFetching(e) {
      return this.#e.findAll({ ...e, fetchStatus: `fetching` }).length;
    }
    isMutating(e) {
      return this.#t.findAll({ ...e, status: `pending` }).length;
    }
    getQueryData(e) {
      let t = this.defaultQueryOptions({ queryKey: e });
      return this.#e.get(t.queryHash)?.state.data;
    }
    ensureQueryData(e) {
      let t = this.defaultQueryOptions(e),
        n = this.#e.build(this, t),
        r = n.state.data;
      return r === void 0
        ? this.fetchQuery(e)
        : (e.revalidateIfStale && n.isStaleByTime(S(t.staleTime, n)) && this.prefetchQuery(t),
          Promise.resolve(r));
    }
    getQueriesData(e) {
      return this.#e.findAll(e).map(({ queryKey: e, state: t }) => [e, t.data]);
    }
    setQueryData(e, t, n) {
      let r = this.defaultQueryOptions({ queryKey: e }),
        i = this.#e.get(r.queryHash)?.state.data,
        a = h(t, i);
      if (a !== void 0) return this.#e.build(this, r).setData(a, { ...n, manual: !0 });
    }
    setQueriesData(e, t, n) {
      return l.batch(() =>
        this.#e.findAll(e).map(({ queryKey: e }) => [e, this.setQueryData(e, t, n)]),
      );
    }
    getQueryState(e) {
      let t = this.defaultQueryOptions({ queryKey: e });
      return this.#e.get(t.queryHash)?.state;
    }
    removeQueries(e) {
      let t = this.#e;
      l.batch(() => {
        t.findAll(e).forEach((e) => {
          t.remove(e);
        });
      });
    }
    resetQueries(e, t) {
      let n = this.#e;
      return l.batch(
        () => (
          n.findAll(e).forEach((e) => {
            e.reset();
          }),
          this.refetchQueries({ type: `active`, ...e }, t)
        ),
      );
    }
    cancelQueries(e, t = {}) {
      let n = { revert: !0, ...t },
        r = l.batch(() => this.#e.findAll(e).map((e) => e.cancel(n)));
      return Promise.all(r).then(s).catch(s);
    }
    invalidateQueries(e, t = {}) {
      return l.batch(
        () => (
          this.#e.findAll(e).forEach((e) => {
            e.invalidate();
          }),
          e?.refetchType === `none`
            ? Promise.resolve()
            : this.refetchQueries({ ...e, type: e?.refetchType ?? e?.type ?? `active` }, t)
        ),
      );
    }
    refetchQueries(e, t = {}) {
      let n = { ...t, cancelRefetch: t.cancelRefetch ?? !0 },
        r = l.batch(() =>
          this.#e
            .findAll(e)
            .filter((e) => !e.isDisabled() && !e.isStatic())
            .map((e) => {
              let t = e.fetch(void 0, n);
              return (
                n.throwOnError || (t = t.catch(s)),
                e.state.fetchStatus === `paused` ? Promise.resolve() : t
              );
            }),
        );
      return Promise.all(r).then(s);
    }
    fetchQuery(e) {
      let t = this.defaultQueryOptions(e);
      t.retry === void 0 && (t.retry = !1);
      let n = this.#e.build(this, t);
      return n.isStaleByTime(S(t.staleTime, n)) ? n.fetch(t) : Promise.resolve(n.state.data);
    }
    prefetchQuery(e) {
      return this.fetchQuery(e).then(s).catch(s);
    }
    fetchInfiniteQuery(e) {
      return ((e._type = `infinite`), this.fetchQuery(e));
    }
    prefetchInfiniteQuery(e) {
      return this.fetchInfiniteQuery(e).then(s).catch(s);
    }
    ensureInfiniteQueryData(e) {
      return ((e._type = `infinite`), this.ensureQueryData(e));
    }
    resumePausedMutations() {
      return b.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
    }
    getQueryCache() {
      return this.#e;
    }
    getMutationCache() {
      return this.#t;
    }
    getDefaultOptions() {
      return this.#n;
    }
    setDefaultOptions(e) {
      this.#n = e;
    }
    setQueryDefaults(e, t) {
      this.#r.set(d(e), { queryKey: e, defaultOptions: t });
    }
    getQueryDefaults(e) {
      let t = [...this.#r.values()],
        n = {};
      return (
        t.forEach((t) => {
          C(e, t.queryKey) && Object.assign(n, t.defaultOptions);
        }),
        n
      );
    }
    setMutationDefaults(e, t) {
      this.#i.set(d(e), { mutationKey: e, defaultOptions: t });
    }
    getMutationDefaults(e) {
      let t = [...this.#i.values()],
        n = {};
      return (
        t.forEach((t) => {
          C(e, t.mutationKey) && Object.assign(n, t.defaultOptions);
        }),
        n
      );
    }
    defaultQueryOptions(e) {
      if (e._defaulted) return e;
      let t = { ...this.#n.queries, ...this.getQueryDefaults(e.queryKey), ...e, _defaulted: !0 };
      return (
        (t.queryHash ||= u(t.queryKey, t)),
        t.refetchOnReconnect === void 0 && (t.refetchOnReconnect = t.networkMode !== `always`),
        t.throwOnError === void 0 && (t.throwOnError = !!t.suspense),
        !t.networkMode && t.persister && (t.networkMode = `offlineFirst`),
        t.queryFn === r && (t.enabled = !1),
        t
      );
    }
    defaultMutationOptions(e) {
      return e?._defaulted
        ? e
        : {
            ...this.#n.mutations,
            ...(e?.mutationKey && this.getMutationDefaults(e.mutationKey)),
            ...e,
            _defaulted: !0,
          };
    }
    clear() {
      (this.#e.clear(), this.#t.clear());
    }
  },
  Sl = `/assets/styles-X2p0PfRW.css`;
function Cl(e, t = {}) {
  typeof window > `u` ||
    window.__lovableEvents?.captureException?.(
      e,
      { source: `react_error_boundary`, route: window.location.pathname, ...t },
      { mechanism: `react_error_boundary`, handled: !1, severity: `error` },
    );
}
var wl = v(`chart-column`, [
    [`path`, { d: `M3 3v16a2 2 0 0 0 2 2h16`, key: `c24i48` }],
    [`path`, { d: `M18 17V9`, key: `2bz60n` }],
    [`path`, { d: `M13 17V5`, key: `1frdt8` }],
    [`path`, { d: `M8 17v-3`, key: `17ska0` }],
  ]),
  Tl = v(`download`, [
    [`path`, { d: `M12 15V3`, key: `m9g1x1` }],
    [`path`, { d: `M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`, key: `ih7n3h` }],
    [`path`, { d: `m7 10 5 5 5-5`, key: `brsn70` }],
  ]),
  El = v(`history`, [
    [`path`, { d: `M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`, key: `1357e3` }],
    [`path`, { d: `M3 3v5h5`, key: `1xhq8a` }],
    [`path`, { d: `M12 7v5l4 2`, key: `1fdv2h` }],
  ]),
  Dl = v(`layout-dashboard`, [
    [`rect`, { width: `7`, height: `9`, x: `3`, y: `3`, rx: `1`, key: `10lvy0` }],
    [`rect`, { width: `7`, height: `5`, x: `14`, y: `3`, rx: `1`, key: `16une8` }],
    [`rect`, { width: `7`, height: `9`, x: `14`, y: `12`, rx: `1`, key: `1hutg5` }],
    [`rect`, { width: `7`, height: `5`, x: `3`, y: `16`, rx: `1`, key: `ldoo1y` }],
  ]),
  Ol = v(`package`, [
    [
      `path`,
      {
        d: `M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z`,
        key: `1a0edw`,
      },
    ],
    [`path`, { d: `M12 22V12`, key: `d0xqtd` }],
    [`polyline`, { points: `3.29 7 12 12 20.71 7`, key: `ousv84` }],
    [`path`, { d: `m7.5 4.27 9 5.15`, key: `1c824w` }],
  ]),
  kl = v(`shopping-cart`, [
    [`circle`, { cx: `8`, cy: `21`, r: `1`, key: `jimo8o` }],
    [`circle`, { cx: `19`, cy: `21`, r: `1`, key: `13723u` }],
    [
      `path`,
      {
        d: `M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12`,
        key: `9zh506`,
      },
    ],
  ]),
  Al = v(`x`, [
    [`path`, { d: `M18 6 6 18`, key: `1bl5f8` }],
    [`path`, { d: `m6 6 12 12`, key: `d8bk6v` }],
  ]),
  jl = [
    { to: `/pos`, label: `Caisse`, icon: kl },
    { to: `/dashboard`, label: `Bord`, icon: Dl },
    { to: `/stocks`, label: `Stocks`, icon: Ol },
    { to: `/history`, label: `Historique`, icon: El },
    { to: `/reports`, label: `Rapports`, icon: wl },
  ];
function Ml() {
  return (0, H.jsx)(`header`, {
    className: `border-b bg-card sticky top-0 z-20`,
    children: (0, H.jsxs)(`div`, {
      className: `mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3`,
      children: [
        (0, H.jsxs)(jc, {
          to: `/pos`,
          className: `flex items-center gap-2 font-bold text-lg`,
          children: [
            (0, H.jsx)(`span`, {
              className: `rounded-md bg-primary px-2 py-1 text-primary-foreground`,
              children: `POS`,
            }),
            (0, H.jsx)(`span`, {
              className: `hidden sm:inline text-foreground`,
              children: `Caisse`,
            }),
          ],
        }),
        (0, H.jsx)(`nav`, {
          className: `flex items-center gap-1`,
          children: jl.map((e) => {
            let t = e.icon;
            return (0, H.jsxs)(
              jc,
              {
                to: e.to,
                className: `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors`,
                activeProps: {
                  className: `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground`,
                },
                children: [
                  (0, H.jsx)(t, { className: `h-4 w-4` }),
                  (0, H.jsx)(`span`, { className: `hidden sm:inline`, children: e.label }),
                ],
              },
              e.to,
            );
          }),
        }),
      ],
    }),
  });
}
function Nl() {
  return typeof window > `u`
    ? !1
    : navigator.standalone
      ? !0
      : window.matchMedia(`(display-mode: standalone)`).matches;
}
function Pl() {
  return typeof window > `u` ? !1 : /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function Fl() {
  typeof window > `u` ||
    (`serviceWorker` in navigator &&
      window.addEventListener(`load`, () => {
        navigator.serviceWorker.register(`/sw.js`).catch((e) => {
          console.error(`Service worker registration failed`, e);
        });
      }));
}
async function Il() {
  if (typeof navigator > `u` || !navigator.storage?.persist) return !1;
  try {
    let e = await navigator.storage.persist();
    if (!e) {
      let e = await navigator.storage.estimate().catch(() => null);
      e && console.info(`IndexedDB storage usage`, e);
    }
    return e;
  } catch (e) {
    return (console.error(`Storage persistence request failed`, e), !1);
  }
}
function Ll(e, t) {
  if (typeof e == `function`) return e(t);
  e != null && (e.current = t);
}
function Rl(...e) {
  return (t) => {
    let n = !1,
      r = e.map((e) => {
        let r = Ll(e, t);
        return (!n && typeof r == `function` && (n = !0), r);
      });
    if (n)
      return () => {
        for (let t = 0; t < r.length; t++) {
          let n = r[t];
          typeof n == `function` ? n() : Ll(e[t], null);
        }
      };
  };
}
function zl(...e) {
  return V.useCallback(Rl(...e), e);
}
function K(e) {
  let t = V.forwardRef((t, n) => {
    let { children: r, ...i } = t,
      a = null,
      o = !1,
      s = [];
    (Ul(r) && typeof ql == `function` && (r = ql(r._payload)),
      V.Children.forEach(r, (e) => {
        if (Vl(e)) {
          o = !0;
          let t = e,
            n = `child` in t.props ? t.props.child : t.props.children;
          (Ul(n) && typeof ql == `function` && (n = ql(n._payload)),
            (a = Y(t, n)),
            s.push(a?.props?.children));
        } else s.push(e);
      }),
      a
        ? (a = V.cloneElement(a, void 0, s))
        : !o && V.Children.count(r) === 1 && V.isValidElement(r) && (a = r));
    let c = a ? Bl(a) : void 0,
      l = zl(n, c);
    if (!a) {
      if (r || r === 0) throw Error(o ? Kl(e) : Gl(e));
      return r;
    }
    let u = X(i, a.props ?? {});
    return (a.type !== V.Fragment && (u.ref = n ? l : c), V.cloneElement(a, u));
  });
  return ((t.displayName = `${e}.Slot`), t);
}
var q = K(`Slot`),
  J = Symbol.for(`radix.slottable`),
  Y = (e, t) => {
    if (`child` in e.props) {
      let t = e.props.child;
      return V.isValidElement(t)
        ? V.cloneElement(t, void 0, e.props.children(t.props.children))
        : null;
    }
    return V.isValidElement(t) ? t : null;
  };
function X(e, t) {
  let n = { ...t };
  for (let r in t) {
    let i = e[r],
      a = t[r];
    /^on[A-Z]/.test(r)
      ? i && a
        ? (n[r] = (...e) => {
            let t = a(...e);
            return (i(...e), t);
          })
        : i && (n[r] = i)
      : r === `style`
        ? (n[r] = { ...i, ...a })
        : r === `className` && (n[r] = [i, a].filter(Boolean).join(` `));
  }
  return { ...e, ...n };
}
function Bl(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
    n = t && `isReactWarning` in t && t.isReactWarning;
  return n
    ? e.ref
    : ((t = Object.getOwnPropertyDescriptor(e, `ref`)?.get),
      (n = t && `isReactWarning` in t && t.isReactWarning),
      n ? e.props.ref : e.props.ref || e.ref);
}
function Vl(e) {
  return (
    V.isValidElement(e) &&
    typeof e.type == `function` &&
    `__radixId` in e.type &&
    e.type.__radixId === J
  );
}
var Hl = Symbol.for(`react.lazy`);
function Ul(e) {
  return (
    typeof e == `object` &&
    !!e &&
    `$$typeof` in e &&
    e.$$typeof === Hl &&
    `_payload` in e &&
    Wl(e._payload)
  );
}
function Wl(e) {
  return typeof e == `object` && !!e && `then` in e;
}
var Gl = (e) =>
    `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`,
  Kl = (e) =>
    `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`,
  ql = V.use,
  Jl = (e) => (typeof e == `boolean` ? `${e}` : e === 0 ? `0` : e),
  Yl = g,
  Xl = (e, t) => (n) => {
    if (t?.variants == null) return Yl(e, n?.class, n?.className);
    let { variants: r, defaultVariants: i } = t,
      a = Object.keys(r).map((e) => {
        let t = n?.[e],
          a = i?.[e];
        if (t === null) return null;
        let o = Jl(t) || Jl(a);
        return r[e][o];
      }),
      o =
        n &&
        Object.entries(n).reduce((e, t) => {
          let [n, r] = t;
          return (r === void 0 || (e[n] = r), e);
        }, {});
    return Yl(
      e,
      a,
      t?.compoundVariants?.reduce((e, t) => {
        let { class: n, className: r, ...a } = t;
        return Object.entries(a).every((e) => {
          let [t, n] = e;
          return Array.isArray(n) ? n.includes({ ...i, ...o }[t]) : { ...i, ...o }[t] === n;
        })
          ? [...e, n, r]
          : e;
      }, []),
      n?.class,
      n?.className,
    );
  },
  Zl = Xl(
    `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
    {
      variants: {
        variant: {
          default: `bg-primary text-primary-foreground shadow hover:bg-primary/90`,
          destructive: `bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90`,
          outline: `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`,
          secondary: `bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80`,
          ghost: `hover:bg-accent hover:text-accent-foreground`,
          link: `text-primary underline-offset-4 hover:underline`,
        },
        size: {
          default: `h-9 px-4 py-2`,
          sm: `h-8 rounded-md px-3 text-xs`,
          lg: `h-10 rounded-md px-8`,
          icon: `h-9 w-9`,
        },
      },
      defaultVariants: { variant: `default`, size: `default` },
    },
  ),
  Ql = V.forwardRef(({ className: e, variant: t, size: n, asChild: r = !1, ...i }, a) =>
    (0, H.jsx)(r ? q : `button`, {
      className: y(Zl({ variant: t, size: n, className: e })),
      ref: a,
      ...i,
    }),
  );
((Ql.displayName = `Button`),
  typeof window < `u` && window.document && window.document.createElement);
function $l(e, t, { checkForDefaultPrevented: n = !0 } = {}) {
  return function (r) {
    if ((e?.(r), n === !1 || !r || !r.defaultPrevented)) return t?.(r);
  };
}
function eu(e, t = []) {
  let n = [];
  function r(t, r) {
    let i = V.createContext(r);
    i.displayName = t + `Context`;
    let a = n.length;
    n = [...n, r];
    let o = (t) => {
      let { scope: n, children: r, ...o } = t,
        s = n?.[e]?.[a] || i,
        c = V.useMemo(() => o, Object.values(o));
      return (0, H.jsx)(s.Provider, { value: c, children: r });
    };
    o.displayName = t + `Provider`;
    function s(n, o, s = {}) {
      let { optional: c = !1 } = s,
        l = o?.[e]?.[a] || i,
        u = V.useContext(l);
      if (u) return u;
      if (r !== void 0) return r;
      if (!c) throw Error(`\`${n}\` must be used within \`${t}\``);
    }
    return [o, s];
  }
  let i = () => {
    let t = n.map((e) => V.createContext(e));
    return function (n) {
      let r = n?.[e] || t;
      return V.useMemo(() => ({ [`__scope${e}`]: { ...n, [e]: r } }), [n, r]);
    };
  };
  return ((i.scopeName = e), [r, tu(i, ...t)]);
}
function tu(...e) {
  let t = e[0];
  if (e.length === 1) return t;
  let n = () => {
    let n = e.map((e) => ({ useScope: e(), scopeName: e.scopeName }));
    return function (e) {
      let r = n.reduce((t, { useScope: n, scopeName: r }) => {
        let i = n(e)[`__scope${r}`];
        return { ...t, ...i };
      }, {});
      return V.useMemo(() => ({ [`__scope${t.scopeName}`]: r }), [r]);
    };
  };
  return ((n.scopeName = t.scopeName), n);
}
var nu = globalThis?.document ? V.useLayoutEffect : () => {},
  ru = V.useId || (() => void 0),
  iu = 0;
function au(e) {
  let [t, n] = V.useState(ru());
  return (
    nu(() => {
      e || n((e) => e ?? String(iu++));
    }, [e]),
    e || (t ? `radix-${t}` : ``)
  );
}
var ou = V.useInsertionEffect || nu;
function su({ prop: e, defaultProp: t, onChange: n = () => {}, caller: r }) {
  let [i, a, o] = cu({ defaultProp: t, onChange: n }),
    s = e !== void 0,
    c = s ? e : i;
  {
    let t = V.useRef(e !== void 0);
    V.useEffect(() => {
      let e = t.current;
      (e !== s &&
        console.warn(
          `${r} is changing from ${e ? `controlled` : `uncontrolled`} to ${s ? `controlled` : `uncontrolled`}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`,
        ),
        (t.current = s));
    }, [s, r]);
  }
  return [
    c,
    V.useCallback(
      (t) => {
        if (s) {
          let n = lu(t) ? t(e) : t;
          n !== e && o.current?.(n);
        } else a(t);
      },
      [s, e, a, o],
    ),
  ];
}
function cu({ defaultProp: e, onChange: t }) {
  let [n, r] = V.useState(e),
    i = V.useRef(n),
    a = V.useRef(t);
  return (
    ou(() => {
      a.current = t;
    }, [t]),
    V.useEffect(() => {
      i.current !== n && (a.current?.(n), (i.current = n));
    }, [n, i]),
    [n, r, a]
  );
}
function lu(e) {
  return typeof e == `function`;
}
var uu = [
  `a`,
  `button`,
  `div`,
  `form`,
  `h2`,
  `h3`,
  `img`,
  `input`,
  `label`,
  `li`,
  `nav`,
  `ol`,
  `p`,
  `select`,
  `span`,
  `svg`,
  `ul`,
].reduce((e, t) => {
  let n = K(`Primitive.${t}`),
    r = V.forwardRef((e, r) => {
      let { asChild: i, ...a } = e,
        o = i ? n : t;
      return (
        typeof window < `u` && (window[Symbol.for(`radix-ui`)] = !0),
        (0, H.jsx)(o, { ...a, ref: r })
      );
    });
  return ((r.displayName = `Primitive.${t}`), { ...e, [t]: r });
}, {});
function du(e, t) {
  e && yc.flushSync(() => e.dispatchEvent(t));
}
function fu(e) {
  let t = V.useRef(e);
  return (
    V.useEffect(() => {
      t.current = e;
    }),
    V.useMemo(
      () =>
        (...e) =>
          t.current?.(...e),
      [],
    )
  );
}
var pu = `DismissableLayer`,
  mu = `dismissableLayer.update`,
  hu = `dismissableLayer.pointerDownOutside`,
  gu = `dismissableLayer.focusOutside`,
  _u,
  vu = V.createContext({
    layers: new Set(),
    layersWithOutsidePointerEventsDisabled: new Set(),
    branches: new Set(),
    dismissableSurfaces: new Set(),
  }),
  yu = V.forwardRef((e, t) => {
    let {
        disableOutsidePointerEvents: n = !1,
        deferPointerDownOutside: r = !1,
        onEscapeKeyDown: i,
        onPointerDownOutside: a,
        onFocusOutside: o,
        onInteractOutside: s,
        onDismiss: c,
        ...l
      } = e,
      u = V.useContext(vu),
      [d, f] = V.useState(null),
      p = d?.ownerDocument ?? globalThis?.document,
      [, m] = V.useState({}),
      h = zl(t, f),
      g = Array.from(u.layers),
      [_] = [...u.layersWithOutsidePointerEventsDisabled].slice(-1),
      v = _ ? g.indexOf(_) : -1,
      y = d ? g.indexOf(d) : -1,
      b = u.layersWithOutsidePointerEventsDisabled.size > 0,
      x = y >= v,
      S = V.useRef(!1),
      C = wu(
        (e) => {
          (a?.(e), s?.(e), e.defaultPrevented || c?.());
        },
        {
          ownerDocument: p,
          deferPointerDownOutside: r,
          isDeferredPointerDownOutsideRef: S,
          dismissableSurfaces: u.dismissableSurfaces,
          shouldHandlePointerDownOutside: V.useCallback(
            (e) => {
              if (!(e instanceof Node)) return !1;
              let t = [...u.branches].some((t) => t.contains(e));
              return x && !t;
            },
            [u.branches, x],
          ),
        },
      ),
      ee = Tu((e) => {
        if (r && S.current) return;
        let t = e.target;
        [...u.branches].some((e) => e.contains(t)) || (o?.(e), s?.(e), e.defaultPrevented || c?.());
      }, p),
      te = d ? y === g.length - 1 : !1,
      ne = fu((e) => {
        e.key === `Escape` && (i?.(e), !e.defaultPrevented && c && (e.preventDefault(), c()));
      });
    return (
      V.useEffect(() => {
        if (te)
          return (
            p.addEventListener(`keydown`, ne, { capture: !0 }),
            () => p.removeEventListener(`keydown`, ne, { capture: !0 })
          );
      }, [p, te, ne]),
      V.useEffect(() => {
        if (d)
          return (
            n &&
              (u.layersWithOutsidePointerEventsDisabled.size === 0 &&
                ((_u = p.body.style.pointerEvents), (p.body.style.pointerEvents = `none`)),
              u.layersWithOutsidePointerEventsDisabled.add(d)),
            u.layers.add(d),
            Eu(),
            () => {
              n &&
                (u.layersWithOutsidePointerEventsDisabled.delete(d),
                u.layersWithOutsidePointerEventsDisabled.size === 0 &&
                  (p.body.style.pointerEvents = _u));
            }
          );
      }, [d, p, n, u]),
      V.useEffect(
        () => () => {
          d && (u.layers.delete(d), u.layersWithOutsidePointerEventsDisabled.delete(d), Eu());
        },
        [d, u],
      ),
      V.useEffect(() => {
        let e = () => m({});
        return (document.addEventListener(mu, e), () => document.removeEventListener(mu, e));
      }, []),
      (0, H.jsx)(uu.div, {
        ...l,
        ref: h,
        style: { pointerEvents: b ? (x ? `auto` : `none`) : void 0, ...e.style },
        onFocusCapture: $l(e.onFocusCapture, ee.onFocusCapture),
        onBlurCapture: $l(e.onBlurCapture, ee.onBlurCapture),
        onPointerDownCapture: $l(e.onPointerDownCapture, C.onPointerDownCapture),
      })
    );
  });
yu.displayName = pu;
var bu = `DismissableLayerBranch`,
  xu = V.forwardRef((e, t) => {
    let n = V.useContext(vu),
      r = V.useRef(null),
      i = zl(t, r);
    return (
      V.useEffect(() => {
        let e = r.current;
        if (e)
          return (
            n.branches.add(e),
            () => {
              n.branches.delete(e);
            }
          );
      }, [n.branches]),
      (0, H.jsx)(uu.div, { ...e, ref: i })
    );
  });
xu.displayName = bu;
function Su() {
  let e = V.useContext(vu),
    [t, n] = V.useState(null);
  return (
    V.useEffect(() => {
      if (t)
        return (
          e.dismissableSurfaces.add(t),
          () => {
            e.dismissableSurfaces.delete(t);
          }
        );
    }, [t, e.dismissableSurfaces]),
    n
  );
}
var Cu = () => !0;
function wu(e, t) {
  let {
      ownerDocument: n = globalThis?.document,
      deferPointerDownOutside: r = !1,
      isDeferredPointerDownOutsideRef: i,
      dismissableSurfaces: a,
      shouldHandlePointerDownOutside: o = Cu,
    } = t,
    s = fu(e),
    c = V.useRef(!1),
    l = V.useRef(!1),
    u = V.useRef(new Map()),
    d = V.useRef(() => {});
  return (
    V.useEffect(() => {
      function e() {
        ((l.current = !1), (i.current = !1), u.current.clear());
      }
      function t() {
        return Array.from(u.current.values()).some(Boolean);
      }
      function f(e) {
        if (!l.current) return;
        let t = e.target;
        ((t instanceof Node && [...a].some((e) => e.contains(t))) || u.current.set(e.type, !0),
          e.type === `click` &&
            window.setTimeout(() => {
              l.current && d.current();
            }, 0));
      }
      function p(e) {
        l.current && u.current.set(e.type, !1);
      }
      let m = (a) => {
          if (a.target && !c.current) {
            let f = function () {
              n.removeEventListener(`click`, d.current);
              let r = t();
              (e(), r || Du(hu, s, p, { discrete: !0 }));
            };
            if (!o(a.target)) {
              (n.removeEventListener(`click`, d.current), e(), (c.current = !1));
              return;
            }
            let p = { originalEvent: a };
            ((l.current = !0),
              (i.current = r && a.button === 0),
              u.current.clear(),
              !r || a.button !== 0
                ? f()
                : (n.removeEventListener(`click`, d.current),
                  (d.current = f),
                  n.addEventListener(`click`, d.current, { once: !0 })));
          } else (n.removeEventListener(`click`, d.current), e());
          c.current = !1;
        },
        h = [`pointerup`, `mousedown`, `mouseup`, `touchstart`, `touchend`, `click`];
      for (let e of h) (n.addEventListener(e, f, !0), n.addEventListener(e, p));
      let g = window.setTimeout(() => {
        n.addEventListener(`pointerdown`, m);
      }, 0);
      return () => {
        (window.clearTimeout(g),
          n.removeEventListener(`pointerdown`, m),
          n.removeEventListener(`click`, d.current));
        for (let e of h) (n.removeEventListener(e, f, !0), n.removeEventListener(e, p));
      };
    }, [n, s, r, i, a, o]),
    { onPointerDownCapture: () => (c.current = !0) }
  );
}
function Tu(e, t = globalThis?.document) {
  let n = fu(e),
    r = V.useRef(!1);
  return (
    V.useEffect(() => {
      let e = (e) => {
        e.target && !r.current && Du(gu, n, { originalEvent: e }, { discrete: !1 });
      };
      return (t.addEventListener(`focusin`, e), () => t.removeEventListener(`focusin`, e));
    }, [t, n]),
    { onFocusCapture: () => (r.current = !0), onBlurCapture: () => (r.current = !1) }
  );
}
function Eu() {
  let e = new CustomEvent(mu);
  document.dispatchEvent(e);
}
function Du(e, t, n, { discrete: r }) {
  let i = n.originalEvent.target,
    a = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: n });
  (t && i.addEventListener(e, t, { once: !0 }), r ? du(i, a) : i.dispatchEvent(a));
}
var Ou = `focusScope.autoFocusOnMount`,
  ku = `focusScope.autoFocusOnUnmount`,
  Au = { bubbles: !1, cancelable: !0 },
  ju = `FocusScope`,
  Mu = V.forwardRef((e, t) => {
    let { loop: n = !1, trapped: r = !1, onMountAutoFocus: i, onUnmountAutoFocus: a, ...o } = e,
      [s, c] = V.useState(null),
      l = fu(i),
      u = fu(a),
      d = V.useRef(null),
      f = zl(t, c),
      p = V.useRef({
        paused: !1,
        pause() {
          this.paused = !0;
        },
        resume() {
          this.paused = !1;
        },
      }).current;
    (V.useEffect(() => {
      if (r) {
        let e = function (e) {
            if (p.paused || !s) return;
            let t = e.target;
            s.contains(t) ? (d.current = t) : zu(d.current, { select: !0 });
          },
          t = function (e) {
            if (p.paused || !s) return;
            let t = e.relatedTarget;
            t !== null && (s.contains(t) || zu(d.current, { select: !0 }));
          },
          n = function (e) {
            if (document.activeElement === document.body)
              for (let t of e) t.removedNodes.length > 0 && zu(s);
          };
        (document.addEventListener(`focusin`, e), document.addEventListener(`focusout`, t));
        let r = new MutationObserver(n);
        return (
          s && r.observe(s, { childList: !0, subtree: !0 }),
          () => {
            (document.removeEventListener(`focusin`, e),
              document.removeEventListener(`focusout`, t),
              r.disconnect());
          }
        );
      }
    }, [r, s, p.paused]),
      V.useEffect(() => {
        if (s) {
          Bu.add(p);
          let e = document.activeElement;
          if (!s.contains(e)) {
            let t = new CustomEvent(Ou, Au);
            (s.addEventListener(Ou, l),
              s.dispatchEvent(t),
              t.defaultPrevented ||
                (Nu(Uu(Fu(s)), { select: !0 }), document.activeElement === e && zu(s)));
          }
          return () => {
            (s.removeEventListener(Ou, l),
              setTimeout(() => {
                let t = new CustomEvent(ku, Au);
                (s.addEventListener(ku, u),
                  s.dispatchEvent(t),
                  t.defaultPrevented || zu(e ?? document.body, { select: !0 }),
                  s.removeEventListener(ku, u),
                  Bu.remove(p));
              }, 0));
          };
        }
      }, [s, l, u, p]));
    let m = V.useCallback(
      (e) => {
        if ((!n && !r) || p.paused) return;
        let t = e.key === `Tab` && !e.altKey && !e.ctrlKey && !e.metaKey,
          i = document.activeElement;
        if (t && i) {
          let t = e.currentTarget,
            [r, a] = Pu(t);
          r && a
            ? !e.shiftKey && i === a
              ? (e.preventDefault(), n && zu(r, { select: !0 }))
              : e.shiftKey && i === r && (e.preventDefault(), n && zu(a, { select: !0 }))
            : i === t && e.preventDefault();
        }
      },
      [n, r, p.paused],
    );
    return (0, H.jsx)(uu.div, { tabIndex: -1, ...o, ref: f, onKeyDown: m });
  });
Mu.displayName = ju;
function Nu(e, { select: t = !1 } = {}) {
  let n = document.activeElement;
  for (let r of e) if ((zu(r, { select: t }), document.activeElement !== n)) return;
}
function Pu(e) {
  let t = Fu(e);
  return [Iu(t, e), Iu(t.reverse(), e)];
}
function Fu(e) {
  let t = [],
    n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (e) => {
        let t = e.tagName === `INPUT` && e.type === `hidden`;
        return e.disabled || e.hidden || t
          ? NodeFilter.FILTER_SKIP
          : e.tabIndex >= 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
      },
    });
  for (; n.nextNode();) t.push(n.currentNode);
  return t;
}
function Iu(e, t) {
  let n = typeof t.checkVisibility == `function` && t.checkVisibility({ checkVisibilityCSS: !0 });
  for (let r of e)
    if (!(n ? !r.checkVisibility({ checkVisibilityCSS: !0 }) : Lu(r, { upTo: t }))) return r;
}
function Lu(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === `hidden`) return !0;
  for (; e;) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === `none`) return !0;
    e = e.parentElement;
  }
  return !1;
}
function Ru(e) {
  return e instanceof HTMLInputElement && `select` in e;
}
function zu(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    let n = document.activeElement;
    (e.focus({ preventScroll: !0 }), e !== n && Ru(e) && t && e.select());
  }
}
var Bu = Vu();
function Vu() {
  let e = [];
  return {
    add(t) {
      let n = e[0];
      (t !== n && n?.pause(), (e = Hu(e, t)), e.unshift(t));
    },
    remove(t) {
      ((e = Hu(e, t)), e[0]?.resume());
    },
  };
}
function Hu(e, t) {
  let n = [...e],
    r = n.indexOf(t);
  return (r !== -1 && n.splice(r, 1), n);
}
function Uu(e) {
  return e.filter((e) => e.tagName !== `A`);
}
var Wu = `Portal`,
  Gu = V.forwardRef((e, t) => {
    let { container: n, ...r } = e,
      [i, a] = V.useState(!1);
    nu(() => a(!0), []);
    let o = n || (i && globalThis?.document?.body);
    return o ? yc.createPortal((0, H.jsx)(uu.div, { ...r, ref: t }), o) : null;
  });
Gu.displayName = Wu;
function Z(e, t) {
  return V.useReducer((e, n) => t[e][n] ?? e, e);
}
var Ku = (e) => {
  let { present: t, children: n } = e,
    r = qu(t),
    i = typeof n == `function` ? n({ present: r.isPresent }) : V.Children.only(n),
    a = Yu(r.ref, Zu(i));
  return typeof n == `function` || r.isPresent ? V.cloneElement(i, { ref: a }) : null;
};
Ku.displayName = `Presence`;
function qu(e) {
  let [t, n] = V.useState(),
    r = V.useRef(null),
    i = V.useRef(e),
    a = V.useRef(`none`),
    o = V.useRef(void 0),
    [s, c] = Z(e ? `mounted` : `unmounted`, {
      mounted: { UNMOUNT: `unmounted`, ANIMATION_OUT: `unmountSuspended` },
      unmountSuspended: { MOUNT: `mounted`, ANIMATION_END: `unmounted` },
      unmounted: { MOUNT: `mounted` },
    });
  return (
    V.useEffect(() => {
      s === `mounted`
        ? ((a.current = o.current ?? Xu(r.current)), (o.current = void 0))
        : (a.current = `none`);
    }, [s]),
    nu(() => {
      let t = r.current,
        n = i.current;
      if (n !== e) {
        let r = a.current,
          s = Xu(t);
        (e
          ? ((o.current = s), c(`MOUNT`))
          : s === `none` || t?.display === `none`
            ? c(`UNMOUNT`)
            : c(n && r !== s ? `ANIMATION_OUT` : `UNMOUNT`),
          (i.current = e));
      }
    }, [e, c]),
    nu(() => {
      if (t) {
        let e,
          n = t.ownerDocument.defaultView ?? window,
          o = (a) => {
            let o = Xu(r.current).includes(CSS.escape(a.animationName));
            if (a.target === t && o && (c(`ANIMATION_END`), !i.current)) {
              let r = t.style.animationFillMode;
              ((t.style.animationFillMode = `forwards`),
                (e = n.setTimeout(() => {
                  t.style.animationFillMode === `forwards` && (t.style.animationFillMode = r);
                })));
            }
          },
          s = (e) => {
            e.target === t && (a.current = Xu(r.current));
          };
        return (
          t.addEventListener(`animationstart`, s),
          t.addEventListener(`animationcancel`, o),
          t.addEventListener(`animationend`, o),
          () => {
            (n.clearTimeout(e),
              t.removeEventListener(`animationstart`, s),
              t.removeEventListener(`animationcancel`, o),
              t.removeEventListener(`animationend`, o));
          }
        );
      } else c(`ANIMATION_END`);
    }, [t, c]),
    {
      isPresent: [`mounted`, `unmountSuspended`].includes(s),
      ref: V.useCallback((e) => {
        if (e) {
          let t = getComputedStyle(e);
          ((r.current = t), (o.current = Xu(t)));
        } else r.current = null;
        n(e);
      }, []),
    }
  );
}
function Ju(e, t) {
  if (typeof e == `function`) return e(t);
  e != null && (e.current = t);
}
function Yu(...e) {
  let t = V.useRef(e);
  return (
    (t.current = e),
    V.useCallback((e) => {
      let n = t.current,
        r = !1,
        i = n.map((t) => {
          let n = Ju(t, e);
          return (!r && typeof n == `function` && (r = !0), n);
        });
      if (r)
        return () => {
          for (let e = 0; e < i.length; e++) {
            let t = i[e];
            typeof t == `function` ? t() : Ju(n[e], null);
          }
        };
    }, [])
  );
}
function Xu(e) {
  return e?.animationName || `none`;
}
function Zu(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, `ref`)?.get,
    n = t && `isReactWarning` in t && t.isReactWarning;
  return n
    ? e.ref
    : ((t = Object.getOwnPropertyDescriptor(e, `ref`)?.get),
      (n = t && `isReactWarning` in t && t.isReactWarning),
      n ? e.props.ref : e.props.ref || e.ref);
}
var Qu = 0,
  $u = null;
function ed() {
  V.useEffect(() => {
    $u ||= { start: td(), end: td() };
    let { start: e, end: t } = $u;
    return (
      document.body.firstElementChild !== e && document.body.insertAdjacentElement(`afterbegin`, e),
      document.body.lastElementChild !== t && document.body.insertAdjacentElement(`beforeend`, t),
      Qu++,
      () => {
        (Qu === 1 && ($u?.start.remove(), $u?.end.remove(), ($u = null)),
          (Qu = Math.max(0, Qu - 1)));
      }
    );
  }, []);
}
function td() {
  let e = document.createElement(`span`);
  return (
    e.setAttribute(`data-radix-focus-guard`, ``),
    (e.tabIndex = 0),
    (e.style.outline = `none`),
    (e.style.opacity = `0`),
    (e.style.position = `fixed`),
    (e.style.pointerEvents = `none`),
    e
  );
}
var nd = function () {
  return (
    (nd =
      Object.assign ||
      function (e) {
        for (var t, n = 1, r = arguments.length; n < r; n++)
          for (var i in ((t = arguments[n]), t))
            Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
        return e;
      }),
    nd.apply(this, arguments)
  );
};
function rd(e, t) {
  var n = {};
  for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == `function`)
    for (var i = 0, r = Object.getOwnPropertySymbols(e); i < r.length; i++)
      t.indexOf(r[i]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(e, r[i]) &&
        (n[r[i]] = e[r[i]]);
  return n;
}
function id(e, t, n) {
  if (n || arguments.length === 2)
    for (var r = 0, i = t.length, a; r < i; r++)
      (a || !(r in t)) && ((a ||= Array.prototype.slice.call(t, 0, r)), (a[r] = t[r]));
  return e.concat(a || Array.prototype.slice.call(t));
}
var ad = `right-scroll-bar-position`,
  od = `width-before-scroll-bar`,
  sd = `with-scroll-bars-hidden`,
  cd = `--removed-body-scroll-bar-size`;
function ld(e, t) {
  return (typeof e == `function` ? e(t) : e && (e.current = t), e);
}
function ud(e, t) {
  var n = (0, V.useState)(function () {
    return {
      value: e,
      callback: t,
      facade: {
        get current() {
          return n.value;
        },
        set current(e) {
          var t = n.value;
          t !== e && ((n.value = e), n.callback(e, t));
        },
      },
    };
  })[0];
  return ((n.callback = t), n.facade);
}
var dd = typeof window < `u` ? V.useLayoutEffect : V.useEffect,
  fd = new WeakMap();
function pd(e, t) {
  var n = ud(t || null, function (t) {
    return e.forEach(function (e) {
      return ld(e, t);
    });
  });
  return (
    dd(
      function () {
        var t = fd.get(n);
        if (t) {
          var r = new Set(t),
            i = new Set(e),
            a = n.current;
          (r.forEach(function (e) {
            i.has(e) || ld(e, null);
          }),
            i.forEach(function (e) {
              r.has(e) || ld(e, a);
            }));
        }
        fd.set(n, e);
      },
      [e],
    ),
    n
  );
}
function md(e) {
  return e;
}
function hd(e, t) {
  t === void 0 && (t = md);
  var n = [],
    r = !1;
  return {
    read: function () {
      if (r)
        throw Error(
          "Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.",
        );
      return n.length ? n[n.length - 1] : e;
    },
    useMedium: function (e) {
      var i = t(e, r);
      return (
        n.push(i),
        function () {
          n = n.filter(function (e) {
            return e !== i;
          });
        }
      );
    },
    assignSyncMedium: function (e) {
      for (r = !0; n.length;) {
        var t = n;
        ((n = []), t.forEach(e));
      }
      n = {
        push: function (t) {
          return e(t);
        },
        filter: function () {
          return n;
        },
      };
    },
    assignMedium: function (e) {
      r = !0;
      var t = [];
      if (n.length) {
        var i = n;
        ((n = []), i.forEach(e), (t = n));
      }
      var a = function () {
          var n = t;
          ((t = []), n.forEach(e));
        },
        o = function () {
          return Promise.resolve().then(a);
        };
      (o(),
        (n = {
          push: function (e) {
            (t.push(e), o());
          },
          filter: function (e) {
            return ((t = t.filter(e)), n);
          },
        }));
    },
  };
}
function gd(e) {
  e === void 0 && (e = {});
  var t = hd(null);
  return ((t.options = nd({ async: !0, ssr: !1 }, e)), t);
}
var _d = function (e) {
  var t = e.sideCar,
    n = rd(e, [`sideCar`]);
  if (!t) throw Error("Sidecar: please provide `sideCar` property to import the right car");
  var r = t.read();
  if (!r) throw Error(`Sidecar medium not found`);
  return V.createElement(r, nd({}, n));
};
_d.isSideCarExport = !0;
function vd(e, t) {
  return (e.useMedium(t), _d);
}
var yd = gd(),
  bd = function () {},
  Q = V.forwardRef(function (e, t) {
    var n = V.useRef(null),
      r = V.useState({ onScrollCapture: bd, onWheelCapture: bd, onTouchMoveCapture: bd }),
      i = r[0],
      a = r[1],
      o = e.forwardProps,
      s = e.children,
      c = e.className,
      l = e.removeScrollBar,
      u = e.enabled,
      d = e.shards,
      f = e.sideCar,
      p = e.noRelative,
      m = e.noIsolation,
      h = e.inert,
      g = e.allowPinchZoom,
      _ = e.as,
      v = _ === void 0 ? `div` : _,
      y = e.gapMode,
      b = rd(e, [
        `forwardProps`,
        `children`,
        `className`,
        `removeScrollBar`,
        `enabled`,
        `shards`,
        `sideCar`,
        `noRelative`,
        `noIsolation`,
        `inert`,
        `allowPinchZoom`,
        `as`,
        `gapMode`,
      ]),
      x = f,
      S = pd([n, t]),
      C = nd(nd({}, b), i);
    return V.createElement(
      V.Fragment,
      null,
      u &&
        V.createElement(x, {
          sideCar: yd,
          removeScrollBar: l,
          shards: d,
          noRelative: p,
          noIsolation: m,
          inert: h,
          setCallbacks: a,
          allowPinchZoom: !!g,
          lockRef: n,
          gapMode: y,
        }),
      o
        ? V.cloneElement(V.Children.only(s), nd(nd({}, C), { ref: S }))
        : V.createElement(v, nd({}, C, { className: c, ref: S }), s),
    );
  });
((Q.defaultProps = { enabled: !0, removeScrollBar: !0, inert: !1 }),
  (Q.classNames = { fullWidth: od, zeroRight: ad }));
var xd,
  Sd = function () {
    if (xd) return xd;
    if (typeof __webpack_nonce__ < `u`) return __webpack_nonce__;
  };
function Cd() {
  if (!document) return null;
  var e = document.createElement(`style`);
  e.type = `text/css`;
  var t = Sd();
  return (t && e.setAttribute(`nonce`, t), e);
}
function wd(e, t) {
  e.styleSheet ? (e.styleSheet.cssText = t) : e.appendChild(document.createTextNode(t));
}
function Td(e) {
  (document.head || document.getElementsByTagName(`head`)[0]).appendChild(e);
}
var Ed = function () {
    var e = 0,
      t = null;
    return {
      add: function (n) {
        (e == 0 && (t = Cd()) && (wd(t, n), Td(t)), e++);
      },
      remove: function () {
        (e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), (t = null)));
      },
    };
  },
  Dd = function () {
    var e = Ed();
    return function (t, n) {
      V.useEffect(
        function () {
          return (
            e.add(t),
            function () {
              e.remove();
            }
          );
        },
        [t && n],
      );
    };
  },
  Od = function () {
    var e = Dd();
    return function (t) {
      var n = t.styles,
        r = t.dynamic;
      return (e(n, r), null);
    };
  },
  kd = { left: 0, top: 0, right: 0, gap: 0 },
  Ad = function (e) {
    return parseInt(e || ``, 10) || 0;
  },
  jd = function (e) {
    var t = window.getComputedStyle(document.body),
      n = t[e === `padding` ? `paddingLeft` : `marginLeft`],
      r = t[e === `padding` ? `paddingTop` : `marginTop`],
      i = t[e === `padding` ? `paddingRight` : `marginRight`];
    return [Ad(n), Ad(r), Ad(i)];
  },
  Md = function (e) {
    if ((e === void 0 && (e = `margin`), typeof window > `u`)) return kd;
    var t = jd(e),
      n = document.documentElement.clientWidth,
      r = window.innerWidth;
    return { left: t[0], top: t[1], right: t[2], gap: Math.max(0, r - n + t[2] - t[0]) };
  },
  Nd = Od(),
  $ = `data-scroll-locked`,
  Pd = function (e, t, n, r) {
    var i = e.left,
      a = e.top,
      o = e.right,
      s = e.gap;
    return (
      n === void 0 && (n = `margin`),
      `
  .${sd} {
   overflow: hidden ${r};
   padding-right: ${s}px ${r};
  }
  body[${$}] {
    overflow: hidden ${r};
    overscroll-behavior: contain;
    ${[
      t && `position: relative ${r};`,
      n === `margin` &&
        `
    padding-left: ${i}px;
    padding-top: ${a}px;
    padding-right: ${o}px;
    margin-left:0;
    margin-top:0;
    margin-right: ${s}px ${r};
    `,
      n === `padding` && `padding-right: ${s}px ${r};`,
    ]
      .filter(Boolean)
      .join(``)}
  }
  
  .${ad} {
    right: ${s}px ${r};
  }
  
  .${od} {
    margin-right: ${s}px ${r};
  }
  
  .${ad} .${ad} {
    right: 0 ${r};
  }
  
  .${od} .${od} {
    margin-right: 0 ${r};
  }
  
  body[${$}] {
    ${cd}: ${s}px;
  }
`
    );
  },
  Fd = function () {
    var e = parseInt(document.body.getAttribute(`data-scroll-locked`) || `0`, 10);
    return isFinite(e) ? e : 0;
  },
  Id = function () {
    V.useEffect(function () {
      return (
        document.body.setAttribute($, (Fd() + 1).toString()),
        function () {
          var e = Fd() - 1;
          e <= 0 ? document.body.removeAttribute($) : document.body.setAttribute($, e.toString());
        }
      );
    }, []);
  },
  Ld = function (e) {
    var t = e.noRelative,
      n = e.noImportant,
      r = e.gapMode,
      i = r === void 0 ? `margin` : r;
    Id();
    var a = V.useMemo(
      function () {
        return Md(i);
      },
      [i],
    );
    return V.createElement(Nd, { styles: Pd(a, !t, i, n ? `` : `!important`) });
  },
  Rd = !1;
if (typeof window < `u`)
  try {
    var zd = Object.defineProperty({}, "passive", {
      get: function () {
        return ((Rd = !0), !0);
      },
    });
    (window.addEventListener(`test`, zd, zd), window.removeEventListener(`test`, zd, zd));
  } catch {
    Rd = !1;
  }
var Bd = Rd ? { passive: !1 } : !1,
  Vd = function (e) {
    return e.tagName === `TEXTAREA`;
  },
  Hd = function (e, t) {
    if (!(e instanceof Element)) return !1;
    var n = window.getComputedStyle(e);
    return n[t] !== `hidden` && !(n.overflowY === n.overflowX && !Vd(e) && n[t] === `visible`);
  },
  Ud = function (e) {
    return Hd(e, `overflowY`);
  },
  Wd = function (e) {
    return Hd(e, `overflowX`);
  },
  Gd = function (e, t) {
    var n = t.ownerDocument,
      r = t;
    do {
      if ((typeof ShadowRoot < `u` && r instanceof ShadowRoot && (r = r.host), Jd(e, r))) {
        var i = Yd(e, r);
        if (i[1] > i[2]) return !0;
      }
      r = r.parentNode;
    } while (r && r !== n.body);
    return !1;
  },
  Kd = function (e) {
    return [e.scrollTop, e.scrollHeight, e.clientHeight];
  },
  qd = function (e) {
    return [e.scrollLeft, e.scrollWidth, e.clientWidth];
  },
  Jd = function (e, t) {
    return e === `v` ? Ud(t) : Wd(t);
  },
  Yd = function (e, t) {
    return e === `v` ? Kd(t) : qd(t);
  },
  Xd = function (e, t) {
    return e === `h` && t === `rtl` ? -1 : 1;
  },
  Zd = function (e, t, n, r, i) {
    var a = Xd(e, window.getComputedStyle(t).direction),
      o = a * r,
      s = n.target,
      c = t.contains(s),
      l = !1,
      u = o > 0,
      d = 0,
      f = 0;
    do {
      if (!s) break;
      var p = Yd(e, s),
        m = p[0],
        h = p[1] - p[2] - a * m;
      (m || h) && Jd(e, s) && ((d += h), (f += m));
      var g = s.parentNode;
      s = g && g.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? g.host : g;
    } while ((!c && s !== document.body) || (c && (t.contains(s) || t === s)));
    return (
      ((u && ((i && Math.abs(d) < 1) || (!i && o > d))) ||
        (!u && ((i && Math.abs(f) < 1) || (!i && -o > f)))) &&
        (l = !0),
      l
    );
  },
  Qd = function (e) {
    return `changedTouches` in e
      ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY]
      : [0, 0];
  },
  $d = function (e) {
    return [e.deltaX, e.deltaY];
  },
  ef = function (e) {
    return e && `current` in e ? e.current : e;
  },
  tf = function (e, t) {
    return e[0] === t[0] && e[1] === t[1];
  },
  nf = function (e) {
    return `
  .block-interactivity-${e} {pointer-events: none;}
  .allow-interactivity-${e} {pointer-events: all;}
`;
  },
  rf = 0,
  af = [];
function of(e) {
  var t = V.useRef([]),
    n = V.useRef([0, 0]),
    r = V.useRef(),
    i = V.useState(rf++)[0],
    a = V.useState(Od)[0],
    o = V.useRef(e);
  (V.useEffect(
    function () {
      o.current = e;
    },
    [e],
  ),
    V.useEffect(
      function () {
        if (e.inert) {
          document.body.classList.add(`block-interactivity-${i}`);
          var t = id([e.lockRef.current], (e.shards || []).map(ef), !0).filter(Boolean);
          return (
            t.forEach(function (e) {
              return e.classList.add(`allow-interactivity-${i}`);
            }),
            function () {
              (document.body.classList.remove(`block-interactivity-${i}`),
                t.forEach(function (e) {
                  return e.classList.remove(`allow-interactivity-${i}`);
                }));
            }
          );
        }
      },
      [e.inert, e.lockRef.current, e.shards],
    ));
  var s = V.useCallback(function (e, t) {
      if ((`touches` in e && e.touches.length === 2) || (e.type === `wheel` && e.ctrlKey))
        return !o.current.allowPinchZoom;
      var i = Qd(e),
        a = n.current,
        s = `deltaX` in e ? e.deltaX : a[0] - i[0],
        c = `deltaY` in e ? e.deltaY : a[1] - i[1],
        l,
        u = e.target,
        d = Math.abs(s) > Math.abs(c) ? `h` : `v`;
      if (`touches` in e && d === `h` && u.type === `range`) return !1;
      var f = window.getSelection(),
        p = f && f.anchorNode;
      if (p && (p === u || p.contains(u))) return !1;
      var m = Gd(d, u);
      if (!m) return !0;
      if ((m ? (l = d) : ((l = d === `v` ? `h` : `v`), (m = Gd(d, u))), !m)) return !1;
      if ((!r.current && `changedTouches` in e && (s || c) && (r.current = l), !l)) return !0;
      var h = r.current || l;
      return Zd(h, t, e, h === `h` ? s : c, !0);
    }, []),
    c = V.useCallback(function (e) {
      var n = e;
      if (!(!af.length || af[af.length - 1] !== a)) {
        var r = `deltaY` in n ? $d(n) : Qd(n),
          i = t.current.filter(function (e) {
            return (
              e.name === n.type &&
              (e.target === n.target || n.target === e.shadowParent) &&
              tf(e.delta, r)
            );
          })[0];
        if (i && i.should) {
          n.cancelable && n.preventDefault();
          return;
        }
        if (!i) {
          var c = (o.current.shards || [])
            .map(ef)
            .filter(Boolean)
            .filter(function (e) {
              return e.contains(n.target);
            });
          (c.length > 0 ? s(n, c[0]) : !o.current.noIsolation) &&
            n.cancelable &&
            n.preventDefault();
        }
      }
    }, []),
    l = V.useCallback(function (e, n, r, i) {
      var a = { name: e, delta: n, target: r, should: i, shadowParent: sf(r) };
      (t.current.push(a),
        setTimeout(function () {
          t.current = t.current.filter(function (e) {
            return e !== a;
          });
        }, 1));
    }, []),
    u = V.useCallback(function (e) {
      ((n.current = Qd(e)), (r.current = void 0));
    }, []),
    d = V.useCallback(function (t) {
      l(t.type, $d(t), t.target, s(t, e.lockRef.current));
    }, []),
    f = V.useCallback(function (t) {
      l(t.type, Qd(t), t.target, s(t, e.lockRef.current));
    }, []);
  V.useEffect(function () {
    return (
      af.push(a),
      e.setCallbacks({ onScrollCapture: d, onWheelCapture: d, onTouchMoveCapture: f }),
      document.addEventListener(`wheel`, c, Bd),
      document.addEventListener(`touchmove`, c, Bd),
      document.addEventListener(`touchstart`, u, Bd),
      function () {
        ((af = af.filter(function (e) {
          return e !== a;
        })),
          document.removeEventListener(`wheel`, c, Bd),
          document.removeEventListener(`touchmove`, c, Bd),
          document.removeEventListener(`touchstart`, u, Bd));
      }
    );
  }, []);
  var p = e.removeScrollBar,
    m = e.inert;
  return V.createElement(
    V.Fragment,
    null,
    m ? V.createElement(a, { styles: nf(i) }) : null,
    p ? V.createElement(Ld, { noRelative: e.noRelative, gapMode: e.gapMode }) : null,
  );
}
function sf(e) {
  for (var t = null; e !== null;)
    (e instanceof ShadowRoot && ((t = e.host), (e = e.host)), (e = e.parentNode));
  return t;
}
var cf = vd(yd, of),
  lf = V.forwardRef(function (e, t) {
    return V.createElement(Q, nd({}, e, { ref: t, sideCar: cf }));
  });
lf.classNames = Q.classNames;
var uf = function (e) {
    return typeof document > `u` ? null : (Array.isArray(e) ? e[0] : e).ownerDocument.body;
  },
  df = new WeakMap(),
  ff = new WeakMap(),
  pf = {},
  mf = 0,
  hf = function (e) {
    return e && (e.host || hf(e.parentNode));
  },
  gf = function (e, t) {
    return t
      .map(function (t) {
        if (e.contains(t)) return t;
        var n = hf(t);
        return n && e.contains(n)
          ? n
          : (console.error(`aria-hidden`, t, `in not contained inside`, e, `. Doing nothing`),
            null);
      })
      .filter(function (e) {
        return !!e;
      });
  },
  _f = function (e, t, n, r) {
    var i = gf(t, Array.isArray(e) ? e : [e]);
    pf[n] || (pf[n] = new WeakMap());
    var a = pf[n],
      o = [],
      s = new Set(),
      c = new Set(i),
      l = function (e) {
        !e || s.has(e) || (s.add(e), l(e.parentNode));
      };
    i.forEach(l);
    var u = function (e) {
      !e ||
        c.has(e) ||
        Array.prototype.forEach.call(e.children, function (e) {
          if (s.has(e)) u(e);
          else
            try {
              var t = e.getAttribute(r),
                i = t !== null && t !== `false`,
                c = (df.get(e) || 0) + 1,
                l = (a.get(e) || 0) + 1;
              (df.set(e, c),
                a.set(e, l),
                o.push(e),
                c === 1 && i && ff.set(e, !0),
                l === 1 && e.setAttribute(n, `true`),
                i || e.setAttribute(r, `true`));
            } catch (t) {
              console.error(`aria-hidden: cannot operate on `, e, t);
            }
        });
    };
    return (
      u(t),
      s.clear(),
      mf++,
      function () {
        (o.forEach(function (e) {
          var t = df.get(e) - 1,
            i = a.get(e) - 1;
          (df.set(e, t),
            a.set(e, i),
            t || (ff.has(e) || e.removeAttribute(r), ff.delete(e)),
            i || e.removeAttribute(n));
        }),
          mf--,
          mf || ((df = new WeakMap()), (df = new WeakMap()), (ff = new WeakMap()), (pf = {})));
      }
    );
  },
  vf = function (e, t, n) {
    n === void 0 && (n = `data-aria-hidden`);
    var r = Array.from(Array.isArray(e) ? e : [e]),
      i = t || uf(e);
    return i
      ? (r.push.apply(r, Array.from(i.querySelectorAll(`[aria-live], script`))),
        _f(r, i, n, `aria-hidden`))
      : function () {
          return null;
        };
  },
  yf = `Dialog`,
  [bf, xf] = eu(yf),
  [Sf, Cf] = bf(yf),
  wf = (e) => {
    let {
        __scopeDialog: t,
        children: n,
        open: r,
        defaultOpen: i,
        onOpenChange: a,
        modal: o = !0,
      } = e,
      s = V.useRef(null),
      c = V.useRef(null),
      [l, u] = su({ prop: r, defaultProp: i ?? !1, onChange: a, caller: yf });
    return (0, H.jsx)(Sf, {
      scope: t,
      triggerRef: s,
      contentRef: c,
      contentId: au(),
      titleId: au(),
      descriptionId: au(),
      open: l,
      onOpenChange: u,
      onOpenToggle: V.useCallback(() => u((e) => !e), [u]),
      modal: o,
      children: n,
    });
  };
wf.displayName = yf;
var Tf = `DialogTrigger`,
  Ef = V.forwardRef((e, t) => {
    let { __scopeDialog: n, ...r } = e,
      i = Cf(Tf, n),
      a = zl(t, i.triggerRef);
    return (0, H.jsx)(uu.button, {
      type: `button`,
      "aria-haspopup": `dialog`,
      "aria-expanded": i.open,
      "aria-controls": i.open ? i.contentId : void 0,
      "data-state": Kf(i.open),
      ...r,
      ref: a,
      onClick: $l(e.onClick, i.onOpenToggle),
    });
  });
Ef.displayName = Tf;
var Df = `DialogPortal`,
  [Of, kf] = bf(Df, { forceMount: void 0 }),
  Af = (e) => {
    let { __scopeDialog: t, forceMount: n, children: r, container: i } = e,
      a = Cf(Df, t);
    return (0, H.jsx)(Of, {
      scope: t,
      forceMount: n,
      children: V.Children.map(r, (e) =>
        (0, H.jsx)(Ku, {
          present: n || a.open,
          children: (0, H.jsx)(Gu, { asChild: !0, container: i, children: e }),
        }),
      ),
    });
  };
Af.displayName = Df;
var jf = `DialogOverlay`,
  Mf = V.forwardRef((e, t) => {
    let n = kf(jf, e.__scopeDialog),
      { forceMount: r = n.forceMount, ...i } = e,
      a = Cf(jf, e.__scopeDialog);
    return a.modal
      ? (0, H.jsx)(Ku, { present: r || a.open, children: (0, H.jsx)(Pf, { ...i, ref: t }) })
      : null;
  });
Mf.displayName = jf;
var Nf = K(`DialogOverlay.RemoveScroll`),
  Pf = V.forwardRef((e, t) => {
    let { __scopeDialog: n, ...r } = e,
      i = Cf(jf, n),
      a = zl(t, Su());
    return (0, H.jsx)(lf, {
      as: Nf,
      allowPinchZoom: !0,
      shards: [i.contentRef],
      children: (0, H.jsx)(uu.div, {
        "data-state": Kf(i.open),
        ...r,
        ref: a,
        style: { pointerEvents: `auto`, ...r.style },
      }),
    });
  }),
  Ff = `DialogContent`,
  If = V.forwardRef((e, t) => {
    let n = kf(Ff, e.__scopeDialog),
      { forceMount: r = n.forceMount, ...i } = e,
      a = Cf(Ff, e.__scopeDialog);
    return (0, H.jsx)(Ku, {
      present: r || a.open,
      children: a.modal ? (0, H.jsx)(Lf, { ...i, ref: t }) : (0, H.jsx)(Rf, { ...i, ref: t }),
    });
  });
If.displayName = Ff;
var Lf = V.forwardRef((e, t) => {
    let n = Cf(Ff, e.__scopeDialog),
      r = V.useRef(null),
      i = zl(t, n.contentRef, r);
    return (
      V.useEffect(() => {
        let e = r.current;
        if (e) return vf(e);
      }, []),
      (0, H.jsx)(zf, {
        ...e,
        ref: i,
        trapFocus: n.open,
        disableOutsidePointerEvents: n.open,
        onCloseAutoFocus: $l(e.onCloseAutoFocus, (e) => {
          (e.preventDefault(), n.triggerRef.current?.focus());
        }),
        onPointerDownOutside: $l(e.onPointerDownOutside, (e) => {
          let t = e.detail.originalEvent,
            n = t.button === 0 && t.ctrlKey === !0;
          (t.button === 2 || n) && e.preventDefault();
        }),
        onFocusOutside: $l(e.onFocusOutside, (e) => e.preventDefault()),
      })
    );
  }),
  Rf = V.forwardRef((e, t) => {
    let n = Cf(Ff, e.__scopeDialog),
      r = V.useRef(!1),
      i = V.useRef(!1);
    return (0, H.jsx)(zf, {
      ...e,
      ref: t,
      trapFocus: !1,
      disableOutsidePointerEvents: !1,
      onCloseAutoFocus: (t) => {
        (e.onCloseAutoFocus?.(t),
          t.defaultPrevented || (r.current || n.triggerRef.current?.focus(), t.preventDefault()),
          (r.current = !1),
          (i.current = !1));
      },
      onInteractOutside: (t) => {
        (e.onInteractOutside?.(t),
          t.defaultPrevented ||
            ((r.current = !0), t.detail.originalEvent.type === `pointerdown` && (i.current = !0)));
        let a = t.target;
        (n.triggerRef.current?.contains(a) && t.preventDefault(),
          t.detail.originalEvent.type === `focusin` && i.current && t.preventDefault());
      },
    });
  }),
  zf = V.forwardRef((e, t) => {
    let { __scopeDialog: n, trapFocus: r, onOpenAutoFocus: i, onCloseAutoFocus: a, ...o } = e,
      s = Cf(Ff, n);
    return (
      ed(),
      (0, H.jsx)(H.Fragment, {
        children: (0, H.jsx)(Mu, {
          asChild: !0,
          loop: !0,
          trapped: r,
          onMountAutoFocus: i,
          onUnmountAutoFocus: a,
          children: (0, H.jsx)(yu, {
            role: `dialog`,
            id: s.contentId,
            "aria-describedby": s.descriptionId,
            "aria-labelledby": s.titleId,
            "data-state": Kf(s.open),
            ...o,
            ref: t,
            deferPointerDownOutside: !0,
            onDismiss: () => s.onOpenChange(!1),
          }),
        }),
      })
    );
  }),
  Bf = `DialogTitle`,
  Vf = V.forwardRef((e, t) => {
    let { __scopeDialog: n, ...r } = e,
      i = Cf(Bf, n);
    return (0, H.jsx)(uu.h2, { id: i.titleId, ...r, ref: t });
  });
Vf.displayName = Bf;
var Hf = `DialogDescription`,
  Uf = V.forwardRef((e, t) => {
    let { __scopeDialog: n, ...r } = e,
      i = Cf(Hf, n);
    return (0, H.jsx)(uu.p, { id: i.descriptionId, ...r, ref: t });
  });
Uf.displayName = Hf;
var Wf = `DialogClose`,
  Gf = V.forwardRef((e, t) => {
    let { __scopeDialog: n, ...r } = e,
      i = Cf(Wf, n);
    return (0, H.jsx)(uu.button, {
      type: `button`,
      ...r,
      ref: t,
      onClick: $l(e.onClick, () => i.onOpenChange(!1)),
    });
  });
Gf.displayName = Wf;
function Kf(e) {
  return e ? `open` : `closed`;
}
var qf = wf,
  Jf = Ef,
  Yf = Af,
  Xf = V.forwardRef(({ className: e, ...t }, n) =>
    (0, H.jsx)(Mf, {
      ref: n,
      className: y(
        `fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`,
        e,
      ),
      ...t,
    }),
  );
Xf.displayName = Mf.displayName;
var Zf = V.forwardRef(({ className: e, children: t, ...n }, r) =>
  (0, H.jsxs)(Yf, {
    children: [
      (0, H.jsx)(Xf, {}),
      (0, H.jsxs)(If, {
        ref: r,
        className: y(
          `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg`,
          e,
        ),
        ...n,
        children: [
          t,
          (0, H.jsxs)(Gf, {
            className: `absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground`,
            children: [
              (0, H.jsx)(Al, { className: `h-4 w-4` }),
              (0, H.jsx)(`span`, { className: `sr-only`, children: `Close` }),
            ],
          }),
        ],
      }),
    ],
  }),
);
Zf.displayName = If.displayName;
var Qf = ({ className: e, ...t }) =>
  (0, H.jsx)(`div`, {
    className: y(`flex flex-col space-y-1.5 text-center sm:text-left`, e),
    ...t,
  });
Qf.displayName = `DialogHeader`;
var $f = ({ className: e, ...t }) =>
  (0, H.jsx)(`div`, {
    className: y(`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2`, e),
    ...t,
  });
$f.displayName = `DialogFooter`;
var ep = V.forwardRef(({ className: e, ...t }, n) =>
  (0, H.jsx)(Vf, {
    ref: n,
    className: y(`text-lg font-semibold leading-none tracking-tight`, e),
    ...t,
  }),
);
ep.displayName = Vf.displayName;
var tp = V.forwardRef(({ className: e, ...t }, n) =>
  (0, H.jsx)(Uf, { ref: n, className: y(`text-sm text-muted-foreground`, e), ...t }),
);
tp.displayName = Uf.displayName;
function np() {
  let [e, t] = (0, V.useState)(null),
    [n, r] = (0, V.useState)(!1),
    [i, a] = (0, V.useState)(!1);
  (0, V.useEffect)(() => {
    if ((Fl(), Il(), Nl())) {
      r(!0);
      return;
    }
    let e = (e) => {
        (e.preventDefault(), t(e));
      },
      n = () => r(!0),
      i = (e) => {
        e.matches && r(!0);
      };
    (window.addEventListener(`beforeinstallprompt`, e), window.addEventListener(`appinstalled`, n));
    let a = window.matchMedia(`(display-mode: standalone)`);
    return (
      a.addEventListener(`change`, i),
      () => {
        (window.removeEventListener(`beforeinstallprompt`, e),
          window.removeEventListener(`appinstalled`, n),
          a.removeEventListener(`change`, i));
      }
    );
  }, []);
  let o = e !== null || Pl();
  if (n || Nl() || !o) return null;
  async function s() {
    if (e) {
      (await e.prompt().then(() => e.userChoice)).outcome === `accepted` && r(!0);
      return;
    }
    Pl() && a(!0);
  }
  return (0, H.jsxs)(H.Fragment, {
    children: [
      (0, H.jsxs)(Ql, {
        size: `lg`,
        onClick: s,
        "aria-label": `Télécharger l'application`,
        className: `fixed bottom-4 right-4 z-40 rounded-full shadow-lg gap-2`,
        children: [(0, H.jsx)(Tl, { className: `h-5 w-5` }), `Télécharger l'app`],
      }),
      (0, H.jsx)(qf, {
        open: i,
        onOpenChange: a,
        children: (0, H.jsx)(Zf, {
          children: (0, H.jsxs)(Qf, {
            children: [
              (0, H.jsx)(ep, { children: `Installer l'application` }),
              (0, H.jsx)(tp, {
                children: `Sur iPhone/iPad : ouvrez le menu Partager dans Safari, puis choisissez « Ajouter à l'écran d'accueil ».`,
              }),
            ],
          }),
        }),
      }),
    ],
  });
}
function rp(e) {
  if (!e || typeof document > `u`) return;
  let t = document.head || document.getElementsByTagName(`head`)[0],
    n = document.createElement(`style`);
  ((n.type = `text/css`),
    t.appendChild(n),
    n.styleSheet ? (n.styleSheet.cssText = e) : n.appendChild(document.createTextNode(e)));
}
var ip = (e) => {
    switch (e) {
      case `success`:
        return sp;
      case `info`:
        return lp;
      case `warning`:
        return cp;
      case `error`:
        return up;
      default:
        return null;
    }
  },
  ap = Array(12).fill(0),
  op = ({ visible: e, className: t }) =>
    V.createElement(
      `div`,
      { className: [`sonner-loading-wrapper`, t].filter(Boolean).join(` `), "data-visible": e },
      V.createElement(
        `div`,
        { className: `sonner-spinner` },
        ap.map((e, t) =>
          V.createElement(`div`, { className: `sonner-loading-bar`, key: `spinner-bar-${t}` }),
        ),
      ),
    ),
  sp = V.createElement(
    `svg`,
    {
      xmlns: `http://www.w3.org/2000/svg`,
      viewBox: `0 0 20 20`,
      fill: `currentColor`,
      height: `20`,
      width: `20`,
    },
    V.createElement(`path`, {
      fillRule: `evenodd`,
      d: `M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z`,
      clipRule: `evenodd`,
    }),
  ),
  cp = V.createElement(
    `svg`,
    {
      xmlns: `http://www.w3.org/2000/svg`,
      viewBox: `0 0 24 24`,
      fill: `currentColor`,
      height: `20`,
      width: `20`,
    },
    V.createElement(`path`, {
      fillRule: `evenodd`,
      d: `M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z`,
      clipRule: `evenodd`,
    }),
  ),
  lp = V.createElement(
    `svg`,
    {
      xmlns: `http://www.w3.org/2000/svg`,
      viewBox: `0 0 20 20`,
      fill: `currentColor`,
      height: `20`,
      width: `20`,
    },
    V.createElement(`path`, {
      fillRule: `evenodd`,
      d: `M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z`,
      clipRule: `evenodd`,
    }),
  ),
  up = V.createElement(
    `svg`,
    {
      xmlns: `http://www.w3.org/2000/svg`,
      viewBox: `0 0 20 20`,
      fill: `currentColor`,
      height: `20`,
      width: `20`,
    },
    V.createElement(`path`, {
      fillRule: `evenodd`,
      d: `M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z`,
      clipRule: `evenodd`,
    }),
  ),
  dp = V.createElement(
    `svg`,
    {
      xmlns: `http://www.w3.org/2000/svg`,
      width: `12`,
      height: `12`,
      viewBox: `0 0 24 24`,
      fill: `none`,
      stroke: `currentColor`,
      strokeWidth: `1.5`,
      strokeLinecap: `round`,
      strokeLinejoin: `round`,
    },
    V.createElement(`line`, { x1: `18`, y1: `6`, x2: `6`, y2: `18` }),
    V.createElement(`line`, { x1: `6`, y1: `6`, x2: `18`, y2: `18` }),
  ),
  fp = () => {
    let [e, t] = V.useState(document.hidden);
    return (
      V.useEffect(() => {
        let e = () => {
          t(document.hidden);
        };
        return (
          document.addEventListener(`visibilitychange`, e),
          () => window.removeEventListener(`visibilitychange`, e)
        );
      }, []),
      e
    );
  },
  pp = 1,
  mp = new (class {
    constructor() {
      ((this.subscribe = (e) => (
        this.subscribers.push(e),
        () => {
          let t = this.subscribers.indexOf(e);
          this.subscribers.splice(t, 1);
        }
      )),
        (this.publish = (e) => {
          this.subscribers.forEach((t) => t(e));
        }),
        (this.addToast = (e) => {
          (this.publish(e), (this.toasts = [...this.toasts, e]));
        }),
        (this.create = (e) => {
          let { message: t, ...n } = e,
            r = typeof e?.id == `number` || e.id?.length > 0 ? e.id : pp++,
            i = this.toasts.find((e) => e.id === r),
            a = e.dismissible === void 0 || e.dismissible;
          return (
            this.dismissedToasts.has(r) && this.dismissedToasts.delete(r),
            i
              ? (this.toasts = this.toasts.map((n) =>
                  n.id === r
                    ? (this.publish({ ...n, ...e, id: r, title: t }),
                      { ...n, ...e, id: r, dismissible: a, title: t })
                    : n,
                ))
              : this.addToast({ title: t, ...n, dismissible: a, id: r }),
            r
          );
        }),
        (this.dismiss = (e) => (
          e
            ? (this.dismissedToasts.add(e),
              requestAnimationFrame(() =>
                this.subscribers.forEach((t) => t({ id: e, dismiss: !0 })),
              ))
            : this.toasts.forEach((e) => {
                this.subscribers.forEach((t) => t({ id: e.id, dismiss: !0 }));
              }),
          e
        )),
        (this.message = (e, t) => this.create({ ...t, message: e })),
        (this.error = (e, t) => this.create({ ...t, message: e, type: `error` })),
        (this.success = (e, t) => this.create({ ...t, type: `success`, message: e })),
        (this.info = (e, t) => this.create({ ...t, type: `info`, message: e })),
        (this.warning = (e, t) => this.create({ ...t, type: `warning`, message: e })),
        (this.loading = (e, t) => this.create({ ...t, type: `loading`, message: e })),
        (this.promise = (e, t) => {
          if (!t) return;
          let n;
          t.loading !== void 0 &&
            (n = this.create({
              ...t,
              promise: e,
              type: `loading`,
              message: t.loading,
              description: typeof t.description == `function` ? void 0 : t.description,
            }));
          let r = Promise.resolve(e instanceof Function ? e() : e),
            i = n !== void 0,
            a,
            o = r
              .then(async (e) => {
                if (((a = [`resolve`, e]), V.isValidElement(e)))
                  ((i = !1), this.create({ id: n, type: `default`, message: e }));
                else if (gp(e) && !e.ok) {
                  i = !1;
                  let r =
                      typeof t.error == `function`
                        ? await t.error(`HTTP error! status: ${e.status}`)
                        : t.error,
                    a =
                      typeof t.description == `function`
                        ? await t.description(`HTTP error! status: ${e.status}`)
                        : t.description,
                    o = typeof r == `object` && !V.isValidElement(r) ? r : { message: r };
                  this.create({ id: n, type: `error`, description: a, ...o });
                } else if (e instanceof Error) {
                  i = !1;
                  let r = typeof t.error == `function` ? await t.error(e) : t.error,
                    a = typeof t.description == `function` ? await t.description(e) : t.description,
                    o = typeof r == `object` && !V.isValidElement(r) ? r : { message: r };
                  this.create({ id: n, type: `error`, description: a, ...o });
                } else if (t.success !== void 0) {
                  i = !1;
                  let r = typeof t.success == `function` ? await t.success(e) : t.success,
                    a = typeof t.description == `function` ? await t.description(e) : t.description,
                    o = typeof r == `object` && !V.isValidElement(r) ? r : { message: r };
                  this.create({ id: n, type: `success`, description: a, ...o });
                }
              })
              .catch(async (e) => {
                if (((a = [`reject`, e]), t.error !== void 0)) {
                  i = !1;
                  let r = typeof t.error == `function` ? await t.error(e) : t.error,
                    a = typeof t.description == `function` ? await t.description(e) : t.description,
                    o = typeof r == `object` && !V.isValidElement(r) ? r : { message: r };
                  this.create({ id: n, type: `error`, description: a, ...o });
                }
              })
              .finally(() => {
                (i && (this.dismiss(n), (n = void 0)), t.finally == null || t.finally.call(t));
              }),
            s = () =>
              new Promise((e, t) => o.then(() => (a[0] === `reject` ? t(a[1]) : e(a[1]))).catch(t));
          return typeof n != `string` && typeof n != `number`
            ? { unwrap: s }
            : Object.assign(n, { unwrap: s });
        }),
        (this.custom = (e, t) => {
          let n = t?.id || pp++;
          return (this.create({ jsx: e(n), id: n, ...t }), n);
        }),
        (this.getActiveToasts = () => this.toasts.filter((e) => !this.dismissedToasts.has(e.id))),
        (this.subscribers = []),
        (this.toasts = []),
        (this.dismissedToasts = new Set()));
    }
  })(),
  hp = (e, t) => {
    let n = t?.id || pp++;
    return (mp.addToast({ title: e, ...t, id: n }), n);
  },
  gp = (e) =>
    e &&
    typeof e == `object` &&
    `ok` in e &&
    typeof e.ok == `boolean` &&
    `status` in e &&
    typeof e.status == `number`,
  _p = Object.assign(
    hp,
    {
      success: mp.success,
      info: mp.info,
      warning: mp.warning,
      error: mp.error,
      custom: mp.custom,
      message: mp.message,
      promise: mp.promise,
      dismiss: mp.dismiss,
      loading: mp.loading,
    },
    { getHistory: () => mp.toasts, getToasts: () => mp.getActiveToasts() },
  );
rp(
  `[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);background:var(--normal-bg);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}`,
);
function vp(e) {
  return e.label !== void 0;
}
var yp = 3,
  bp = `24px`,
  xp = `16px`,
  Sp = 4e3,
  Cp = 356,
  wp = 14,
  Tp = 45,
  Ep = 200;
function Dp(...e) {
  return e.filter(Boolean).join(` `);
}
function Op(e) {
  let [t, n] = e.split(`-`),
    r = [];
  return (t && r.push(t), n && r.push(n), r);
}
var kp = (e) => {
  let {
      invert: t,
      toast: n,
      unstyled: r,
      interacting: i,
      setHeights: a,
      visibleToasts: o,
      heights: s,
      index: c,
      toasts: l,
      expanded: u,
      removeToast: d,
      defaultRichColors: f,
      closeButton: p,
      style: m,
      cancelButtonStyle: h,
      actionButtonStyle: g,
      className: _ = ``,
      descriptionClassName: v = ``,
      duration: y,
      position: b,
      gap: x,
      expandByDefault: S,
      classNames: C,
      icons: ee,
      closeButtonAriaLabel: te = `Close toast`,
    } = e,
    [ne, re] = V.useState(null),
    [w, ie] = V.useState(null),
    [ae, oe] = V.useState(!1),
    [se, ce] = V.useState(!1),
    [le, ue] = V.useState(!1),
    [E, D] = V.useState(!1),
    [de, fe] = V.useState(!1),
    [pe, me] = V.useState(0),
    [O, k] = V.useState(0),
    he = V.useRef(n.duration || y || Sp),
    ge = V.useRef(null),
    _e = V.useRef(null),
    ve = c === 0,
    ye = c + 1 <= o,
    A = n.type,
    j = n.dismissible !== !1,
    be = n.className || ``,
    xe = n.descriptionClassName || ``,
    Se = V.useMemo(() => s.findIndex((e) => e.toastId === n.id) || 0, [s, n.id]),
    Ce = V.useMemo(() => n.closeButton ?? p, [n.closeButton, p]),
    we = V.useMemo(() => n.duration || y || Sp, [n.duration, y]),
    Te = V.useRef(0),
    Ee = V.useRef(0),
    De = V.useRef(0),
    Oe = V.useRef(null),
    [ke, Ae] = b.split(`-`),
    je = V.useMemo(() => s.reduce((e, t, n) => (n >= Se ? e : e + t.height), 0), [s, Se]),
    Me = fp(),
    Ne = n.invert || t,
    Pe = A === `loading`;
  ((Ee.current = V.useMemo(() => Se * x + je, [Se, je])),
    V.useEffect(() => {
      he.current = we;
    }, [we]),
    V.useEffect(() => {
      oe(!0);
    }, []),
    V.useEffect(() => {
      let e = _e.current;
      if (e) {
        let t = e.getBoundingClientRect().height;
        return (
          k(t),
          a((e) => [{ toastId: n.id, height: t, position: n.position }, ...e]),
          () => a((e) => e.filter((e) => e.toastId !== n.id))
        );
      }
    }, [a, n.id]),
    V.useLayoutEffect(() => {
      if (!ae) return;
      let e = _e.current,
        t = e.style.height;
      e.style.height = `auto`;
      let r = e.getBoundingClientRect().height;
      ((e.style.height = t),
        k(r),
        a((e) =>
          e.find((e) => e.toastId === n.id)
            ? e.map((e) => (e.toastId === n.id ? { ...e, height: r } : e))
            : [{ toastId: n.id, height: r, position: n.position }, ...e],
        ));
    }, [ae, n.title, n.description, a, n.id, n.jsx, n.action, n.cancel]));
  let Fe = V.useCallback(() => {
    (ce(!0),
      me(Ee.current),
      a((e) => e.filter((e) => e.toastId !== n.id)),
      setTimeout(() => {
        d(n);
      }, Ep));
  }, [n, d, a, Ee]);
  (V.useEffect(() => {
    if ((n.promise && A === `loading`) || n.duration === 1 / 0 || n.type === `loading`) return;
    let e;
    return (
      u || i || Me
        ? (() => {
            if (De.current < Te.current) {
              let e = new Date().getTime() - Te.current;
              he.current -= e;
            }
            De.current = new Date().getTime();
          })()
        : he.current !== 1 / 0 &&
          ((Te.current = new Date().getTime()),
          (e = setTimeout(() => {
            (n.onAutoClose == null || n.onAutoClose.call(n, n), Fe());
          }, he.current))),
      () => clearTimeout(e)
    );
  }, [u, i, n, A, Me, Fe]),
    V.useEffect(() => {
      n.delete && (Fe(), n.onDismiss == null || n.onDismiss.call(n, n));
    }, [Fe, n.delete]));
  function Ie() {
    return ee?.loading
      ? V.createElement(
          `div`,
          {
            className: Dp(C?.loader, n?.classNames?.loader, `sonner-loader`),
            "data-visible": A === `loading`,
          },
          ee.loading,
        )
      : V.createElement(op, {
          className: Dp(C?.loader, n?.classNames?.loader),
          visible: A === `loading`,
        });
  }
  let Le = n.icon || ee?.[A] || ip(A);
  return V.createElement(
    `li`,
    {
      tabIndex: 0,
      ref: _e,
      className: Dp(_, be, C?.toast, n?.classNames?.toast, C?.default, C?.[A], n?.classNames?.[A]),
      "data-sonner-toast": ``,
      "data-rich-colors": n.richColors ?? f,
      "data-styled": !(n.jsx || n.unstyled || r),
      "data-mounted": ae,
      "data-promise": !!n.promise,
      "data-swiped": de,
      "data-removed": se,
      "data-visible": ye,
      "data-y-position": ke,
      "data-x-position": Ae,
      "data-index": c,
      "data-front": ve,
      "data-swiping": le,
      "data-dismissible": j,
      "data-type": A,
      "data-invert": Ne,
      "data-swipe-out": E,
      "data-swipe-direction": w,
      "data-expanded": !!(u || (S && ae)),
      "data-testid": n.testId,
      style: {
        "--index": c,
        "--toasts-before": c,
        "--z-index": l.length - c,
        "--offset": `${se ? pe : Ee.current}px`,
        "--initial-height": S ? `auto` : `${O}px`,
        ...m,
        ...n.style,
      },
      onDragEnd: () => {
        (ue(!1), re(null), (Oe.current = null));
      },
      onPointerDown: (e) => {
        e.button !== 2 &&
          (Pe ||
            !j ||
            ((ge.current = new Date()),
            me(Ee.current),
            e.target.setPointerCapture(e.pointerId),
            e.target.tagName !== `BUTTON` &&
              (ue(!0), (Oe.current = { x: e.clientX, y: e.clientY }))));
      },
      onPointerUp: () => {
        if (E || !j) return;
        Oe.current = null;
        let e = Number(
            _e.current?.style.getPropertyValue(`--swipe-amount-x`).replace(`px`, ``) || 0,
          ),
          t = Number(_e.current?.style.getPropertyValue(`--swipe-amount-y`).replace(`px`, ``) || 0),
          r = new Date().getTime() - ge.current?.getTime(),
          i = ne === `x` ? e : t,
          a = Math.abs(i) / r;
        if (Math.abs(i) >= Tp || a > 0.11) {
          (me(Ee.current),
            n.onDismiss == null || n.onDismiss.call(n, n),
            ie(ne === `x` ? (e > 0 ? `right` : `left`) : t > 0 ? `down` : `up`),
            Fe(),
            D(!0));
          return;
        } else {
          var o, s;
          ((o = _e.current) == null || o.style.setProperty(`--swipe-amount-x`, `0px`),
            (s = _e.current) == null || s.style.setProperty(`--swipe-amount-y`, `0px`));
        }
        (fe(!1), ue(!1), re(null));
      },
      onPointerMove: (t) => {
        var n, r;
        if (!Oe.current || !j || window.getSelection()?.toString().length > 0) return;
        let i = t.clientY - Oe.current.y,
          a = t.clientX - Oe.current.x,
          o = e.swipeDirections ?? Op(b);
        !ne && (Math.abs(a) > 1 || Math.abs(i) > 1) && re(Math.abs(a) > Math.abs(i) ? `x` : `y`);
        let s = { x: 0, y: 0 },
          c = (e) => 1 / (1.5 + Math.abs(e) / 20);
        if (ne === `y`) {
          if (o.includes(`top`) || o.includes(`bottom`))
            if ((o.includes(`top`) && i < 0) || (o.includes(`bottom`) && i > 0)) s.y = i;
            else {
              let e = i * c(i);
              s.y = Math.abs(e) < Math.abs(i) ? e : i;
            }
        } else if (ne === `x` && (o.includes(`left`) || o.includes(`right`)))
          if ((o.includes(`left`) && a < 0) || (o.includes(`right`) && a > 0)) s.x = a;
          else {
            let e = a * c(a);
            s.x = Math.abs(e) < Math.abs(a) ? e : a;
          }
        ((Math.abs(s.x) > 0 || Math.abs(s.y) > 0) && fe(!0),
          (n = _e.current) == null || n.style.setProperty(`--swipe-amount-x`, `${s.x}px`),
          (r = _e.current) == null || r.style.setProperty(`--swipe-amount-y`, `${s.y}px`));
      },
    },
    Ce && !n.jsx && A !== `loading`
      ? V.createElement(
          `button`,
          {
            "aria-label": te,
            "data-disabled": Pe,
            "data-close-button": !0,
            onClick:
              Pe || !j
                ? () => {}
                : () => {
                    (Fe(), n.onDismiss == null || n.onDismiss.call(n, n));
                  },
            className: Dp(C?.closeButton, n?.classNames?.closeButton),
          },
          ee?.close ?? dp,
        )
      : null,
    (A || n.icon || n.promise) && n.icon !== null && (ee?.[A] !== null || n.icon)
      ? V.createElement(
          `div`,
          { "data-icon": ``, className: Dp(C?.icon, n?.classNames?.icon) },
          n.promise || (n.type === `loading` && !n.icon) ? n.icon || Ie() : null,
          n.type === `loading` ? null : Le,
        )
      : null,
    V.createElement(
      `div`,
      { "data-content": ``, className: Dp(C?.content, n?.classNames?.content) },
      V.createElement(
        `div`,
        { "data-title": ``, className: Dp(C?.title, n?.classNames?.title) },
        n.jsx ? n.jsx : typeof n.title == `function` ? n.title() : n.title,
      ),
      n.description
        ? V.createElement(
            `div`,
            {
              "data-description": ``,
              className: Dp(v, xe, C?.description, n?.classNames?.description),
            },
            typeof n.description == `function` ? n.description() : n.description,
          )
        : null,
    ),
    V.isValidElement(n.cancel)
      ? n.cancel
      : n.cancel && vp(n.cancel)
        ? V.createElement(
            `button`,
            {
              "data-button": !0,
              "data-cancel": !0,
              style: n.cancelButtonStyle || h,
              onClick: (e) => {
                vp(n.cancel) &&
                  j &&
                  (n.cancel.onClick == null || n.cancel.onClick.call(n.cancel, e), Fe());
              },
              className: Dp(C?.cancelButton, n?.classNames?.cancelButton),
            },
            n.cancel.label,
          )
        : null,
    V.isValidElement(n.action)
      ? n.action
      : n.action && vp(n.action)
        ? V.createElement(
            `button`,
            {
              "data-button": !0,
              "data-action": !0,
              style: n.actionButtonStyle || g,
              onClick: (e) => {
                vp(n.action) &&
                  (n.action.onClick == null || n.action.onClick.call(n.action, e),
                  !e.defaultPrevented && Fe());
              },
              className: Dp(C?.actionButton, n?.classNames?.actionButton),
            },
            n.action.label,
          )
        : null,
  );
};
function Ap() {
  if (typeof window > `u` || typeof document > `u`) return `ltr`;
  let e = document.documentElement.getAttribute(`dir`);
  return e === `auto` || !e ? window.getComputedStyle(document.documentElement).direction : e;
}
function jp(e, t) {
  let n = {};
  return (
    [e, t].forEach((e, t) => {
      let r = t === 1,
        i = r ? `--mobile-offset` : `--offset`,
        a = r ? xp : bp;
      function o(e) {
        [`top`, `right`, `bottom`, `left`].forEach((t) => {
          n[`${i}-${t}`] = typeof e == `number` ? `${e}px` : e;
        });
      }
      typeof e == `number` || typeof e == `string`
        ? o(e)
        : typeof e == `object`
          ? [`top`, `right`, `bottom`, `left`].forEach((t) => {
              e[t] === void 0
                ? (n[`${i}-${t}`] = a)
                : (n[`${i}-${t}`] = typeof e[t] == `number` ? `${e[t]}px` : e[t]);
            })
          : o(a);
    }),
    n
  );
}
var Mp = V.forwardRef(function (e, t) {
  let {
      id: n,
      invert: r,
      position: i = `bottom-right`,
      hotkey: a = [`altKey`, `KeyT`],
      expand: o,
      closeButton: s,
      className: c,
      offset: l,
      mobileOffset: u,
      theme: d = `light`,
      richColors: f,
      duration: p,
      style: m,
      visibleToasts: h = yp,
      toastOptions: g,
      dir: _ = Ap(),
      gap: v = wp,
      icons: y,
      containerAriaLabel: b = `Notifications`,
    } = e,
    [x, S] = V.useState([]),
    C = V.useMemo(
      () => (n ? x.filter((e) => e.toasterId === n) : x.filter((e) => !e.toasterId)),
      [x, n],
    ),
    ee = V.useMemo(
      () => Array.from(new Set([i].concat(C.filter((e) => e.position).map((e) => e.position)))),
      [C, i],
    ),
    [te, ne] = V.useState([]),
    [re, w] = V.useState(!1),
    [ie, ae] = V.useState(!1),
    [oe, se] = V.useState(
      d === `system`
        ? typeof window < `u` &&
          window.matchMedia &&
          window.matchMedia(`(prefers-color-scheme: dark)`).matches
          ? `dark`
          : `light`
        : d,
    ),
    ce = V.useRef(null),
    le = a.join(`+`).replace(/Key/g, ``).replace(/Digit/g, ``),
    ue = V.useRef(null),
    E = V.useRef(!1),
    D = V.useCallback((e) => {
      S(
        (t) => (
          t.find((t) => t.id === e.id)?.delete || mp.dismiss(e.id),
          t.filter(({ id: t }) => t !== e.id)
        ),
      );
    }, []);
  return (
    V.useEffect(
      () =>
        mp.subscribe((e) => {
          if (e.dismiss) {
            requestAnimationFrame(() => {
              S((t) => t.map((t) => (t.id === e.id ? { ...t, delete: !0 } : t)));
            });
            return;
          }
          setTimeout(() => {
            yc.flushSync(() => {
              S((t) => {
                let n = t.findIndex((t) => t.id === e.id);
                return n === -1
                  ? [e, ...t]
                  : [...t.slice(0, n), { ...t[n], ...e }, ...t.slice(n + 1)];
              });
            });
          });
        }),
      [x],
    ),
    V.useEffect(() => {
      if (d !== `system`) {
        se(d);
        return;
      }
      if (
        (d === `system` &&
          (window.matchMedia && window.matchMedia(`(prefers-color-scheme: dark)`).matches
            ? se(`dark`)
            : se(`light`)),
        typeof window > `u`)
      )
        return;
      let e = window.matchMedia(`(prefers-color-scheme: dark)`);
      try {
        e.addEventListener(`change`, ({ matches: e }) => {
          se(e ? `dark` : `light`);
        });
      } catch {
        e.addListener(({ matches: e }) => {
          try {
            se(e ? `dark` : `light`);
          } catch (e) {
            console.error(e);
          }
        });
      }
    }, [d]),
    V.useEffect(() => {
      x.length <= 1 && w(!1);
    }, [x]),
    V.useEffect(() => {
      let e = (e) => {
        if (a.every((t) => e[t] || e.code === t)) {
          var t;
          (w(!0), (t = ce.current) == null || t.focus());
        }
        e.code === `Escape` &&
          (document.activeElement === ce.current || ce.current?.contains(document.activeElement)) &&
          w(!1);
      };
      return (
        document.addEventListener(`keydown`, e),
        () => document.removeEventListener(`keydown`, e)
      );
    }, [a]),
    V.useEffect(() => {
      if (ce.current)
        return () => {
          ue.current &&
            (ue.current.focus({ preventScroll: !0 }), (ue.current = null), (E.current = !1));
        };
    }, [ce.current]),
    V.createElement(
      `section`,
      {
        ref: t,
        "aria-label": `${b} ${le}`,
        tabIndex: -1,
        "aria-live": `polite`,
        "aria-relevant": `additions text`,
        "aria-atomic": `false`,
        suppressHydrationWarning: !0,
      },
      ee.map((t, n) => {
        let [i, a] = t.split(`-`);
        return C.length
          ? V.createElement(
              `ol`,
              {
                key: t,
                dir: _ === `auto` ? Ap() : _,
                tabIndex: -1,
                ref: ce,
                className: c,
                "data-sonner-toaster": !0,
                "data-sonner-theme": oe,
                "data-y-position": i,
                "data-x-position": a,
                style: {
                  "--front-toast-height": `${te[0]?.height || 0}px`,
                  "--width": `${Cp}px`,
                  "--gap": `${v}px`,
                  ...m,
                  ...jp(l, u),
                },
                onBlur: (e) => {
                  E.current &&
                    !e.currentTarget.contains(e.relatedTarget) &&
                    ((E.current = !1),
                    (ue.current &&= (ue.current.focus({ preventScroll: !0 }), null)));
                },
                onFocus: (e) => {
                  (e.target instanceof HTMLElement && e.target.dataset.dismissible === `false`) ||
                    E.current ||
                    ((E.current = !0), (ue.current = e.relatedTarget));
                },
                onMouseEnter: () => w(!0),
                onMouseMove: () => w(!0),
                onMouseLeave: () => {
                  ie || w(!1);
                },
                onDragEnd: () => w(!1),
                onPointerDown: (e) => {
                  (e.target instanceof HTMLElement && e.target.dataset.dismissible === `false`) ||
                    ae(!0);
                },
                onPointerUp: () => ae(!1),
              },
              C.filter((e) => (!e.position && n === 0) || e.position === t).map((n, i) =>
                V.createElement(kp, {
                  key: n.id,
                  icons: y,
                  index: i,
                  toast: n,
                  defaultRichColors: f,
                  duration: g?.duration ?? p,
                  className: g?.className,
                  descriptionClassName: g?.descriptionClassName,
                  invert: r,
                  visibleToasts: h,
                  closeButton: g?.closeButton ?? s,
                  interacting: ie,
                  position: t,
                  style: g?.style,
                  unstyled: g?.unstyled,
                  classNames: g?.classNames,
                  cancelButtonStyle: g?.cancelButtonStyle,
                  actionButtonStyle: g?.actionButtonStyle,
                  closeButtonAriaLabel: g?.closeButtonAriaLabel,
                  removeToast: D,
                  toasts: C.filter((e) => e.position == n.position),
                  heights: te.filter((e) => e.position == n.position),
                  setHeights: ne,
                  expandByDefault: o,
                  gap: v,
                  expanded: re,
                  swipeDirections: e.swipeDirections,
                }),
              ),
            )
          : null;
      }),
    )
  );
});
function Np() {
  return (0, H.jsx)(`div`, {
    className: `flex min-h-screen items-center justify-center bg-background px-4`,
    children: (0, H.jsxs)(`div`, {
      className: `max-w-md text-center`,
      children: [
        (0, H.jsx)(`h1`, { className: `text-7xl font-bold text-foreground`, children: `404` }),
        (0, H.jsx)(`h2`, {
          className: `mt-4 text-xl font-semibold text-foreground`,
          children: `Page not found`,
        }),
        (0, H.jsx)(`p`, {
          className: `mt-2 text-sm text-muted-foreground`,
          children: `The page you're looking for doesn't exist or has been moved.`,
        }),
        (0, H.jsx)(`div`, {
          className: `mt-6`,
          children: (0, H.jsx)(jc, {
            to: `/`,
            className: `inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90`,
            children: `Go home`,
          }),
        }),
      ],
    }),
  });
}
function Pp({ error: e, reset: t }) {
  console.error(e);
  let n = Ls();
  return (
    (0, V.useEffect)(() => {
      Cl(e, { boundary: `tanstack_root_error_component` });
    }, [e]),
    (0, H.jsx)(`div`, {
      className: `flex min-h-screen items-center justify-center bg-background px-4`,
      children: (0, H.jsxs)(`div`, {
        className: `max-w-md text-center`,
        children: [
          (0, H.jsx)(`h1`, {
            className: `text-xl font-semibold tracking-tight text-foreground`,
            children: `This page didn't load`,
          }),
          (0, H.jsx)(`p`, {
            className: `mt-2 text-sm text-muted-foreground`,
            children: `Something went wrong on our end. You can try refreshing or head back home.`,
          }),
          (0, H.jsxs)(`div`, {
            className: `mt-6 flex flex-wrap justify-center gap-2`,
            children: [
              (0, H.jsx)(`button`, {
                onClick: () => {
                  (n.invalidate(), t());
                },
                className: `inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90`,
                children: `Try again`,
              }),
              (0, H.jsx)(`a`, {
                href: `/`,
                className: `inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent`,
                children: `Go home`,
              }),
            ],
          }),
        ],
      }),
    })
  );
}
var Fp = Fc()({
  head: () => ({
    meta: [
      { charSet: `utf-8` },
      { name: `viewport`, content: `width=device-width, initial-scale=1` },
      { title: `Caisse POS — Ventes, stocks et monnaie` },
      {
        name: `description`,
        content: `Application de caisse simple et hors-ligne : gestion des stocks, prise de commande, calcul de la monnaie à rendre et historique des ventes.`,
      },
      { name: `author`, content: `Lovable` },
      { property: `og:title`, content: `Caisse POS — Ventes, stocks et monnaie` },
      {
        property: `og:description`,
        content: `Prenez vos commandes, calculez la monnaie et suivez vos stocks en temps réel.`,
      },
      { property: `og:type`, content: `website` },
      { name: `twitter:card`, content: `summary_large_image` },
      { name: `theme-color`, content: `#059669` },
      { name: `mobile-web-app-capable`, content: `yes` },
      { name: `apple-mobile-web-app-capable`, content: `yes` },
      { name: `apple-mobile-web-app-status-bar-style`, content: `default` },
    ],
    links: [
      { rel: `stylesheet`, href: Sl },
      { rel: `icon`, href: `/favicon.ico`, type: `image/x-icon` },
      { rel: `manifest`, href: `/manifest.webmanifest` },
      { rel: `apple-touch-icon`, href: `/apple-touch-icon.png` },
    ],
  }),
  shellComponent: Ip,
  component: Lp,
  notFoundComponent: Np,
  errorComponent: Pp,
});
function Ip({ children: e }) {
  return (0, H.jsxs)(`html`, {
    lang: `fr`,
    children: [
      (0, H.jsx)(`head`, { children: (0, H.jsx)(G, {}) }),
      (0, H.jsxs)(`body`, { children: [e, (0, H.jsx)(ll, {})] }),
    ],
  });
}
function Lp() {
  let { queryClient: e } = Fp.useRouteContext();
  return (0, H.jsxs)(f, {
    client: e,
    children: [
      (0, H.jsxs)(`div`, {
        className: `min-h-screen flex flex-col`,
        children: [
          (0, H.jsx)(Ml, {}),
          (0, H.jsx)(`main`, { className: `flex-1`, children: (0, H.jsx)(Xc, {}) }),
        ],
      }),
      (0, H.jsx)(np, {}),
      (0, H.jsx)(Mp, { richColors: !0, position: `top-center` }),
    ],
  });
}
var Rp = Rc(`/`)({
    beforeLoad: () => {
      throw Vt({ to: `/pos` });
    },
  }),
  zp = `modulepreload`,
  Bp = function (e) {
    return `/` + e;
  },
  Vp = {},
  Hp = function (e, t, n) {
    let r = Promise.resolve();
    if (t && t.length > 0) {
      let e = document.getElementsByTagName(`link`),
        i = document.querySelector(`meta[property=csp-nonce]`),
        a = i?.nonce || i?.getAttribute(`nonce`);
      function o(e) {
        return Promise.all(
          e.map((e) =>
            Promise.resolve(e).then(
              (e) => ({ status: `fulfilled`, value: e }),
              (e) => ({ status: `rejected`, reason: e }),
            ),
          ),
        );
      }
      function s(e) {
        return import.meta.resolve ? import.meta.resolve(e) : new URL(e, import.meta.url).href;
      }
      r = o(
        t.map((t) => {
          if (((t = Bp(t, n)), (t = s(t)), t in Vp)) return;
          Vp[t] = !0;
          let r = t.endsWith(`.css`);
          for (let n = e.length - 1; n >= 0; n--) {
            let i = e[n];
            if (i.href === t && (!r || i.rel === `stylesheet`)) return;
          }
          let i = document.createElement(`link`);
          if (
            ((i.rel = r ? `stylesheet` : zp),
            r || (i.as = `script`),
            (i.crossOrigin = ``),
            (i.href = t),
            a && i.setAttribute(`nonce`, a),
            document.head.appendChild(i),
            r)
          )
            return new Promise((e, n) => {
              (i.addEventListener(`load`, e),
                i.addEventListener(`error`, () => n(Error(`Unable to preload CSS for ${t}`))));
            });
        }),
      );
    }
    function i(e) {
      let t = new Event(`vite:preloadError`, { cancelable: !0 });
      if (((t.payload = e), window.dispatchEvent(t), !t.defaultPrevented)) throw e;
    }
    return r.then((t) => {
      for (let e of t || []) e.status === `rejected` && i(e.reason);
      return e().catch(i);
    });
  },
  Up = Rc(`/dashboard`)({
    head: () => ({
      meta: [
        { title: `Tableau de bord — Caisse POS` },
        {
          name: `description`,
          content: `Revenus, bénéfices et marge du jour, avec la tendance des 7 derniers jours.`,
        },
      ],
    }),
    component: zc(
      () => Hp(() => import(`./dashboard-Jubg6d8l.js`), __vite__mapDeps([0, 1, 2, 3, 4])),
      `component`,
    ),
  }),
  Wp = Rc(`/history`)({
    head: () => ({
      meta: [
        { title: `Historique des ventes — Caisse POS` },
        {
          name: `description`,
          content: `Toutes les ventes enregistrées, groupées par jour, avec annulation.`,
        },
      ],
    }),
    component: zc(
      () => Hp(() => import(`./history-C3ju-Ocw.js`), __vite__mapDeps([5, 1, 2, 3, 6, 7, 8, 9])),
      `component`,
    ),
  }),
  Gp = Rc(`/pos`)({
    head: () => ({
      meta: [
        { title: `Caisse — Nouvelle commande` },
        {
          name: `description`,
          content: `Prenez la commande, sélectionnez les articles et calculez la monnaie à rendre au client.`,
        },
      ],
    }),
    component: zc(
      () => Hp(() => import(`./pos-CyRt3juJ.js`), __vite__mapDeps([10, 1, 2, 3, 6, 11, 7, 12])),
      `component`,
    ),
  }),
  Kp = Rc(`/reports`)({
    head: () => ({
      meta: [
        { title: `Rapports & clôture — Caisse POS` },
        {
          name: `description`,
          content: `Analyse des ventes par période, revenus contre bénéfices, exports CSV, Excel et PDF.`,
        },
      ],
    }),
    component: zc(
      () =>
        Hp(
          () => import(`./reports-Y83M0DOW.js`),
          __vite__mapDeps([13, 1, 2, 3, 6, 14, 15, 4, 9, 12]),
        ),
      `component`,
    ),
  }),
  qp = Rc(`/stocks`)({
    head: () => ({
      meta: [
        { title: `Stocks & Produits — Caisse POS` },
        { name: `description`, content: `Ajoutez et gérez vos produits, prix et stocks.` },
      ],
    }),
    component: zc(
      () =>
        Hp(() => import(`./stocks-Bwz_jpSe.js`), __vite__mapDeps([16, 1, 2, 3, 6, 11, 7, 12, 8])),
      `component`,
    ),
  }),
  Jp = {
    IndexRoute: Rp.update({ id: `/`, path: `/`, getParentRoute: () => Fp }),
    DashboardRoute: Up.update({ id: `/dashboard`, path: `/dashboard`, getParentRoute: () => Fp }),
    HistoryRoute: Wp.update({ id: `/history`, path: `/history`, getParentRoute: () => Fp }),
    PosRoute: Gp.update({ id: `/pos`, path: `/pos`, getParentRoute: () => Fp }),
    ReportsRoute: Kp.update({ id: `/reports`, path: `/reports`, getParentRoute: () => Fp }),
    StocksRoute: qp.update({ id: `/stocks`, path: `/stocks`, getParentRoute: () => Fp }),
  },
  Yp = Fp._addFileChildren(Jp),
  Xp = () =>
    tl({
      routeTree: Yp,
      context: { queryClient: new xl() },
      scrollRestoration: !0,
      defaultPreloadStaleTime: 0,
    });
async function Zp() {
  let e = await Xp(),
    t;
  if (hl) {
    let n = await hl.getOptions();
    ((n.serializationAdapters = n.serializationAdapters ?? []),
      (window.__TSS_START_OPTIONS__ = n),
      (t = n.serializationAdapters),
      (e.options.defaultSsr = n.defaultSsr));
  } else ((t = []), (window.__TSS_START_OPTIONS__ = { serializationAdapters: t }));
  return (
    t.push(vs),
    e.options.serializationAdapters && t.push(...e.options.serializationAdapters),
    e.update({ basepath: ``, serializationAdapters: t }),
    e.stores.matchesId.get().length || (await xs(e)),
    e
  );
}
var Qp = Zp;
async function $p() {
  let e = await Qp();
  return (window.$_TSR?.h(), e);
}
var em;
function tm() {
  return (
    (em ||= $p()),
    (0, H.jsx)(Os, { promise: em, children: (e) => (0, H.jsx)(il, { router: e }) })
  );
}
var nm = w();
(0, V.startTransition)(() => {
  (0, nm.hydrateRoot)(document, (0, H.jsx)(V.StrictMode, { children: (0, H.jsx)(tm, {}) }));
});
export {
  Ol as A,
  Ql as C,
  zl as D,
  K as E,
  _l as F,
  jc as I,
  El as M,
  Tl as N,
  Al as O,
  wl as P,
  $l as S,
  Xl as T,
  uu as _,
  $f as a,
  nu as b,
  Jf as c,
  ed as d,
  Ku as f,
  fu as g,
  yu as h,
  Zf as i,
  Dl as j,
  kl as k,
  vf as l,
  Mu as m,
  _p as n,
  Qf as o,
  Gu as p,
  qf as r,
  ep as s,
  Hp as t,
  lf as u,
  su as v,
  Zl as w,
  eu as x,
  au as y,
};
