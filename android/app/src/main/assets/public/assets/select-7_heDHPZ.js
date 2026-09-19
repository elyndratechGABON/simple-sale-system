import { r as e } from "./rolldown-runtime-QTnfLwEv.js";
import { M as t, N as n, P as r, r as i, t as a } from "./utils-7o9Ncrmj.js";
import { r as o } from "./label-CWF-dgEY.js";
import { t as s } from "./chevron-up-BOu0KSCt.js";
import {
  D as c,
  E as l,
  S as u,
  _ as d,
  b as f,
  d as p,
  f as m,
  g as h,
  h as g,
  l as _,
  m as v,
  p as y,
  u as b,
  v as x,
  x as S,
  y as C,
} from "./index-BJAoqMkh.js";
import { a as w, c as T, i as E, n as D, r as O, s as k, t as A } from "./dist-BCEmwt1q.js";
var j = i(`check`, [[`path`, { d: `M20 6 9 17l-5-5`, key: `1gmf2c` }]]),
  ee = i(`plus`, [
    [`path`, { d: `M5 12h14`, key: `1ays0h` }],
    [`path`, { d: `M12 5v14`, key: `s699le` }],
  ]),
  te = i(`trash-2`, [
    [`path`, { d: `M10 11v6`, key: `nco0om` }],
    [`path`, { d: `M14 11v6`, key: `outv1u` }],
    [`path`, { d: `M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6`, key: `miytrc` }],
    [`path`, { d: `M3 6h18`, key: `d0wm0j` }],
    [`path`, { d: `M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2`, key: `e791ji` }],
  ]),
  M = e(r(), 1),
  N = e(n(), 1);
function P(e, [t, n]) {
  return Math.min(n, Math.max(t, e));
}
function F(e) {
  let t = M.useRef({ value: e, previous: e });
  return M.useMemo(
    () => (
      t.current.value !== e && ((t.current.previous = t.current.value), (t.current.value = e)),
      t.current.previous
    ),
    [e],
  );
}
var I = t(),
  L = Object.freeze({
    position: `absolute`,
    border: 0,
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: `hidden`,
    clip: `rect(0, 0, 0, 0)`,
    whiteSpace: `nowrap`,
    wordWrap: `normal`,
  }),
  R = `VisuallyHidden`,
  z = M.forwardRef((e, t) => (0, I.jsx)(d.span, { ...e, ref: t, style: { ...L, ...e.style } }));
z.displayName = R;
var B = [` `, `Enter`, `ArrowUp`, `ArrowDown`],
  V = [` `, `Enter`],
  H = `Select`,
  [U, W, ne] = T(H),
  [G, re] = S(H, [ne, w]),
  K = w(),
  [ie, q] = G(H),
  [ae, oe] = G(H),
  se = `SelectProvider`;
function ce(e) {
  let {
      __scopeSelect: t,
      children: n,
      open: r,
      defaultOpen: i,
      onOpenChange: a,
      value: o,
      defaultValue: s,
      onValueChange: c,
      dir: l,
      name: u,
      autoComplete: d,
      disabled: f,
      required: p,
      form: m,
      internal_do_not_use_render: h,
    } = e,
    g = K(t),
    [_, v] = M.useState(null),
    [y, b] = M.useState(null),
    [S, w] = M.useState(!1),
    T = k(l),
    [D, O] = x({ prop: r, defaultProp: i ?? !1, onChange: a, caller: H }),
    [A, j] = x({ prop: o, defaultProp: s, onChange: c, caller: H }),
    ee = M.useRef(null),
    te = M.useRef(A);
  M.useEffect(() => {
    let e = m ? _?.ownerDocument.getElementById(m) : _?.form;
    if (e instanceof HTMLFormElement) {
      let t = () => j(te.current);
      return (e.addEventListener(`reset`, t), () => e.removeEventListener(`reset`, t));
    }
  }, [m, _, j]);
  let N = !_ || !!m || !!_.closest(`form`),
    [P, F] = M.useState(new Set()),
    L = C(),
    R = Array.from(P)
      .map((e) => e.props.value)
      .join(`;`),
    z = M.useCallback((e) => {
      F((t) => new Set(t).add(e));
    }, []),
    B = M.useCallback((e) => {
      F((t) => {
        let n = new Set(t);
        return (n.delete(e), n);
      });
    }, []),
    V = {
      required: p,
      trigger: _,
      onTriggerChange: v,
      valueNode: y,
      onValueNodeChange: b,
      valueNodeHasChildren: S,
      onValueNodeHasChildrenChange: w,
      contentId: L,
      value: A,
      onValueChange: j,
      open: D,
      onOpenChange: O,
      dir: T,
      triggerPointerDownPosRef: ee,
      disabled: f,
      name: u,
      autoComplete: d,
      form: m,
      nativeOptions: P,
      nativeSelectKey: R,
      isFormControl: N,
    };
  return (0, I.jsx)(E, {
    ...g,
    children: (0, I.jsx)(ie, {
      scope: t,
      ...V,
      children: (0, I.jsx)(U.Provider, {
        scope: t,
        children: (0, I.jsx)(ae, {
          scope: t,
          onNativeOptionAdd: z,
          onNativeOptionRemove: B,
          children: rt(h) ? h(V) : n,
        }),
      }),
    }),
  });
}
ce.displayName = se;
var le = (e) => {
  let { __scopeSelect: t, children: n, ...r } = e;
  return (0, I.jsx)(ce, {
    __scopeSelect: t,
    ...r,
    internal_do_not_use_render: ({ isFormControl: e }) =>
      (0, I.jsxs)(I.Fragment, { children: [n, e ? (0, I.jsx)(nt, { __scopeSelect: t }) : null] }),
  });
};
le.displayName = H;
var ue = `SelectTrigger`,
  de = M.forwardRef((e, t) => {
    let { __scopeSelect: n, disabled: r = !1, ...i } = e,
      a = K(n),
      o = q(ue, n),
      s = o.disabled || r,
      l = c(t, o.onTriggerChange),
      f = W(n),
      p = M.useRef(`touch`),
      [m, h, g] = it((e) => {
        let t = f().filter((e) => !e.disabled),
          n = at(
            t,
            e,
            t.find((e) => e.value === o.value),
          );
        n !== void 0 && o.onValueChange(n.value);
      }),
      _ = (e) => {
        (s || (o.onOpenChange(!0), g()),
          e &&
            (o.triggerPointerDownPosRef.current = {
              x: Math.round(e.pageX),
              y: Math.round(e.pageY),
            }));
      };
    return (0, I.jsx)(A, {
      asChild: !0,
      ...a,
      children: (0, I.jsx)(d.button, {
        type: `button`,
        role: `combobox`,
        "aria-controls": o.open ? o.contentId : void 0,
        "aria-expanded": o.open,
        "aria-required": o.required,
        "aria-autocomplete": `none`,
        dir: o.dir,
        "data-state": o.open ? `open` : `closed`,
        disabled: s,
        "data-disabled": s ? `` : void 0,
        "data-placeholder": $(o.value) ? `` : void 0,
        ...i,
        ref: l,
        onClick: u(i.onClick, (e) => {
          (e.currentTarget.focus(), p.current !== `mouse` && _(e));
        }),
        onPointerDown: u(i.onPointerDown, (e) => {
          p.current = e.pointerType;
          let t = e.target;
          (t.hasPointerCapture(e.pointerId) && t.releasePointerCapture(e.pointerId),
            e.button === 0 &&
              e.ctrlKey === !1 &&
              e.pointerType === `mouse` &&
              (_(e), e.preventDefault()));
        }),
        onKeyDown: u(i.onKeyDown, (e) => {
          let t = m.current !== ``;
          (!(e.ctrlKey || e.altKey || e.metaKey) && e.key.length === 1 && h(e.key),
            !(t && e.key === ` `) && B.includes(e.key) && (_(), e.preventDefault()));
        }),
      }),
    });
  });
de.displayName = ue;
var fe = `SelectValue`,
  pe = M.forwardRef((e, t) => {
    let { __scopeSelect: n, className: r, style: i, children: a, placeholder: o = ``, ...s } = e,
      l = q(fe, n),
      { onValueNodeHasChildrenChange: u } = l,
      p = a !== void 0,
      m = c(t, l.onValueNodeChange);
    f(() => {
      u(p);
    }, [u, p]);
    let h = $(l.value);
    return (0, I.jsx)(d.span, {
      ...s,
      asChild: !h && s.asChild,
      ref: m,
      style: { pointerEvents: `none` },
      children: (0, I.jsx)(M.Fragment, { children: h ? o : a }, h ? `placeholder` : `value`),
    });
  });
pe.displayName = fe;
var me = `SelectIcon`,
  he = M.forwardRef((e, t) => {
    let { __scopeSelect: n, children: r, ...i } = e;
    return (0, I.jsx)(d.span, { "aria-hidden": !0, ...i, ref: t, children: r || `▼` });
  });
he.displayName = me;
var ge = `SelectPortal`,
  [_e, ve] = G(ge, { forceMount: void 0 }),
  ye = (e) => {
    let { __scopeSelect: t, forceMount: n, ...r } = e;
    return (0, I.jsx)(_e, {
      scope: e.__scopeSelect,
      forceMount: n,
      children: (0, I.jsx)(y, { asChild: !0, ...r }),
    });
  };
ye.displayName = ge;
var J = `SelectContent`,
  be = M.forwardRef((e, t) => {
    let n = ve(J, e.__scopeSelect),
      { forceMount: r = n.forceMount, ...i } = e,
      a = q(J, e.__scopeSelect),
      [o, s] = M.useState();
    return (
      f(() => {
        s(new DocumentFragment());
      }, []),
      (0, I.jsx)(m, {
        present: r || a.open,
        children: ({ present: e }) =>
          e ? (0, I.jsx)(Te, { ...i, ref: t }) : (0, I.jsx)(xe, { ...i, fragment: o }),
      })
    );
  });
be.displayName = J;
var xe = M.forwardRef((e, t) => {
  let { __scopeSelect: n, children: r, fragment: i } = e;
  return i
    ? N.createPortal(
        (0, I.jsx)(Se, {
          scope: n,
          children: (0, I.jsx)(U.Slot, {
            scope: n,
            children: (0, I.jsx)(`div`, { ref: t, children: r }),
          }),
        }),
        i,
      )
    : null;
});
xe.displayName = `SelectContentFragment`;
var Y = 10,
  [Se, X] = G(J),
  Ce = `SelectContentImpl`,
  we = l(`SelectContent.RemoveScroll`),
  Te = M.forwardRef((e, t) => {
    let { __scopeSelect: n } = e,
      {
        position: r = `item-aligned`,
        onCloseAutoFocus: i,
        onEscapeKeyDown: a,
        onPointerDownOutside: o,
        side: s,
        sideOffset: l,
        align: d,
        alignOffset: f,
        arrowPadding: m,
        collisionBoundary: h,
        collisionPadding: y,
        sticky: x,
        hideWhenDetached: S,
        avoidCollisions: C,
        ...w
      } = e,
      T = q(J, n),
      [E, D] = M.useState(null),
      [O, k] = M.useState(null),
      A = c(t, D),
      [j, ee] = M.useState(null),
      [te, N] = M.useState(null),
      P = W(n),
      [F, L] = M.useState(!1),
      R = M.useRef(!1);
    (M.useEffect(() => {
      if (E) return _(E);
    }, [E]),
      p());
    let z = M.useCallback(
        (e) => {
          let [t, ...n] = P().map((e) => e.ref.current),
            [r] = n.slice(-1),
            i = document.activeElement;
          for (let n of e)
            if (
              n === i ||
              (n?.scrollIntoView({ block: `nearest` }),
              n === t && O && (O.scrollTop = 0),
              n === r && O && (O.scrollTop = O.scrollHeight),
              n?.focus(),
              document.activeElement !== i)
            )
              return;
        },
        [P, O],
      ),
      B = M.useCallback(() => z([j, E]), [z, j, E]);
    M.useEffect(() => {
      F && B();
    }, [F, B]);
    let { onOpenChange: V, triggerPointerDownPosRef: H } = T;
    (M.useEffect(() => {
      if (E) {
        let e = { x: 0, y: 0 },
          t = (t) => {
            e = {
              x: Math.abs(Math.round(t.pageX) - (H.current?.x ?? 0)),
              y: Math.abs(Math.round(t.pageY) - (H.current?.y ?? 0)),
            };
          },
          n = (n) => {
            (e.x <= 10 && e.y <= 10 ? n.preventDefault() : n.composedPath().includes(E) || V(!1),
              document.removeEventListener(`pointermove`, t),
              (H.current = null));
          };
        return (
          H.current !== null &&
            (document.addEventListener(`pointermove`, t),
            document.addEventListener(`pointerup`, n, { capture: !0, once: !0 })),
          () => {
            (document.removeEventListener(`pointermove`, t),
              document.removeEventListener(`pointerup`, n, { capture: !0 }));
          }
        );
      }
    }, [E, V, H]),
      M.useEffect(() => {
        let e = () => V(!1);
        return (
          window.addEventListener(`blur`, e),
          window.addEventListener(`resize`, e),
          () => {
            (window.removeEventListener(`blur`, e), window.removeEventListener(`resize`, e));
          }
        );
      }, [V]));
    let [U, ne] = it((e) => {
        let t = P().filter((e) => !e.disabled),
          n = at(
            t,
            e,
            t.find((e) => e.ref.current === document.activeElement),
          );
        n && setTimeout(() => n.ref.current?.focus());
      }),
      G = M.useCallback(
        (e, t, n) => {
          let r = !R.current && !n;
          ((T.value !== void 0 && T.value === t) || r) && (ee(e), r && (R.current = !0));
        },
        [T.value],
      ),
      re = M.useCallback(() => E?.focus(), [E]),
      K = M.useCallback(
        (e, t, n) => {
          let r = !R.current && !n;
          ((T.value !== void 0 && T.value === t) || r) && N(e);
        },
        [T.value],
      ),
      ie = r === `popper` ? ke : De,
      ae =
        ie === ke
          ? {
              side: s,
              sideOffset: l,
              align: d,
              alignOffset: f,
              arrowPadding: m,
              collisionBoundary: h,
              collisionPadding: y,
              sticky: x,
              hideWhenDetached: S,
              avoidCollisions: C,
            }
          : {};
    return (0, I.jsx)(Se, {
      scope: n,
      content: E,
      viewport: O,
      onViewportChange: k,
      itemRefCallback: G,
      selectedItem: j,
      onItemLeave: re,
      itemTextRefCallback: K,
      focusSelectedItem: B,
      selectedItemText: te,
      position: r,
      isPositioned: F,
      searchRef: U,
      children: (0, I.jsx)(b, {
        as: we,
        allowPinchZoom: !0,
        children: (0, I.jsx)(v, {
          asChild: !0,
          trapped: T.open,
          onMountAutoFocus: (e) => {
            e.preventDefault();
          },
          onUnmountAutoFocus: u(i, (e) => {
            (T.trigger?.focus({ preventScroll: !0 }), e.preventDefault());
          }),
          children: (0, I.jsx)(g, {
            asChild: !0,
            disableOutsidePointerEvents: !0,
            onEscapeKeyDown: a,
            onPointerDownOutside: o,
            onFocusOutside: (e) => e.preventDefault(),
            onDismiss: () => T.onOpenChange(!1),
            children: (0, I.jsx)(ie, {
              role: `listbox`,
              id: T.contentId,
              "data-state": T.open ? `open` : `closed`,
              dir: T.dir,
              onContextMenu: (e) => e.preventDefault(),
              ...w,
              ...ae,
              onPlaced: () => L(!0),
              ref: A,
              style: { display: `flex`, flexDirection: `column`, outline: `none`, ...w.style },
              onKeyDown: u(w.onKeyDown, (e) => {
                let t = e.ctrlKey || e.altKey || e.metaKey;
                if (
                  (e.key === `Tab` && e.preventDefault(),
                  !t && e.key.length === 1 && ne(e.key),
                  [`ArrowUp`, `ArrowDown`, `Home`, `End`].includes(e.key))
                ) {
                  let t = P()
                    .filter((e) => !e.disabled)
                    .map((e) => e.ref.current);
                  if (
                    ([`ArrowUp`, `End`].includes(e.key) && (t = t.slice().reverse()),
                    [`ArrowUp`, `ArrowDown`].includes(e.key))
                  ) {
                    let n = e.target,
                      r = t.indexOf(n);
                    t = t.slice(r + 1);
                  }
                  (setTimeout(() => z(t)), e.preventDefault());
                }
              }),
            }),
          }),
        }),
      }),
    });
  });
Te.displayName = Ce;
var Ee = `SelectItemAlignedPosition`,
  De = M.forwardRef((e, t) => {
    let { __scopeSelect: n, onPlaced: r, ...i } = e,
      a = q(J, n),
      o = X(J, n),
      [s, l] = M.useState(null),
      [u, p] = M.useState(null),
      m = c(t, p),
      h = W(n),
      g = M.useRef(!1),
      _ = M.useRef(!0),
      { viewport: v, selectedItem: y, selectedItemText: b, focusSelectedItem: x } = o,
      S = M.useCallback(() => {
        if (a.trigger && a.valueNode && s && u && v && y && b) {
          let e = a.trigger.getBoundingClientRect(),
            t = u.getBoundingClientRect(),
            n = a.valueNode.getBoundingClientRect(),
            i = b.getBoundingClientRect();
          if (a.dir !== `rtl`) {
            let r = i.left - t.left,
              a = n.left - r,
              o = e.left - a,
              c = e.width + o,
              l = Math.max(c, t.width),
              u = window.innerWidth - Y,
              d = P(a, [Y, Math.max(Y, u - l)]);
            ((s.style.minWidth = c + `px`), (s.style.left = d + `px`));
          } else {
            let r = t.right - i.right,
              a = window.innerWidth - n.right - r,
              o = window.innerWidth - e.right - a,
              c = e.width + o,
              l = Math.max(c, t.width),
              u = window.innerWidth - Y,
              d = P(a, [Y, Math.max(Y, u - l)]);
            ((s.style.minWidth = c + `px`), (s.style.right = d + `px`));
          }
          let o = h(),
            c = window.innerHeight - Y * 2,
            l = v.scrollHeight,
            d = window.getComputedStyle(u),
            f = parseInt(d.borderTopWidth, 10),
            p = parseInt(d.paddingTop, 10),
            m = parseInt(d.borderBottomWidth, 10),
            _ = parseInt(d.paddingBottom, 10),
            x = f + p + l + _ + m,
            S = Math.min(y.offsetHeight * 5, x),
            C = window.getComputedStyle(v),
            w = parseInt(C.paddingTop, 10),
            T = parseInt(C.paddingBottom, 10),
            E = e.top + e.height / 2 - Y,
            D = c - E,
            O = y.offsetHeight / 2,
            k = y.offsetTop + O,
            A = f + p + k,
            j = x - A;
          if (A <= E) {
            let e = o.length > 0 && y === o[o.length - 1].ref.current;
            s.style.bottom = `0px`;
            let t = u.clientHeight - v.offsetTop - v.offsetHeight,
              n = A + Math.max(D, O + (e ? T : 0) + t + m);
            s.style.height = n + `px`;
          } else {
            let e = o.length > 0 && y === o[0].ref.current;
            s.style.top = `0px`;
            let t = Math.max(E, f + v.offsetTop + (e ? w : 0) + O) + j;
            ((s.style.height = t + `px`), (v.scrollTop = A - E + v.offsetTop));
          }
          ((s.style.margin = `${Y}px 0`),
            (s.style.minHeight = S + `px`),
            (s.style.maxHeight = c + `px`),
            r?.(),
            requestAnimationFrame(() => (g.current = !0)));
        }
      }, [h, a.trigger, a.valueNode, s, u, v, y, b, a.dir, r]);
    f(() => S(), [S]);
    let [C, w] = M.useState();
    return (
      f(() => {
        u && w(window.getComputedStyle(u).zIndex);
      }, [u]),
      (0, I.jsx)(Ae, {
        scope: n,
        contentWrapper: s,
        shouldExpandOnScrollRef: g,
        onScrollButtonChange: M.useCallback(
          (e) => {
            e && _.current === !0 && (S(), x?.(), (_.current = !1));
          },
          [S, x],
        ),
        children: (0, I.jsx)(`div`, {
          ref: l,
          style: { display: `flex`, flexDirection: `column`, position: `fixed`, zIndex: C },
          children: (0, I.jsx)(d.div, {
            ...i,
            ref: m,
            style: { boxSizing: `border-box`, maxHeight: `100%`, ...i.style },
          }),
        }),
      })
    );
  });
De.displayName = Ee;
var Oe = `SelectPopperPosition`,
  ke = M.forwardRef((e, t) => {
    let { __scopeSelect: n, align: r = `start`, collisionPadding: i = Y, ...a } = e,
      o = K(n);
    return (0, I.jsx)(O, {
      ...o,
      ...a,
      ref: t,
      align: r,
      collisionPadding: i,
      style: {
        boxSizing: `border-box`,
        ...a.style,
        "--radix-select-content-transform-origin": `var(--radix-popper-transform-origin)`,
        "--radix-select-content-available-width": `var(--radix-popper-available-width)`,
        "--radix-select-content-available-height": `var(--radix-popper-available-height)`,
        "--radix-select-trigger-width": `var(--radix-popper-anchor-width)`,
        "--radix-select-trigger-height": `var(--radix-popper-anchor-height)`,
      },
    });
  });
ke.displayName = Oe;
var [Ae, je] = G(J, {}),
  Me = `SelectViewport`,
  Ne = M.forwardRef((e, t) => {
    let { __scopeSelect: n, nonce: r, ...i } = e,
      a = X(Me, n),
      o = je(Me, n),
      s = c(t, a.onViewportChange),
      l = M.useRef(0);
    return (0, I.jsxs)(I.Fragment, {
      children: [
        (0, I.jsx)(`style`, {
          dangerouslySetInnerHTML: {
            __html: `[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}`,
          },
          nonce: r,
        }),
        (0, I.jsx)(U.Slot, {
          scope: n,
          children: (0, I.jsx)(d.div, {
            "data-radix-select-viewport": ``,
            role: `presentation`,
            ...i,
            ref: s,
            style: { position: `relative`, flex: 1, overflow: `hidden auto`, ...i.style },
            onScroll: u(i.onScroll, (e) => {
              let t = e.currentTarget,
                { contentWrapper: n, shouldExpandOnScrollRef: r } = o;
              if (r?.current && n) {
                let e = Math.abs(l.current - t.scrollTop);
                if (e > 0) {
                  let r = window.innerHeight - Y * 2,
                    i = parseFloat(n.style.minHeight),
                    a = parseFloat(n.style.height),
                    o = Math.max(i, a);
                  if (o < r) {
                    let i = o + e,
                      a = Math.min(r, i),
                      s = i - a;
                    ((n.style.height = a + `px`),
                      n.style.bottom === `0px` &&
                        ((t.scrollTop = s > 0 ? s : 0), (n.style.justifyContent = `flex-end`)));
                  }
                }
              }
              l.current = t.scrollTop;
            }),
          }),
        }),
      ],
    });
  });
Ne.displayName = Me;
var Pe = `SelectGroup`,
  [Fe, Ie] = G(Pe),
  Le = M.forwardRef((e, t) => {
    let { __scopeSelect: n, ...r } = e,
      i = C();
    return (0, I.jsx)(Fe, {
      scope: n,
      id: i,
      children: (0, I.jsx)(d.div, { role: `group`, "aria-labelledby": i, ...r, ref: t }),
    });
  });
Le.displayName = Pe;
var Re = `SelectLabel`,
  ze = M.forwardRef((e, t) => {
    let { __scopeSelect: n, ...r } = e,
      i = Ie(Re, n);
    return (0, I.jsx)(d.div, { id: i.id, ...r, ref: t });
  });
ze.displayName = Re;
var Z = `SelectItem`,
  [Be, Ve] = G(Z),
  He = M.forwardRef((e, t) => {
    let { __scopeSelect: n, value: r, disabled: i = !1, textValue: a, ...o } = e,
      s = q(Z, n),
      l = X(Z, n),
      f = s.value === r,
      [p, m] = M.useState(a ?? ``),
      [g, _] = M.useState(!1),
      v = c(
        t,
        h((e) => l.itemRefCallback?.(e, r, i)),
      ),
      y = C(),
      b = M.useRef(`touch`),
      x = () => {
        i || (s.onValueChange(r), s.onOpenChange(!1));
      };
    return (0, I.jsx)(Be, {
      scope: n,
      value: r,
      disabled: i,
      textId: y,
      isSelected: f,
      onItemTextChange: M.useCallback((e) => {
        m((t) => t || (e?.textContent ?? ``).trim());
      }, []),
      children: (0, I.jsx)(U.ItemSlot, {
        scope: n,
        value: r,
        disabled: i,
        textValue: p,
        children: (0, I.jsx)(d.div, {
          role: `option`,
          "aria-labelledby": y,
          "data-highlighted": g ? `` : void 0,
          "aria-selected": f && g,
          "data-state": f ? `checked` : `unchecked`,
          "aria-disabled": i || void 0,
          "data-disabled": i ? `` : void 0,
          tabIndex: i ? void 0 : -1,
          ...o,
          ref: v,
          onFocus: u(o.onFocus, () => _(!0)),
          onBlur: u(o.onBlur, () => _(!1)),
          onClick: u(o.onClick, () => {
            b.current !== `mouse` && x();
          }),
          onPointerUp: u(o.onPointerUp, () => {
            b.current === `mouse` && x();
          }),
          onPointerDown: u(o.onPointerDown, (e) => {
            b.current = e.pointerType;
          }),
          onPointerMove: u(o.onPointerMove, (e) => {
            ((b.current = e.pointerType),
              i
                ? l.onItemLeave?.()
                : b.current === `mouse` && e.currentTarget.focus({ preventScroll: !0 }));
          }),
          onPointerLeave: u(o.onPointerLeave, (e) => {
            e.currentTarget === document.activeElement && l.onItemLeave?.();
          }),
          onKeyDown: u(o.onKeyDown, (e) => {
            i ||
              e.target !== e.currentTarget ||
              (l.searchRef?.current !== `` && e.key === ` `) ||
              (V.includes(e.key) && x(), e.key === ` ` && e.preventDefault());
          }),
        }),
      }),
    });
  });
He.displayName = Z;
var Q = `SelectItemText`,
  Ue = M.forwardRef((e, t) => {
    let { __scopeSelect: n, className: r, style: i, ...a } = e,
      o = q(Q, n),
      s = X(Q, n),
      l = Ve(Q, n),
      u = oe(Q, n),
      [p, m] = M.useState(null),
      g = h((e) => s.itemTextRefCallback?.(e, l.value, l.disabled)),
      _ = c(t, m, l.onItemTextChange, g),
      v = p?.textContent,
      y = M.useMemo(
        () => (0, I.jsx)(`option`, { value: l.value, disabled: l.disabled, children: v }, l.value),
        [l.disabled, l.value, v],
      ),
      { onNativeOptionAdd: b, onNativeOptionRemove: x } = u;
    return (
      f(() => (b(y), () => x(y)), [b, x, y]),
      (0, I.jsxs)(I.Fragment, {
        children: [
          (0, I.jsx)(d.span, { id: l.textId, ...a, ref: _ }),
          l.isSelected && o.valueNode && !o.valueNodeHasChildren && !$(o.value)
            ? N.createPortal(a.children, o.valueNode)
            : null,
        ],
      })
    );
  });
Ue.displayName = Q;
var We = `SelectItemIndicator`,
  Ge = M.forwardRef((e, t) => {
    let { __scopeSelect: n, ...r } = e;
    return Ve(We, n).isSelected ? (0, I.jsx)(d.span, { "aria-hidden": !0, ...r, ref: t }) : null;
  });
Ge.displayName = We;
var Ke = `SelectScrollUpButton`,
  qe = M.forwardRef((e, t) => {
    let n = X(Ke, e.__scopeSelect),
      r = je(Ke, e.__scopeSelect),
      [i, a] = M.useState(!1),
      o = c(t, r.onScrollButtonChange);
    return (
      f(() => {
        if (n.viewport && n.isPositioned) {
          let e = function () {
              let e = t.scrollTop > 0;
              a(e);
            },
            t = n.viewport;
          return (e(), t.addEventListener(`scroll`, e), () => t.removeEventListener(`scroll`, e));
        }
      }, [n.viewport, n.isPositioned]),
      i
        ? (0, I.jsx)(Xe, {
            ...e,
            ref: o,
            onAutoScroll: () => {
              let { viewport: e, selectedItem: t } = n;
              e && t && (e.scrollTop -= t.offsetHeight);
            },
          })
        : null
    );
  });
qe.displayName = Ke;
var Je = `SelectScrollDownButton`,
  Ye = M.forwardRef((e, t) => {
    let n = X(Je, e.__scopeSelect),
      r = je(Je, e.__scopeSelect),
      [i, a] = M.useState(!1),
      o = c(t, r.onScrollButtonChange);
    return (
      f(() => {
        if (n.viewport && n.isPositioned) {
          let e = function () {
              let e = t.scrollHeight - t.clientHeight,
                n = Math.ceil(t.scrollTop) < e;
              a(n);
            },
            t = n.viewport;
          return (e(), t.addEventListener(`scroll`, e), () => t.removeEventListener(`scroll`, e));
        }
      }, [n.viewport, n.isPositioned]),
      i
        ? (0, I.jsx)(Xe, {
            ...e,
            ref: o,
            onAutoScroll: () => {
              let { viewport: e, selectedItem: t } = n;
              e && t && (e.scrollTop += t.offsetHeight);
            },
          })
        : null
    );
  });
Ye.displayName = Je;
var Xe = M.forwardRef((e, t) => {
    let { __scopeSelect: n, onAutoScroll: r, ...i } = e,
      a = X(`SelectScrollButton`, n),
      o = M.useRef(null),
      s = W(n),
      c = M.useCallback(() => {
        o.current !== null && (window.clearInterval(o.current), (o.current = null));
      }, []);
    return (
      M.useEffect(() => () => c(), [c]),
      f(() => {
        s()
          .find((e) => e.ref.current === document.activeElement)
          ?.ref.current?.scrollIntoView({ block: `nearest` });
      }, [s]),
      (0, I.jsx)(d.div, {
        "aria-hidden": !0,
        ...i,
        ref: t,
        style: { flexShrink: 0, ...i.style },
        onPointerDown: u(i.onPointerDown, () => {
          o.current === null && (o.current = window.setInterval(r, 50));
        }),
        onPointerMove: u(i.onPointerMove, () => {
          (a.onItemLeave?.(), o.current === null && (o.current = window.setInterval(r, 50)));
        }),
        onPointerLeave: u(i.onPointerLeave, () => {
          c();
        }),
      })
    );
  }),
  Ze = `SelectSeparator`,
  Qe = M.forwardRef((e, t) => {
    let { __scopeSelect: n, ...r } = e;
    return (0, I.jsx)(d.div, { "aria-hidden": !0, ...r, ref: t });
  });
Qe.displayName = Ze;
var $e = `SelectArrow`,
  et = M.forwardRef((e, t) => {
    let { __scopeSelect: n, ...r } = e,
      i = K(n);
    return X($e, n).position === `popper` ? (0, I.jsx)(D, { ...i, ...r, ref: t }) : null;
  });
et.displayName = $e;
var tt = `SelectBubbleInput`,
  nt = M.forwardRef(({ __scopeSelect: e, ...t }, n) => {
    let r = q(tt, e),
      {
        value: i,
        onValueChange: a,
        required: o,
        disabled: s,
        name: l,
        autoComplete: u,
        form: f,
      } = r,
      { nativeOptions: p, nativeSelectKey: m } = r,
      h = M.useRef(null),
      g = c(n, h),
      _ = i ?? ``,
      v = F(_),
      y = Array.from(p).some((e) => (e.props.value ?? ``) === ``);
    return (
      M.useEffect(() => {
        let e = h.current;
        if (!e) return;
        let t = window.HTMLSelectElement.prototype,
          n = Object.getOwnPropertyDescriptor(t, `value`).set;
        if (v !== _ && n) {
          let t = new Event(`change`, { bubbles: !0 });
          (n.call(e, _), e.dispatchEvent(t));
        }
      }, [v, _]),
      (0, I.jsxs)(
        d.select,
        {
          "aria-hidden": !0,
          required: o,
          tabIndex: -1,
          name: l,
          autoComplete: u,
          disabled: s,
          form: f,
          onChange: (e) => a(e.target.value),
          ...t,
          style: { ...L, ...t.style },
          ref: g,
          defaultValue: _,
          children: [$(i) && !y ? (0, I.jsx)(`option`, { value: `` }) : null, Array.from(p)],
        },
        m,
      )
    );
  });
nt.displayName = tt;
function rt(e) {
  return typeof e == `function`;
}
function $(e) {
  return e === `` || e === void 0;
}
function it(e) {
  let t = h(e),
    n = M.useRef(``),
    r = M.useRef(0),
    i = M.useCallback(
      (e) => {
        let i = n.current + e;
        (t(i),
          (function e(t) {
            ((n.current = t),
              window.clearTimeout(r.current),
              t !== `` && (r.current = window.setTimeout(() => e(``), 1e3)));
          })(i));
      },
      [t],
    ),
    a = M.useCallback(() => {
      ((n.current = ``), window.clearTimeout(r.current));
    }, []);
  return (M.useEffect(() => () => window.clearTimeout(r.current), []), [n, i, a]);
}
function at(e, t, n) {
  let r = t.length > 1 && Array.from(t).every((e) => e === t[0]) ? t[0] : t,
    i = n ? e.indexOf(n) : -1,
    a = ot(e, Math.max(i, 0));
  r.length === 1 && (a = a.filter((e) => e !== n));
  let o = a.find((e) => e.textValue.toLowerCase().startsWith(r.toLowerCase()));
  return o === n ? void 0 : o;
}
function ot(e, t) {
  return e.map((n, r) => e[(t + r) % e.length]);
}
var st = le,
  ct = pe,
  lt = M.forwardRef(({ className: e, children: t, ...n }, r) =>
    (0, I.jsxs)(de, {
      ref: r,
      className: a(
        `flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1`,
        e,
      ),
      ...n,
      children: [
        t,
        (0, I.jsx)(he, {
          asChild: !0,
          children: (0, I.jsx)(o, { className: `h-4 w-4 opacity-50` }),
        }),
      ],
    }),
  );
lt.displayName = de.displayName;
var ut = M.forwardRef(({ className: e, ...t }, n) =>
  (0, I.jsx)(qe, {
    ref: n,
    className: a(`flex cursor-default items-center justify-center py-1`, e),
    ...t,
    children: (0, I.jsx)(s, { className: `h-4 w-4` }),
  }),
);
ut.displayName = qe.displayName;
var dt = M.forwardRef(({ className: e, ...t }, n) =>
  (0, I.jsx)(Ye, {
    ref: n,
    className: a(`flex cursor-default items-center justify-center py-1`, e),
    ...t,
    children: (0, I.jsx)(o, { className: `h-4 w-4` }),
  }),
);
dt.displayName = Ye.displayName;
var ft = M.forwardRef(({ className: e, children: t, position: n = `popper`, ...r }, i) =>
  (0, I.jsx)(ye, {
    children: (0, I.jsxs)(be, {
      ref: i,
      className: a(
        `relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)`,
        n === `popper` &&
          `data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1`,
        e,
      ),
      position: n,
      ...r,
      children: [
        (0, I.jsx)(ut, {}),
        (0, I.jsx)(Ne, {
          className: a(
            `p-1`,
            n === `popper` &&
              `h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]`,
          ),
          children: t,
        }),
        (0, I.jsx)(dt, {}),
      ],
    }),
  }),
);
ft.displayName = be.displayName;
var pt = M.forwardRef(({ className: e, ...t }, n) =>
  (0, I.jsx)(ze, { ref: n, className: a(`px-2 py-1.5 text-sm font-semibold`, e), ...t }),
);
pt.displayName = ze.displayName;
var mt = M.forwardRef(({ className: e, children: t, ...n }, r) =>
  (0, I.jsxs)(He, {
    ref: r,
    className: a(
      `relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50`,
      e,
    ),
    ...n,
    children: [
      (0, I.jsx)(`span`, {
        className: `absolute right-2 flex h-3.5 w-3.5 items-center justify-center`,
        children: (0, I.jsx)(Ge, { children: (0, I.jsx)(j, { className: `h-4 w-4` }) }),
      }),
      (0, I.jsx)(Ue, { children: t }),
    ],
  }),
);
mt.displayName = He.displayName;
var ht = M.forwardRef(({ className: e, ...t }, n) =>
  (0, I.jsx)(Qe, { ref: n, className: a(`-mx-1 my-1 h-px bg-muted`, e), ...t }),
);
ht.displayName = Qe.displayName;
export { ct as a, ee as c, lt as i, j as l, ft as n, F as o, mt as r, te as s, st as t };
