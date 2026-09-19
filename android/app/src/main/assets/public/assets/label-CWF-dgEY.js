import { r as e } from "./rolldown-runtime-QTnfLwEv.js";
import {
  E as t,
  M as n,
  P as r,
  T as i,
  a,
  b as o,
  d as s,
  h as c,
  j as l,
  r as u,
  t as d,
} from "./utils-7o9Ncrmj.js";
import { F as f, T as p, _ as m } from "./index-BJAoqMkh.js";
var h = class extends l {
    #e;
    #t = void 0;
    #n;
    #r;
    constructor(e, t) {
      (super(), (this.#e = e), this.setOptions(t), this.bindMethods(), this.#i());
    }
    bindMethods() {
      ((this.mutate = this.mutate.bind(this)), (this.reset = this.reset.bind(this)));
    }
    setOptions(e) {
      let t = this.options;
      ((this.options = this.#e.defaultMutationOptions(e)),
        i(this.options, t) ||
          this.#e
            .getMutationCache()
            .notify({ type: `observerOptionsUpdated`, mutation: this.#n, observer: this }),
        t?.mutationKey &&
        this.options.mutationKey &&
        c(t.mutationKey) !== c(this.options.mutationKey)
          ? this.reset()
          : this.#n?.state.status === `pending` && this.#n.setOptions(this.options));
    }
    onUnsubscribe() {
      this.hasListeners() || this.#n?.removeObserver(this);
    }
    onMutationUpdate(e) {
      (this.#i(), this.#a(e));
    }
    getCurrentResult() {
      return this.#t;
    }
    reset() {
      (this.#n?.removeObserver(this), (this.#n = void 0), this.#i(), this.#a());
    }
    mutate(e, t) {
      return (
        (this.#r = t),
        this.#n?.removeObserver(this),
        (this.#n = this.#e.getMutationCache().build(this.#e, this.options)),
        this.#n.addObserver(this),
        this.#n.execute(e)
      );
    }
    #i() {
      let e = this.#n?.state ?? f();
      this.#t = {
        ...e,
        isPending: e.status === `pending`,
        isSuccess: e.status === `success`,
        isError: e.status === `error`,
        isIdle: e.status === `idle`,
        mutate: this.mutate,
        reset: this.reset,
      };
    }
    #a(e) {
      s.batch(() => {
        if (this.#r && this.hasListeners()) {
          let t = this.#t.variables,
            n = this.#t.context,
            r = { client: this.#e, meta: this.options.meta, mutationKey: this.options.mutationKey };
          if (e?.type === `success`) {
            try {
              this.#r.onSuccess?.(e.data, t, n, r);
            } catch (e) {
              Promise.reject(e);
            }
            try {
              this.#r.onSettled?.(e.data, null, t, n, r);
            } catch (e) {
              Promise.reject(e);
            }
          } else if (e?.type === `error`) {
            try {
              this.#r.onError?.(e.error, t, n, r);
            } catch (e) {
              Promise.reject(e);
            }
            try {
              this.#r.onSettled?.(void 0, e.error, t, n, r);
            } catch (e) {
              Promise.reject(e);
            }
          }
        }
        this.listeners.forEach((e) => {
          e(this.#t);
        });
      });
    }
  },
  g = e(r(), 1);
function _(e, n) {
  let r = a(n),
    [i] = g.useState(() => new h(r, e));
  g.useEffect(() => {
    i.setOptions(e);
  }, [i, e]);
  let c = g.useSyncExternalStore(
      g.useCallback((e) => i.subscribe(s.batchCalls(e)), [i]),
      () => i.getCurrentResult(),
      () => i.getCurrentResult(),
    ),
    l = g.useCallback(
      (e, t) => {
        i.mutate(e, t).catch(o);
      },
      [i],
    );
  if (c.error && t(i.options.throwOnError, [c.error])) throw c.error;
  return { ...c, mutate: l, mutateAsync: c.mutate };
}
var v = u(`chevron-down`, [[`path`, { d: `m6 9 6 6 6-6`, key: `qrunsl` }]]),
  y = n(),
  b = g.forwardRef(({ className: e, type: t, ...n }, r) =>
    (0, y.jsx)(`input`, {
      type: t,
      className: d(
        `flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm`,
        e,
      ),
      ref: r,
      ...n,
    }),
  );
b.displayName = `Input`;
var x = `Label`,
  S = g.forwardRef((e, t) =>
    (0, y.jsx)(m.label, {
      ...e,
      ref: t,
      onMouseDown: (t) => {
        t.target.closest(`button, input, select, textarea`) ||
          (e.onMouseDown?.(t), !t.defaultPrevented && t.detail > 1 && t.preventDefault());
      },
    }),
  );
S.displayName = x;
var C = S,
  w = p(
    `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70`,
  ),
  T = g.forwardRef(({ className: e, ...t }, n) =>
    (0, y.jsx)(C, { ref: n, className: d(w(), e), ...t }),
  );
T.displayName = C.displayName;
export { _ as i, b as n, v as r, T as t };
