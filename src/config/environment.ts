// Shared by Vite (proxy/PWA) and the browser (API URL/mode).
export const API_PREFIXES = [
  "/anzsco",
  "/api",
  "/occupations",
  "/rum",
] as const;
export const PWA_CACHE = {
  staticName: "skillbridge-static-v2",
  imagesName: "skillbridge-images-v2",
  bigChunksName: "skillbridge-big-chunks-v2",
  bigChunksMaxEntries: 10,
  navigateFallback: "/index.html",
  precacheGlobIgnores: ["**/assets/Insight-*.js"],
  maxEntries: 200,
  maxAgeSeconds: 30 * 24 * 60 * 60,
};
export type Environment = Record<string, string | boolean | undefined>;
function apiBase(value: string): string {
  const base = value.trim().replace(/\/+$/, "");
  if (!base) return "";
  if (/[?#]/.test(base) || base.startsWith("//"))
    throw new Error(
      "VITE_API_BASE must be an HTTP(S) URL or a same-origin path, without query/fragment.",
    );
  if (base.startsWith("/")) return base;
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(
      "VITE_API_BASE must be an HTTP(S) URL without credentials.",
    );
  return base;
}
function booleanSetting(
  value: string | boolean | undefined,
  fallback: boolean,
  name: string,
): boolean {
  if (value === undefined || value === "") return fallback;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  throw new Error(name + " must be true or false.");
}
export function resolveEnvironment(env: Environment) {
  const base = apiBase(String(env.VITE_API_BASE ?? ""));
  const proxyTarget = String(env.VITE_API_PROXY_TARGET ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (proxyTarget) {
    try {
      if (!/^https?:\/\//.test(proxyTarget)) throw new Error("Invalid protocol");
      apiBase(proxyTarget);
    } catch { throw new Error("VITE_API_PROXY_TARGET must be an absolute HTTP(S) URL without credentials, query or fragment."); }
  }
  return {
    apiBase: base,
    proxyTarget,
    demoMode: booleanSetting(env.VITE_DEMO_MODE, false, "VITE_DEMO_MODE"),
    pwaEnabled: booleanSetting(env.VITE_PWA_ENABLED, true, "VITE_PWA_ENABLED"),
    sitePassword: String(env.VITE_SITE_PASSWORD ?? ""),
  };
}
export function apiUrl(base: string, path: string): string {
  return base + (path.startsWith("/") ? path : "/" + path);
}
export function proxyPaths(base: string): string[] {
  return API_PREFIXES.map((path) =>
    apiUrl(base.startsWith("/") ? base : "", path),
  );
}
export function apiPattern(base: string): RegExp {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = /^https?:\/\//.test(base)
    ? escape(base)
    : "https?://[^/]+" + escape(base);
  return new RegExp(
    "^" + prefix + "(?:" + API_PREFIXES.map(escape).join("|") + ")(?:/|[?]|$)",
  );
}
