import {
  isServiceUnavailable,
  markServiceUnavailable,
  ServiceUnavailableError,
  subscribeToService,
} from "./availability";
// Minimal HTTP layer with timeout, AbortSignal support, JSON parsing, and normalized errors.
// This file is transport-only. Higher layers build URLs and pass RequestOptions here.

export class HttpError extends Error {
  /** HTTP status code if available */
  readonly status?: number;
  /** Response body text for diagnostics (truncated) */
  readonly bodyText?: string;
  /** Final requested URL */
  readonly url?: string;

  constructor(
    message: string,
    opts?: { status?: number; bodyText?: string; url?: string },
  ) {
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
const DEFAULT_TIMEOUT = 10_000;

/** Common headers for JSON requests */
const baseJsonHeaders: Record<string, string> = {
  Accept: "application/json",
};

/** Parse response as JSON if content-type indicates JSON, else as text. Throw on non-2xx. */
async function parseJsonOrText<T>(res: Response, url: string): Promise<T> {
  const ctype = res.headers.get("content-type") ?? "";
  const isJson = ctype.includes("application/json") || ctype.includes("+json");

  if (res.ok) {
    if (
      res.status === 204 &&
      new URL(url, window.location.origin).pathname.endsWith("/api/contact")
    )
      return null as T;
    if (res.status === 204) throw new ServiceUnavailableError();
    if (isJson) {
      const data: unknown = await res.json();
      if (data === null) throw new ServiceUnavailableError();
      return data as T;
    }
    const text = await res.text();
    // Only explicit plain-text acknowledgements from contact are supported.
    if (
      new URL(url, window.location.origin).pathname.endsWith("/api/contact") &&
      /^(ok|success)$/i.test(text.trim())
    )
      return text as T;
    throw new ServiceUnavailableError();
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
  throw new HttpError(`HTTP ${res.status} ${res.statusText}`, {
    status: res.status,
    bodyText,
    url,
  });
}

/** Core fetch wrapper */
async function coreFetch<T>(
  url: string,
  init: RequestInit,
  options?: RequestOptions,
): Promise<T> {
  if (options?.signal?.aborted) throw options.signal.reason;
  if (isServiceUnavailable()) throw new ServiceUnavailableError();
  if (!navigator.onLine) {
    markServiceUnavailable();
    throw new ServiceUnavailableError();
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort(options?.signal?.reason);
  options?.signal?.addEventListener("abort", onAbort, { once: true });
  const unsubscribe = subscribeToService(() =>
    controller.abort(new ServiceUnavailableError()),
  );
  // Cap every request, including legacy callers asking for a longer timeout.
  const timeoutMs = Math.min(
    DEFAULT_TIMEOUT,
    Math.max(1, options?.timeoutMs ?? DEFAULT_TIMEOUT),
  );
  const timer = setTimeout(
    () => controller.abort(new ServiceUnavailableError()),
    timeoutMs,
  );
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...baseJsonHeaders,
        ...(init.headers ?? {}),
        ...(options?.headers ?? {}),
      },
      signal: controller.signal,
      credentials: options?.credentials,
    });
    return await parseJsonOrText<T>(res, url);
  } catch (error) {
    // A caller cancelling its own request is not a service outage.
    if (options?.signal?.aborted) throw error;
    if (
      error instanceof ServiceUnavailableError ||
      error instanceof TypeError ||
      error instanceof SyntaxError ||
      controller.signal.aborted ||
      (error instanceof HttpError && (error.status ?? 0) >= 500)
    ) {
      markServiceUnavailable();
      throw new ServiceUnavailableError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options?.signal?.removeEventListener("abort", onAbort);
    unsubscribe();
  }
}

/** Low-level GET returning typed JSON (or text) */
export function httpGet<T>(url: string, options?: RequestOptions): Promise<T> {
  return coreFetch<T>(
    url,
    {
      method: "GET",
    },
    options,
  );
}

/** Low-level POST with JSON body and typed JSON response */
export function httpPost<TReq, TRes>(
  url: string,
  body: TReq,
  options?: RequestOptions,
): Promise<TRes> {
  return coreFetch<TRes>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

/** Optional: DELETE helper */
export function httpDelete<T>(
  url: string,
  options?: RequestOptions,
): Promise<T> {
  return coreFetch<T>(
    url,
    {
      method: "DELETE",
    },
    options,
  );
}

/** Optional: PUT helper */
export function httpPut<TReq, TRes>(
  url: string,
  body: TReq,
  options?: RequestOptions,
): Promise<TRes> {
  return coreFetch<TRes>(
    url,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}
