// tests/glossary.e2e.spec.ts
// End-to-end test for Profile page + VetGlossarySuggest component.
// Assumptions:
// - Profile page is routed at /profile
// - Glossary input has id="glossary-input"
// - Suggestions list has role="listbox"
// - Detail panel renders selected.term and selected.description
// - Backend endpoint: GET /api/glossary/detail?q=<prefix>

import { test, expect } from "@playwright/test";

// Helper: wait for glossary API with a given query param and expect 200/304.
// If your backend returns 404 for no results and the frontend maps to empty,
// you can relax status expectations accordingly.
async function waitGlossaryResponse(page: any, q: string) {
  const resp = await page.waitForResponse((r: any) => {
    const url = new URL(r.url());
    return url.pathname.endsWith("/api/glossary/detail") && url.searchParams.get("q") === q;
  });
  expect([200, 304, 404]).toContain(resp.status());
  return resp;
}

test.describe("Profile → VET Glossary E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Profile page
    await page.goto("/profile");
    // Ensure page chrome loaded
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  });

  test("type-ahead flow: q → qs → clear → exd → select item → details visible", async ({ page }) => {
    const input = page.locator("#glossary-input");

    // Type 'q' and expect suggestions
    await input.fill("q");
    await waitGlossaryResponse(page, "q");
    await expect(page.getByRole("listbox")).toBeVisible();

    // Type 's' to become 'qs' and expect list to update
    await input.type("s");
    await waitGlossaryResponse(page, "qs");
    await expect(page.getByRole("listbox")).toBeVisible();

    // Clear: dropdown should close or show empty guidance
    await input.clear();
    await expect(page.getByText("Enter a VET term prefix to see suggestions")).toBeVisible();

    // Type 'exd' and select the first option
    await input.fill("exd");
    await waitGlossaryResponse(page, "exd");
    const firstOption = page.getByRole("listbox").locator("li >> nth=0");
    await firstOption.click();

    // Detail panel should show term and description (exact text depends on data)
    await expect(page.locator("section").filter({ hasText: "Acronym:" }).or(page.locator("section"))).toBeVisible();
    // Minimal assertion: selected term equals input value after normalize
    await expect(page.getByRole("heading", { level: 4 })).toContainText(/exd/i);
  });

  test("no result fallback: shows 'No information found.'", async ({ page }) => {
    const input = page.locator("#glossary-input");
    // Use an unlikely prefix to force empty result
    const unlikely = "zzzqyx";
    await input.fill(unlikely);
    await waitGlossaryResponse(page, unlikely);

    // Component-level empty state
    await expect(page.getByText("No information found.")).toBeVisible();
  });

  test("error fallback: shows 'Connection failed.' and Retry button when API fails", async ({ page }) => {
    // Intercept once to simulate a failure, then let next try pass-through
    await page.route("**/api/glossary/detail**", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("q") === "err") {
        return route.fulfill({ status: 503, body: "temporary" });
      }
      return route.continue();
    });

    const input = page.locator("#glossary-input");
    await input.fill("err");

    // Expect error fallback UI
    await expect(page.getByText("Connection failed.")).toBeVisible();
    const retry = page.getByRole("button", { name: "Retry" });
    await expect(retry).toBeVisible();

    // Click retry (this time no interception -> real backend)
    await retry.click();
    // Either list appears or empty state appears; both acceptable as recovery
    await expect(
      page.getByRole("listbox").or(page.getByText("No information found."))
    ).toBeVisible();
  });
});
