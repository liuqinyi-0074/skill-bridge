// Minimal HTTP layer with timeout, AbortSignal support, JSON parsing, and normalized errors.
// This file is transport-only. Higher layers build URLs and pass RequestOptions here.

export class HttpError extends Error {
  /** HTTP status code if available */
  readonly status?: number;
  /** Response body text for diagnostics (truncated) */
  readonly bodyText?: string;
  /** Final requested URL */
  readonly url?: string;

  constructor(message: string, opts?: { status?: number; bodyText?: string; url?: string }) {
    super(message);
    this.name = "HttpError";
    this.status = opts?.status;
    this.bodyText = opts?.bodyText;
    this.url = opts?.url;
  }
}

/** Extra options beyond native fetch */
export interface RequestOptions {
  /** Abort after N ms (default is applied if not provided) */
  timeoutMs?: number;
  /** Additional headers to merge */
  headers?: Record<string, string>;
  /** Optional AbortSignal to cancel the request */
  signal?: AbortSignal;
  /** Include credentials if your API uses cookies */
  credentials?: RequestCredentials;
}

/** Default timeout (ms) */
const DEFAULT_TIMEOUT = 15_000;

/** Common headers for JSON requests */
const baseJsonHeaders: Record<string, string> = {
  Accept: "application/json",
};

/**
 * Create an AbortSignal that aborts on timeout, while also respecting an upstream signal.
 * If both exist, abort occurs when either one fires.
 */
function composeSignal(upstream: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const controller = new AbortController();

  // Wire upstream
  if (upstream) {
    if (upstream.aborted) {
      controller.abort(upstream.reason);
    } else {
      const onAbort = () => controller.abort(upstream.reason);
      upstream.addEventListener("abort", onAbort, { once: true });
      controller.signal.addEventListener("abort", () => {
        upstream.removeEventListener("abort", onAbort);
      });
    }
  }

  // Wire timeout
  const id = setTimeout(
    () => controller.abort(new DOMException("Timeout", "AbortError")),
    Math.max(1, timeoutMs)
  );
  controller.signal.addEventListener("abort", () => clearTimeout(id), { once: true });

  return controller.signal;
}

/** Parse response as JSON if content-type indicates JSON, else as text. Throw on non-2xx. */
async function parseJsonOrText<T>(res: Response, url: string): Promise<T> {
  const ctype = res.headers.get("content-type") ?? "";
  const isJson = ctype.includes("application/json") || ctype.includes("+json");

  if (res.ok) {
    if (isJson) return (await res.json()) as T;
    const text = await res.text();
    // If server returns non-JSON 2xx, we pass through text as T (caller decides).
    return (text as unknown) as T;
  }

  // Non-2xx → include (truncated) body for diagnostics
  let bodyText = "";
  try {
    bodyText = isJson
      ? JSON.stringify(await res.clone().json()).slice(0, 2000)
      : (await res.text()).slice(0, 2000);
  } catch {
    bodyText = "";
  }
  throw new HttpError(`HTTP ${res.status} ${res.statusText}`, { status: res.status, bodyText, url });
}

/** Core fetch wrapper */
async function coreFetch<T>(
  url: string,
  init: RequestInit,
  options?: RequestOptions
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT;
  const signal = composeSignal(options?.signal, timeoutMs);

  const res = await fetch(url, {
    ...init,
    headers: {
      ...baseJsonHeaders,
      ...(init.headers ?? {}),
      ...(options?.headers ?? {}),
    },
    signal,
    credentials: options?.credentials, // only include if caller asks
  });

  return parseJsonOrText<T>(res, url);
}

/** Low-level GET returning typed JSON (or text) */
export function httpGet<T>(url: string, options?: RequestOptions): Promise<T> {
  return coreFetch<T>(
    url,
    {
      method: "GET",
    },
    options
  );
}

/** Low-level POST with JSON body and typed JSON response */
export function httpPost<TReq, TRes>(
  url: string,
  body: TReq,
  options?: RequestOptions
): Promise<TRes> {
  return coreFetch<TRes>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options
  );
}

/** Optional: DELETE helper */
export function httpDelete<T>(url: string, options?: RequestOptions): Promise<T> {
  return coreFetch<T>(
    url,
    {
      method: "DELETE",
    },
    options
  );
}

/** Optional: PUT helper */
export function httpPut<TReq, TRes>(
  url: string,
  body: TReq,
  options?: RequestOptions
): Promise<TRes> {
  return coreFetch<TRes>(
    url,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options
  );
}
