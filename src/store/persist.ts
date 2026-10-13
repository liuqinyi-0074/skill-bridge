import type { TrainingCourse } from "../types/training";
import { DEMO_MODE } from "../lib/demo/mode";
import type { PersistConfig, Transform } from "redux-persist";
import type { PersistedState } from "redux-persist/es/types";
import { createTransform } from "redux-persist";

import storage from "./browserStorage"; // fallback adapter: localStorage → sessionStorage → in-memory
import type { RootState } from "./index";
import { initialState as analyzerInitial } from "./analyzerSlice";

export const PERSIST_VERSION = 3;

/** Narrow to a plain object (no array, no class instance) */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

/** Remove redux-persist meta key from an arbitrary value */
function stripPersistMeta(v: unknown): unknown {
  if (!isPlainObject(v)) return v;
  const rest = { ...(v as Record<string, unknown>) };
  delete (rest as Record<string, unknown>)._persist;
  return rest;
}

/** Restore only validated fields; syntactically valid JSON can still have corrupt shapes. */
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function role(value: unknown): value is { id: string; title: string } {
  return (
    isPlainObject(value) &&
    text(value.id) &&
    /^\d{6}$/.test(value.id) &&
    text(value.title)
  );
}
function job(value: unknown): value is { code: string; title: string } {
  return (
    isPlainObject(value) &&
    text(value.code) &&
    /^\d{6}$/.test(value.code) &&
    text(value.title)
  );
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(text);
}
export function normalizeState(input: unknown): RootState {
  const raw =
    isPlainObject(input) && isPlainObject(input.analyzer) ? input.analyzer : {};
  const state = { ...analyzerInitial };
  if (Array.isArray(raw.chosenRoles))
    state.chosenRoles = raw.chosenRoles.filter(role).slice(0, 5);
  if (Array.isArray(raw.chosenAbilities))
    state.chosenAbilities = raw.chosenAbilities
      .filter(
        (value): value is RootState["analyzer"]["chosenAbilities"][number] =>
          isPlainObject(value) &&
          text(value.name) &&
          typeof value.aType === "string" &&
          ["knowledge", "tech", "skill"].includes(value.aType) &&
          (value.code === undefined || text(value.code)),
      )
      .slice(0, 500);
  if (typeof raw.lastCodesKey === "string")
    state.lastCodesKey = raw.lastCodesKey;
  if (
    typeof raw.preferredRegion === "string" &&
    ["All", "NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"].includes(
      raw.preferredRegion,
    )
  )
    state.preferredRegion = raw.preferredRegion;
  if (strings(raw.interestedIndustryCodes))
    state.interestedIndustryCodes = raw.interestedIndustryCodes.filter((code) =>
      /^[A-T]$/.test(code),
    );
  if (
    typeof raw.step === "number" &&
    Number.isInteger(raw.step) &&
    raw.step >= 0 &&
    raw.step <= 5
  )
    state.step = raw.step;
  if (
    typeof raw.lastActivity === "number" &&
    Number.isFinite(raw.lastActivity) &&
    raw.lastActivity > 0
  )
    state.lastActivity = Math.min(raw.lastActivity, Date.now());
  if (job(raw.selectedJob))
    state.selectedJob = {
      code: raw.selectedJob.code,
      title: raw.selectedJob.title,
    };
  if (isPlainObject(raw.selectedJobUnmatched)) {
    const gap = raw.selectedJobUnmatched;
    if (strings(gap.knowledge) && strings(gap.skill) && strings(gap.tech))
      state.selectedJobUnmatched = {
        knowledge: gap.knowledge,
        skill: gap.skill,
        tech: gap.tech,
      };
  }
  if (
    isPlainObject(raw.trainingAdvice) &&
    job(raw.trainingAdvice.occupation) &&
    Array.isArray(raw.trainingAdvice.courses)
  ) {
    const courses = raw.trainingAdvice.courses.filter(
      (value): value is TrainingCourse =>
        isPlainObject(value) &&
        text(value.id) &&
        text(value.name) &&
        (value.url === undefined || typeof value.url === "string"),
    );
    state.trainingAdvice = {
      occupation: {
        code: raw.trainingAdvice.occupation.code,
        title: raw.trainingAdvice.occupation.title,
      },
      courses,
    };
  }
  return { analyzer: state };
}

/** Identity transform placeholder (kept for future stripping if needed) */
export const stripVolatile: Transform<RootState, RootState> = createTransform(
  (state) => state,
  (rehydrated) => rehydrated,
);

/** Factory for the root persist config */
export function createRootPersistConfig(): PersistConfig<RootState> {
  return {
    key: DEMO_MODE ? "demo-root" : "root",
    version: PERSIST_VERSION,
    storage, // resilient adapter
    blacklist: ["transient", "runtime"],
    migrate: async (
      persisted: PersistedState | unknown,
    ): Promise<PersistedState> => {
      if (persisted == null) return undefined as unknown as PersistedState;
      const withoutMeta = stripPersistMeta(persisted);
      const next = normalizeState(withoutMeta);
      return next as unknown as PersistedState;
    },
    transforms: [stripVolatile],
  };
}
