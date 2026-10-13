import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
});
const outage = (page: Page) =>
  page.getByRole("heading", { name: "Service temporarily unavailable" });
async function openLiveSearch(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("getInfo:tutorial:v1", "1"),
  );
  await page.goto("/analyzer/get-info?demo=0", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("button", { name: "Enter Demo Mode" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Industry", exact: true })
    .selectOption("M");
  await page.getByRole("textbox", { name: "Keyword" }).fill("analyst");
}
for (const failure of [
  "network",
  "503",
  "html",
  "timeout",
  "offline",
] as const) {
  test("Live Mode outage: " + failure, async ({ page }) => {
    let requests = 0;
    await page.route("**/anzsco/search?**", async (route) => {
      requests++;
      if (failure === "network") await route.abort();
      else if (failure === "503")
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"message":"unavailable"}',
        });
      else if (failure === "html")
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<html>Proxy fallback</html>",
        });
      else if (failure !== "timeout")
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: '{"industry":"test","items":[]}',
        });
      // Leave timeout requests pending to exercise the real transport deadline.
    });
    await openLiveSearch(page);
    if (failure === "offline")
      await page.evaluate(() =>
        Object.defineProperty(Navigator.prototype, "onLine", {
          get: () => false,
        }),
      );
    await page.getByRole("button", { name: "Search roles" }).click();
    await expect(outage(page)).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "Search roles" }),
    ).toHaveCount(0);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("focus"));
    });
    await page.waitForTimeout(1500);
    expect(requests).toBe(failure === "offline" ? 0 : 1);
    await page.getByRole("button", { name: "Enter Demo Mode" }).click();
    await expect(
      page.getByRole("button", { name: "Exit Demo Mode" }),
    ).toBeVisible();
    await expect(outage(page)).toHaveCount(0);
  });
}
test("user explicitly restores Live Mode after backend recovery", async ({
  page,
}) => {
  let recovered = false;
  let requests = 0;
  await page.route("**/anzsco/search?**", async (route) => {
    requests++;
    await route.fulfill({
      status: recovered ? 200 : 503,
      contentType: "application/json",
      body: recovered
        ? '{"industry":"test","items":[{"anzsco_code":"261111","anzsco_title":"ICT Business Analyst"}]}'
        : "{}",
    });
  });
  await openLiveSearch(page);
  await page.getByRole("button", { name: "Search roles" }).click();
  await expect(outage(page)).toBeVisible();
  recovered = true;
  await page.getByRole("button", { name: "Try Live Mode again" }).click();
  await expect(
    page.getByRole("button", { name: "Search roles" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Industry", exact: true })
    .selectOption("M");
  await page.getByRole("textbox", { name: "Keyword" }).fill("analyst");
  await page.getByRole("button", { name: "Search roles" }).click();
  await expect(
    page.getByRole("button", { name: "Add role", exact: true }),
  ).toBeVisible();
  expect(requests).toBe(2);
});
test("failed feedback has no success message and is never resent", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/contact", async (route) => {
    requests++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "null",
    });
  });
  await page.goto("/feedback?demo=0", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Category", { exact: false }).selectOption("Bug");
  await page
    .getByLabel("Message", { exact: false })
    .fill("The service is not reachable.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit feedback" }).click();
  await expect(outage(page)).toBeVisible();
  await expect(
    page.getByText("Thanks! Your feedback has been received."),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Try Live Mode again" }).click();
  await expect(
    page.getByRole("button", { name: "Submit feedback" }),
  ).toBeVisible();
  expect(requests).toBe(1);
});

test("training cannot finish before a confirmed response and preserves saved advice on outage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "persist:root",
      JSON.stringify({
        analyzer: JSON.stringify({
          selectedJob: { code: "261312", title: "Developer Programmer" },
          chosenRoles: [{ id: "261111", title: "ICT Business Analyst" }],
          chosenAbilities: [
            { name: "Writing", code: "2.A.1.c", aType: "skill" },
          ],
          preferredRegion: "VIC",
          interestedIndustryCodes: ["M"],
          step: 5,
          lastActivity: Date.now(),
          selectedJobUnmatched: { knowledge: [], skill: ["Writing"], tech: [] },
          trainingAdvice: {
            occupation: { code: "261312", title: "Developer Programmer" },
            courses: [{ id: "saved", name: "Previously saved course" }],
          },
        }),
        _persist: JSON.stringify({ version: 3, rehydrated: true }),
      }),
    );
  });
  let failRequest: (() => Promise<void>) | undefined;
  await page.route("**/api/anzsco/261312/training-advice", (route) => {
    failRequest = () => route.abort();
  });
  await page.goto("/analyzer/training?demo=0", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("button", { name: "Finish", exact: true }),
  ).toBeDisabled();
  await expect.poll(() => Boolean(failRequest)).toBe(true);
  await failRequest!();
  await expect(outage(page)).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(JSON.parse(localStorage.getItem("persist:root")!).analyzer),
  );
  expect(saved.trainingAdvice.courses).toEqual([
    { id: "saved", name: "Previously saved course" },
  ]);
});
