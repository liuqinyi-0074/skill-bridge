import { APP_CONFIG } from "../../config/runtime";
import { DEMO_MODE } from "../demo/mode";
import { demoResponse } from "../demo/fixtures";
// Build absolute API URLs and expose typed JSON helpers on top of services/https.
// Arrays in query are encoded as repeated keys (?a=1&a=2). Trailing slashes are stripped.

import { httpGet, httpPost, type RequestOptions } from "../services/https";

/** Primitive query types; undefined keys are skipped. */
type QueryPrimitive = string | number | boolean | undefined;
/** Query object type: values can be single or array. */
export type Query = Record<string, QueryPrimitive | QueryPrimitive[]>;

/** Base URL normalization: strip trailing slashes. */
const BASE = APP_CONFIG.apiBase;

/** Build full URL with optional query string. */
function buildUrl(path: string, q?: Query): string {
  const rel = path.startsWith("/") ? path : `/${path}`;

  let qs = "";
  if (q) {
    const usp = new URLSearchParams();
    for (const [key, value] of Object.entries(q)) {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v !== undefined) usp.append(key, String(v));
        });
      } else if (value !== undefined) {
        usp.append(key, String(value));
      }
    }
    const s = usp.toString();
    qs = s ? `?${s}` : "";
  }

  return BASE ? `${BASE}${rel}${qs}` : `${rel}${qs}`;
}

/** Print request info in dev environment. */
function logRequest(method: "GET" | "POST", url: string): void {
  if (import.meta.env.DEV) console.log(`[API ${method}]`, url);
}

/** JSON GET with query serialization and RequestOptions passthrough */
export function getJSON<T>(path: string, q?: Query, options?: RequestOptions): Promise<T> {
  if (DEMO_MODE) {
    if (options?.signal?.aborted) return Promise.reject(options.signal.reason);
    return Promise.resolve(structuredClone(demoResponse("GET", path, q)) as T);
  }
  const url = buildUrl(path, q);
  logRequest("GET", url);
  return httpGet<T>(url, options);
}

/** JSON POST with body serialization and optional query */
export function postJSON<TReq, TRes>(
  path: string,
  body: TReq,
  q?: Query,
  options?: RequestOptions
): Promise<TRes> {
  if (DEMO_MODE) {
    if (options?.signal?.aborted) return Promise.reject(options.signal.reason);
    return Promise.resolve(structuredClone(demoResponse("POST", path, q, body)) as TRes);
  }
  const url = buildUrl(path, q);
  logRequest("POST", url);
  return httpPost<TReq, TRes>(url, body, options);
}

/** Optional: log base URL in dev */
if (import.meta.env.DEV) {
  console.log("[VITE_API_BASE]", BASE || "(proxy/relative)");
}
