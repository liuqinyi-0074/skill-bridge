import { safeStorage } from "../../store/browserStorage";
import { APP_CONFIG } from "../../config/runtime";
// Resolve once at startup; switching reloads to clear queries and isolate persisted plans.
const override =
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("demo");
function savedMode(): string | null {
  try {
    const value = safeStorage.getItem("skillbridge:demo");
    return value === "true" || value === "false" ? value : null;
  } catch {
    return null;
  }
}
export const DEMO_MODE =
  override === "1" ||
  (override !== "0" && (savedMode() ?? String(APP_CONFIG.demoMode)) === "true");
if (override === "1" || override === "0") {
  try {
    safeStorage.setItem("skillbridge:demo", String(DEMO_MODE));
  } catch {
    /* URL remains authoritative. */
  }
}
export function switchDemoMode(): void {
  const url = new URL("/analyzer/intro", window.location.origin);
  url.searchParams.set("demo", DEMO_MODE ? "0" : "1");
  window.location.assign(url);
}
