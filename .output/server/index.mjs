globalThis.__nitro_main__ = import.meta.url;
import { a as FastResponse, n as HTTPError, r as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/apple-touch-icon.png": {
		"type": "image/png",
		"etag": "\"f41-qPcm/ZGFkVyjsNNNeuZBfEZ94og\"",
		"mtime": "2026-07-31T20:13:13.794Z",
		"size": 3905,
		"path": "../public/apple-touch-icon.png"
	},
	"/icon-192-maskable.png": {
		"type": "image/png",
		"etag": "\"b2a-cDJXNWRl9sboxqrD3f8Qf4WKvRY\"",
		"mtime": "2026-07-31T20:13:13.790Z",
		"size": 2858,
		"path": "../public/icon-192-maskable.png"
	},
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"a62-6NosiS2H+HE9WOR/p0HgeMz2HhQ\"",
		"mtime": "2026-07-31T20:13:13.856Z",
		"size": 2658,
		"path": "../public/favicon.ico"
	},
	"/icon-192.png": {
		"type": "image/png",
		"etag": "\"104e-haCNO8hZPCTGSXoL7ZTi4j/jMnE\"",
		"mtime": "2026-07-31T20:13:13.776Z",
		"size": 4174,
		"path": "../public/icon-192.png"
	},
	"/icon-512-maskable.png": {
		"type": "image/png",
		"etag": "\"1e90-gQIGeliy800S13fnNdn2MYimGYc\"",
		"mtime": "2026-07-31T20:13:13.787Z",
		"size": 7824,
		"path": "../public/icon-512-maskable.png"
	},
	"/icon-512.png": {
		"type": "image/png",
		"etag": "\"2bb3-Hp2OvQnnkfJpVIqYbaWp1wgNoN0\"",
		"mtime": "2026-07-31T20:13:13.761Z",
		"size": 11187,
		"path": "../public/icon-512.png"
	},
	"/manifest.webmanifest": {
		"type": "application/manifest+json",
		"etag": "\"2e9-hw8cchN5Zd/vEyNOPCF/RR59WNw\"",
		"mtime": "2026-07-31T20:12:30.729Z",
		"size": 745,
		"path": "../public/manifest.webmanifest"
	},
	"/sw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1134-M9qLsXIqmlre/zJAs95L8ZgG+kE\"",
		"mtime": "2026-08-01T16:59:42.865Z",
		"size": 4404,
		"path": "../public/sw.js"
	},
	"/assets/badge-B8l6FXo_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30d-WKr1oEB6sKI1x3/2oG97Jyfa3m4\"",
		"mtime": "2026-08-01T17:16:55.699Z",
		"size": 781,
		"path": "../public/assets/badge-B8l6FXo_.js"
	},
	"/assets/card-DuO_HDnN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c94-cF+GW5E0xIix9brXLRcqICBUXvI\"",
		"mtime": "2026-08-01T17:16:55.701Z",
		"size": 3220,
		"path": "../public/assets/card-DuO_HDnN.js"
	},
	"/assets/chevron-up-DzaMO9iZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"76-ph2/vLeRzqM1ucH+cFI9sV2ztbs\"",
		"mtime": "2026-08-01T17:16:55.703Z",
		"size": 118,
		"path": "../public/assets/chevron-up-DzaMO9iZ.js"
	},
	"/assets/dist-B0to2yja.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6d0b-ADG47qYf6iRjrRsNsVhVQnMoGbc\"",
		"mtime": "2026-08-01T17:16:55.704Z",
		"size": 27915,
		"path": "../public/assets/dist-B0to2yja.js"
	},
	"/assets/esm-CqaVpT90.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"534-6EjwpIKxvsAol9ATHkKlwQFzqIE\"",
		"mtime": "2026-08-01T17:16:55.706Z",
		"size": 1332,
		"path": "../public/assets/esm-CqaVpT90.js"
	},
	"/assets/expenses-C3nsrLhL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"919d-XxIjbsyvZssUUjmCk0grFzwBKz4\"",
		"mtime": "2026-08-01T17:16:55.708Z",
		"size": 37277,
		"path": "../public/assets/expenses-C3nsrLhL.js"
	},
	"/assets/format-CoHTvD_W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3c2-x9EQK7BFUSohm04kofdUMWNYhe0\"",
		"mtime": "2026-08-01T17:16:55.709Z",
		"size": 962,
		"path": "../public/assets/format-CoHTvD_W.js"
	},
	"/assets/history-9uMYgack.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105d-pCtNMBYmBsZbzSoE5UwTTooTPgs\"",
		"mtime": "2026-08-01T17:16:55.711Z",
		"size": 4189,
		"path": "../public/assets/history-9uMYgack.js"
	},
	"/assets/html2canvas-CshxQvNN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b8d-nt1FVLhcCKhaGHjxZjLX/QCcQ60\"",
		"mtime": "2026-08-01T17:16:55.712Z",
		"size": 199565,
		"path": "../public/assets/html2canvas-CshxQvNN.js"
	},
	"/assets/pin-DZXMeoF4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e5-MoYkNCTub790ujQNci9kRaC2Gio\"",
		"mtime": "2026-08-01T17:16:55.716Z",
		"size": 229,
		"path": "../public/assets/pin-DZXMeoF4.js"
	},
	"/assets/pos-BFsBQm_S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c32-/H3T/O+ZFoFCgR5MJQI5Pa7ZF1M\"",
		"mtime": "2026-08-01T17:16:55.717Z",
		"size": 11314,
		"path": "../public/assets/pos-BFsBQm_S.js"
	},
	"/assets/index.es-DCvMcLJC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f45-GJz/6EQZwn/GVLHcSaepD1ZxmdE\"",
		"mtime": "2026-08-01T17:16:55.714Z",
		"size": 151365,
		"path": "../public/assets/index.es-DCvMcLJC.js"
	},
	"/assets/rolldown-runtime-CNC7AqOf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"36f-poL7VEo+W3rlEpE8cNtjWDVI11g\"",
		"mtime": "2026-08-01T17:16:55.722Z",
		"size": 879,
		"path": "../public/assets/rolldown-runtime-CNC7AqOf.js"
	},
	"/assets/purify.es-DuRL7t6i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68ff-UzqdquwlS23jMr/0lDNWmxy5AL0\"",
		"mtime": "2026-08-01T17:16:55.718Z",
		"size": 26879,
		"path": "../public/assets/purify.es-DuRL7t6i.js"
	},
	"/assets/select-CVT3XQXs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5889-zSNMtCR4r7Vz8oX+/lJ2890TL/8\"",
		"mtime": "2026-08-01T17:16:55.724Z",
		"size": 22665,
		"path": "../public/assets/select-CVT3XQXs.js"
	},
	"/assets/reports-kb-Lhtc-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"eeb5b-zWRwPjbdYskMNosfE/0YlnvyoLQ\"",
		"mtime": "2026-08-01T17:16:55.721Z",
		"size": 977755,
		"path": "../public/assets/reports-kb-Lhtc-.js"
	},
	"/assets/index-BF_hwsSv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b9e05-Mw64Q6wiT1a6cc3mmlEWz4r9ToU\"",
		"mtime": "2026-08-01T17:16:55.695Z",
		"size": 761349,
		"path": "../public/assets/index-BF_hwsSv.js"
	},
	"/assets/StatCard-Cyf0UpuH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c95-QFA4+V27i4G/YvIG/HZjJYPdBo0\"",
		"mtime": "2026-08-01T17:16:55.697Z",
		"size": 3221,
		"path": "../public/assets/StatCard-Cyf0UpuH.js"
	},
	"/assets/settings-S1RJ0Va3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3770-boha3yfYXoleYyIZw243/avd1dA\"",
		"mtime": "2026-08-01T17:16:55.725Z",
		"size": 14192,
		"path": "../public/assets/settings-S1RJ0Va3.js"
	},
	"/assets/stocks-uLwIGjPS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24cd-ON8bDuqMivWi+LxhSRWNTJm6sXE\"",
		"mtime": "2026-08-01T17:16:55.726Z",
		"size": 9421,
		"path": "../public/assets/stocks-uLwIGjPS.js"
	},
	"/assets/typeof-B5XbjTb1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-yPXEOGyFHb1Ws7OoWyWNEEBz4mQ\"",
		"mtime": "2026-08-01T17:16:55.727Z",
		"size": 271,
		"path": "../public/assets/typeof-B5XbjTb1.js"
	},
	"/assets/web-C2prGzql.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"212d-dp4R8d0IAcrAnwgwXHPCCDpoZEk\"",
		"mtime": "2026-08-01T17:16:55.729Z",
		"size": 8493,
		"path": "../public/assets/web-C2prGzql.js"
	},
	"/assets/styles-C19GPCIz.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"12ca1-SD+WWk5RmzeYbMKLS6Yobmze3Xw\"",
		"mtime": "2026-08-01T17:16:55.730Z",
		"size": 76961,
		"path": "../public/assets/styles-C19GPCIz.css"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_FO1rr9 = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_FO1rr9
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
