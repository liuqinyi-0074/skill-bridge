import { test, expect } from "@playwright/test";
for (const failure of [
  "local-property",
  "both-properties",
  "quota-initial",
  "quota-runtime",
  "corrupt-json",
  "corrupt-fields",
] as const) {
  test("Demo startup and planning survive " + failure, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
      route.abort(),
    );
    await page.addInitScript((failure) => {
      for (const storage of [localStorage, sessionStorage]) {
        storage.setItem("getInfo:tutorial:v1", "1");
        storage.setItem("profile:tutorial:v1", "1");
      }
      if (failure === "corrupt-json")
        localStorage.setItem("persist:demo-root", "{broken");
      if (failure === "corrupt-fields")
        localStorage.setItem(
          "persist:demo-root",
          JSON.stringify({
            analyzer: JSON.stringify({
              chosenRoles: null,
              chosenAbilities: [null, 42],
              selectedJob: { code: [] },
              preferredRegion: {},
              interestedIndustryCodes: "wrong",
              trainingAdvice: { courses: null },
              step: "bad",
              lastActivity: [],
            }),
            _persist: JSON.stringify({ version: 3, rehydrated: true }),
          }),
        );
      if (failure === "local-property" || failure === "both-properties")
        Object.defineProperty(window, "localStorage", {
          get: () => {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
      if (failure === "both-properties")
        Object.defineProperty(window, "sessionStorage", {
          get: () => {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
      if (failure === "quota-initial")
        Storage.prototype.setItem = () => {
          throw new DOMException("Full", "QuotaExceededError");
        };
    }, failure);
    await page.goto("/analyzer/get-info?demo=1", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "Get info", exact: true }),
    ).toBeVisible();
    if (failure === "both-properties")
      await page
        .getByRole("button", { name: "Skip tutorial", exact: true })
        .click();
    if (failure === "quota-runtime")
      await page.evaluate(() => {
        Storage.prototype.setItem = () => {
          throw new DOMException("Full", "QuotaExceededError");
        };
      });
    await page
      .getByRole("combobox", { name: "Industry", exact: true })
      .selectOption("M");
    await page.getByRole("textbox", { name: "Keyword" }).fill("analyst");
    await page.getByRole("button", { name: "Search roles" }).click();
    await page.getByRole("button", { name: "Add role", exact: true }).click();
    await page
      .getByRole("radio", { name: "Victoria (VIC)", exact: true })
      .check({ force: true });
    await page
      .getByRole("checkbox", {
        name: "Professional, Scientific and Technical Services",
        exact: true,
      })
      .check({ force: true });
    await page
      .getByRole("button", { name: "Go to next step", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Remove Active Listening",
        exact: true,
      }),
    ).toBeVisible();
    const roundtrip = await page.evaluate(async () => {
      const path = "/src/store/browserStorage.ts";
      const { safeStorage } = await import(/* @vite-ignore */ path);
      safeStorage.setItem("test:fallback", "works");
      return safeStorage.getItem("test:fallback");
    });
    expect(roundtrip).toBe("works");
    expect(errors).toEqual([]);
  });
}

test("password gate unlocks when both browser storage properties are blocked", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  await page.route("**/src/config/runtime.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'export const APP_CONFIG = { apiBase: "/backend", proxyTarget: "", demoMode: true, pwaEnabled: false, sitePassword: "storage-test" };',
    }),
  );
  await page.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"])
      Object.defineProperty(window, name, {
        get: () => {
          throw new DOMException("Blocked", "SecurityError");
        },
      });
  });
  await page.goto("/analyzer/get-info?demo=1", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Enter Access Password" }),
  ).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("storage-test");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Exit Demo Mode" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
