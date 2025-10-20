// useGlossarySuggest.ts
// Prefix suggestions with timeout cascade and safe fallbacks.

import { useQuery } from "@tanstack/react-query";
import { getListByPrefix, type GlossaryDetail } from "../../lib/api/glossary/getListByPrefix";

/** Detect AbortError (timeout or externally aborted) */
function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/** Try once with given timeout; if timeout and not externally aborted, try again with a longer timeout. */
async function fetchWithTimeoutCascade(
  prefix: string,
  signal: AbortSignal
): Promise<GlossaryDetail[]> {

    return await getListByPrefix(prefix, { signal, timeoutMs: 6_000 });

}

export function useGlossarySuggest(prefix: string | null) {
  const enabled = Boolean(prefix && prefix.trim().length > 0);

  return useQuery<GlossaryDetail[], Error>({
    queryKey: ["glossary", "suggest", prefix],
    queryFn: ({ signal }) => fetchWithTimeoutCascade(prefix!.trim(), signal as AbortSignal),
    enabled,
    // Keep last data on screen; avoids flicker during refetch
    placeholderData: (prev) => prev,
    // Longer staleness to boost cache hits on backspace
    staleTime: 60_000,
    // Do not auto-retry at library level; we already did a controlled cascade above
    retry: 0,
  });
}
