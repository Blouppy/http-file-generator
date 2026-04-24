import { test, expect } from "@playwright/test";
import path from "path";

const PETSTORE_FIXTURE = path.join(__dirname, "fixtures", "petstore.json");

test.describe("Upload page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/upload");
  });

  test("displays the page heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Upload your OpenAPI spec" })).toBeVisible();
    await expect(
      page.getByText("Drop or browse to upload a .json, .yaml, or .yml file."),
    ).toBeVisible();
  });

  test("displays the file upload zone with instructions", async ({ page }) => {
    await expect(page.getByText("Drop your OpenAPI spec here")).toBeVisible();
    await expect(page.getByText("Supports .json, .yaml, and .yml files")).toBeVisible();
  });

  test("displays the Browse files button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Browse files" })).toBeVisible();
  });

  test("navigates to /select after uploading a valid OpenAPI spec", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PETSTORE_FIXTURE);

    await expect(page).toHaveURL(/\/select$/, { timeout: 15_000 });
  });

  test("shows an error message when an invalid file is uploaded", async ({ page }) => {
    const invalidFile = {
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{ not valid openapi }"),
    };

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFile);

    await expect(page.getByText(/Failed to parse|Try again/i)).toBeVisible({ timeout: 15_000 });
  });
});
