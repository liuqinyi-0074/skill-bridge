import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
});

test("complete career planning with backend blocked, preserve isolated demo profile", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const backendRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      request.resourceType() === "fetch" &&
      /^\/(anzsco|occupations)\/|^\/api\/(anzsco|career-growth|shortage|glossary|contact)(\/|$)/.test(
        url.pathname,
      )
    ) {
      backendRequests.push(request.url());
      await route.abort();
    } else await route.continue();
  });
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "onLine", { get: () => false });
    localStorage.setItem("getInfo:tutorial:v1", "1");
    localStorage.setItem("profile:tutorial:v1", "1");
  });
  await page.goto("/analyzer/get-info?demo=1", {
    waitUntil: "domcontentloaded",
  });
  // Respect a configured frontend access gate in the local test environment.
  const gate = page.getByRole("form", { name: "Password gate" });
  if (await gate.isVisible())
    throw new Error(
      "Run offline acceptance tests with VITE_SITE_PASSWORD empty.",
    );
  await expect(
    page.getByRole("button", { name: "Exit Demo Mode" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Industry", exact: true })
    .selectOption("M");
  await page.getByRole("textbox", { name: "Keyword" }).fill("analyst");
  await page.getByRole("button", { name: "Search roles" }).click();
  await expect(
    page.getByText("ICT Business Analyst", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add role", exact: true })
    .first()
    .click();
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
    page.getByRole("heading", { name: "Review & curate abilities" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove Active Listening", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Suggested jobs", exact: true }),
  ).toBeVisible();
  const developer = page
    .getByRole("article", { name: "Developer Programmer", exact: true })
    .first();
  await developer.click();
  await page
    .getByRole("button", { name: "Select this job", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Go to next step", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Skill gaps", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Writing", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Go to next step", exact: true })
    .click();
  await expect(
    page
      .getByText("Certificate IV in Project Management Practice", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByText("Developer Programmer", { exact: true }).first(),
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page
      .getByText("Certificate IV in Project Management Practice", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exit Demo Mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Exit Demo Mode" }).click();
  await expect(
    page.getByRole("button", { name: "Enter Demo Mode" }),
  ).toBeVisible();
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Developer Programmer", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Enter Demo Mode" }).click();
  await expect(
    page.getByRole("button", { name: "Exit Demo Mode" }),
  ).toBeVisible();
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Developer Programmer", { exact: true }).first(),
  ).toBeVisible();
  expect(backendRequests).toEqual([]);
});
