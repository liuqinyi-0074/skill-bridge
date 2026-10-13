import { DEMO_MODE } from "../../demo/mode";
import { demoGlossary } from "../../demo/fixtures";
// API call to fetch VET glossary term details by keyword.

import { getJSON } from "../apiClient";

/** Glossary term detail response */
export interface GlossaryDetail {
  term: string;
  description: string;
  acronym?: string;
  also_called?: string[];
  see_also?: string[];
}

/**
 * GET /api/glossary/detail
 * Fetch VET terminology details by keyword.
 * Returns term description, acronyms, related terms, etc.
 */
export function getDetailByKeyword(keyword: string): Promise<GlossaryDetail> {
  const kw = keyword.trim();
  if (!kw) throw new Error("Keyword is required");
  if (DEMO_MODE) {
    const item = demoGlossary.find((item) => item.term.toLowerCase() === kw.toLowerCase() || item.acronym?.toLowerCase() === kw.toLowerCase());
    if (!item) return Promise.reject(new Error("Term is not available in the demo glossary."));
    return Promise.resolve(structuredClone(item));
  }
  return getJSON<GlossaryDetail>("/api/glossary/detail", { q: kw });
}