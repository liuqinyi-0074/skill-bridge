import { describe, it, expect } from "vitest";
import browserStorage, {
  createSafeStorage,
  safeStorage,
  type StorageLike,
} from "../store/browserStorage";
import { normalizeState } from "../store/persist";
function memory(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    get length() {
      return map.size;
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
  };
}
describe("browser storage fallback", () => {
  it("catches blocked property access and falls back to session", () => {
    const session = memory();
    const storage = createSafeStorage([
      () => {
        throw new Error("SecurityError");
      },
      () => session,
    ]);
    storage.setItem("plan", "saved");
    expect(session.getItem("plan")).toBe("saved");
  });
  it("uses memory when both storage properties are blocked", () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    const storage = createSafeStorage([blocked, blocked]);
    storage.setItem("plan", "saved");
    expect(storage.getItem("plan")).toBe("saved");
    storage.removeItem("plan");
    expect(storage.getItem("plan")).toBeNull();
  });
  it("preserves unread plans on initial quota failure and moves writes to session", () => {
    const local = memory(),
      session = memory();
    local.setItem("plan", "saved");
    local.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const storage = createSafeStorage([() => local, () => session]);
    storage.setItem("mode", "true");
    expect(storage.getItem("plan")).toBe("saved");
    expect(session.getItem("mode")).toBe("true");
  });
  it("retains data when a runtime quota failure also exhausts session storage", () => {
    const local = memory();
    const session = memory();
    const storage = createSafeStorage([() => local, () => session]);
    storage.setItem("first", "one");
    local.setItem = session.setItem = () => {
      throw new Error("quota");
    };
    storage.setItem("second", "two");
    expect(storage.getItem("first")).toBe("one");
    expect(storage.getItem("second")).toBe("two");
  });
  it("does not resurrect removed values during fallback", () => {
    const local = memory();
    local.setItem("old", "value");
    const session = memory();
    const storage = createSafeStorage([() => local, () => session]);
    storage.getItem("old");
    local.removeItem = () => {
      throw new Error("blocked");
    };
    storage.removeItem("old");
    expect(storage.getItem("old")).toBeNull();
  });
  it("discards malformed root and inner serialized values", async () => {
    for (const value of [
      "broken",
      "null",
      JSON.stringify({ analyzer: "broken" }),
      JSON.stringify({ analyzer: 42 }),
    ]) {
      safeStorage.setItem("persist:test", value);
      expect(await browserStorage.getItem("persist:test")).toBeNull();
    }
  });
  it("rejects corrupt field shapes while retaining valid saved fields", () => {
    const state = normalizeState({
      analyzer: {
        chosenRoles: { bad: true },
        chosenAbilities: [
          null,
          { name: "Bad", aType: { toString: null } },
          { name: "Writing", aType: "skill" },
        ],
        preferredRegion: "VIC",
        interestedIndustryCodes: ["M"],
        selectedJob: { code: 5 },
        selectedJobUnmatched: { knowledge: [], skill: null, tech: [] },
        trainingAdvice: { occupation: null, courses: "bad" },
        step: 99,
        lastActivity: "bad",
      },
    });
    expect(state.analyzer.chosenRoles).toEqual([]);
    expect(state.analyzer.chosenAbilities).toEqual([
      { name: "Writing", aType: "skill" },
    ]);
    expect(state.analyzer.preferredRegion).toBe("VIC");
    expect(state.analyzer.selectedJob).toBeNull();
    expect(state.analyzer.selectedJobUnmatched).toBeNull();
    expect(state.analyzer.trainingAdvice).toBeNull();
    expect(state.analyzer.step).toBe(0);
  });
});
