import { postJSON } from "../apiClient";
import type { ShortageRes } from "../../../types/shortage";

/**
 * POST /api/shortage/by-anzsco
 * Body: { "anzsco_code": "111111" }
 * Requests use the shared bounded timeout
 */
export async function getShortageByAnzsco(code: string): Promise<ShortageRes> {
  const c = code.trim();
  if (!c) throw new Error("anzsco code is required");

  try {
    // Send JSON body with extended timeout
    const result = await postJSON<{ anzsco_code: string }, ShortageRes>(
      "/api/shortage/by-anzsco",
      { anzsco_code: c },
      undefined, // no query params
      { timeoutMs: 10000 } // bounded Live Mode request
    );
    
    return result;
  } catch (err) {
    console.error("❌ Shortage API Error:", err);
    throw err;
  }
}
