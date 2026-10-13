import { it, expect } from "vitest";
import {
  resolveEnvironment,
  apiUrl,
  apiPattern,
  proxyPaths,
} from "../config/environment";
it("normalizes bases and builds paths consistently", () => {
  const config = resolveEnvironment({
    VITE_API_BASE: " https://backend.example/v1/// ",
    VITE_DEMO_MODE: "true",
  });
  expect(config.apiBase).toBe("https://backend.example/v1");
  expect(config.demoMode).toBe(true);
  expect(apiUrl(config.apiBase, "/api/contact")).toBe(
    "https://backend.example/v1/api/contact",
  );
});
it("matches configured API routes without caching static URLs", () => {
  for (const base of ["", "/backend", "https://backend.example/v1"]) {
    const prefix = base.startsWith("http")
      ? base
      : "https://frontend.example" + base;
    for (const path of [
      "/anzsco/search?q=a",
      "/api/contact",
      "/occupations/rank-by-codes",
      "/rum/vitals",
    ])
      expect(apiPattern(base).test(prefix + path)).toBe(true);
    expect(apiPattern(base).test(prefix + "/assets/main.js")).toBe(false);
    expect(apiPattern(base).test(prefix + "/apiculture")).toBe(false);
  }
  expect(proxyPaths("/backend")).toEqual([
    "/backend/anzsco",
    "/backend/api",
    "/backend/occupations",
    "/backend/rum",
  ]);
});
it("rejects invalid public settings with actionable errors", () => {
  for (const base of [
    "ftp://backend.example",
    "//backend.example",
    "https://user:password@backend.example",
    "/api?query=1",
  ])
    expect(() => resolveEnvironment({ VITE_API_BASE: base })).toThrow();
  expect(() => resolveEnvironment({ VITE_PWA_ENABLED: "yes" })).toThrow(
    "VITE_PWA_ENABLED",
  );
  expect(() =>
    resolveEnvironment({ VITE_API_PROXY_TARGET: "localhost:8000" }),
  ).toThrow("VITE_API_PROXY_TARGET");
});
