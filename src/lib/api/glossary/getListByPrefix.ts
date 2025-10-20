// Fetch a list of glossary items by prefix from /api/glossary/detail?q=...
import { getJSON, type Query } from "../apiClient";
import type { RequestOptions } from "../../services/https";

export interface GlossaryDetail {
  term: string;
  description: string;
  acronym?: string;
  also_called?: string[];
  see_also?: string[];
}

/** GET /api/glossary/detail?q=<prefix> -> GlossaryDetail[] */
export function getListByPrefix(prefix: string, options?: RequestOptions): Promise<GlossaryDetail[]> {
  const q = prefix.trim();
  if (!q) throw new Error("Keyword is required");
  const params: Query = { q };
  return getJSON<GlossaryDetail[]>("/api/glossary/detail", params, options);
}
