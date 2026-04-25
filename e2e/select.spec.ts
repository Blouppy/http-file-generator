import { test, expect } from "@playwright/test";
import { uploadPetstoreSpec } from "./helpers";

test.describe("Select page", () => {
  test.beforeEach(async ({ page }) => {
    await uploadPetstoreSpec(page);
  });

  // ── Spec header ──────────────────────────────────────────────────────────────

  test("displays the spec title in the header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Petstore" })).toBeVisible();
  });

  test("shows the total endpoint count and selected count", async ({ page }) => {
    // The Petstore fixture has 17 endpoints; none are selected by default.
    await expect(page.getByText(/17 endpoints/)).toBeVisible();
    await expect(page.getByText("0 selected")).toBeVisible();
  });

  // ── Endpoint list ─────────────────────────────────────────────────────────────

  test("displays endpoint groups for each tag", async ({ page }) => {
    // Tag label spans carry both "text-sm" and "font-semibold" (unlike preview section headers).
    await expect(
      page.locator("span.text-sm.font-semibold").filter({ hasText: /^pet$/ }),
    ).toBeVisible();
    await expect(
      page.locator("span.text-sm.font-semibold").filter({ hasText: /^store$/ }),
    ).toBeVisible();
    await expect(
      page.locator("span.text-sm.font-semibold").filter({ hasText: /^user$/ }),
    ).toBeVisible();
  });

  test("lists individual endpoints inside each group", async ({ page }) => {
    // Scope to the endpoint-list panel (the left Card) to avoid matching the preview.
    const endpointPanel = page.locator("code.font-mono");
    await expect(endpointPanel.filter({ hasText: "/pet" }).first()).toBeVisible();
    await expect(endpointPanel.filter({ hasText: "/store/inventory" }).first()).toBeVisible();
    await expect(endpointPanel.filter({ hasText: "/user/login" }).first()).toBeVisible();
  });

  // ── HTTP preview ─────────────────────────────────────────────────────────────

  test("shows the HTTP preview panel heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "HTTP Preview" })).toBeVisible();
  });

  test("shows empty preview message when no endpoints are selected", async ({ page }) => {
    await expect(page.getByText("Check endpoints to preview their .http file")).toBeVisible();
  });

  test("HTTP preview contains generated .http content when endpoints are selected", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Select All", exact: true }).click();
    await expect(page.locator("pre")).toContainText("GET https://petstore3.swagger.io");
  });

  // ── Deselect / Select All ─────────────────────────────────────────────────────

  test("Select All selects all endpoints and populates the preview", async ({ page }) => {
    await page.getByRole("button", { name: "Select All", exact: true }).click();

    await expect(page.getByText("17 selected")).toBeVisible();
    await expect(page.locator("pre")).toContainText("GET https://petstore3.swagger.io");
  });

  test("Deselect All removes all endpoints from the preview", async ({ page }) => {
    await page.getByRole("button", { name: "Select All", exact: true }).click();
    await page.getByRole("button", { name: "Deselect All", exact: true }).click();

    await expect(page.getByText("Check endpoints to preview their .http file")).toBeVisible();
    await expect(page.getByText("0 selected")).toBeVisible();
  });

  test("toggling an individual endpoint updates the preview and selected count", async ({
    page,
  }) => {
    // Click the first endpoint item (GET /pet/findByStatus).
    const firstEndpoint = page
      .locator('[class*="cursor-pointer"]')
      .filter({ hasText: "/pet/findByStatus" })
      .first();
    await firstEndpoint.click();

    await expect(page.getByText("1 selected")).toBeVisible();
    await expect(page.locator("pre")).toContainText("/pet/findByStatus");
  });

  test("tag-level All button selects only endpoints in that group", async ({ page }) => {
    // The pet group has 7 endpoints. Click its "All" button (first "All" on the page).
    await page.getByRole("button", { name: "All" }).first().click();

    // The pet group badge should now show "7/7" (all 7 selected).
    await expect(page.getByText("7/7")).toBeVisible();
    await expect(page.getByText("7 selected")).toBeVisible();
  });

  test("tag-level None button deselects only endpoints in that group", async ({ page }) => {
    // Select the pet group first, then deselect it.
    await page.getByRole("button", { name: "All" }).first().click();
    await page.getByRole("button", { name: "None" }).first().click();

    // The pet group badge should now show "0/7" (0 of 7 selected).
    await expect(page.getByText("0/7")).toBeVisible();
    await expect(page.getByText("0 selected")).toBeVisible();
  });

  // ── Download button ───────────────────────────────────────────────────────────

  test("Download button is disabled when no endpoints are selected", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
  });

  test("Download button is enabled when endpoints are selected", async ({ page }) => {
    await page.getByRole("button", { name: "Select All", exact: true }).click();
    await expect(page.getByRole("button", { name: "Download", exact: true })).toBeEnabled();
  });

  test("clicking Download triggers a ZIP file download", async ({ page }) => {
    await page.getByRole("button", { name: "Select All", exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download", exact: true }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  });

  // ── Navigation ────────────────────────────────────────────────────────────────

  test('"Upload new file" navigates back to /upload', async ({ page }) => {
    await page.getByRole("button", { name: "Upload new file" }).click();
    await expect(page).toHaveURL(/\/upload$/);
  });
});
