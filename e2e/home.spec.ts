import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays the page title", async ({ page }) => {
    await expect(page).toHaveTitle(/HTTP File Generator/i);
  });

  test("displays the hero heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "HTTP File Generator", level: 1 })).toBeVisible();
  });

  test("displays the hero subtitle", async ({ page }) => {
    await expect(
      page.getByText("Transform your OpenAPI specifications into ready-to-use .http files"),
    ).toBeVisible();
  });

  test('"Get Started" button links to /upload', async ({ page }) => {
    const getStartedLinks = page.getByRole("link", { name: "Get Started" });
    // There are two "Get Started" links (hero + CTA section). Both must point to /upload.
    for (const link of await getStartedLinks.all()) {
      await expect(link).toHaveAttribute("href", "/upload");
    }
  });

  test("displays the How it works section with 3 steps", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upload your spec" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Select endpoints" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Download .http files" })).toBeVisible();
  });

  test("displays the privacy section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Your data stays yours" })).toBeVisible();
  });

  test("navigates to /upload when Get Started is clicked", async ({ page }) => {
    await page.getByRole("link", { name: "Get Started" }).first().click();
    await expect(page).toHaveURL(/\/upload$/);
  });
});
