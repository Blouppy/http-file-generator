import { test, expect, type Page } from "@playwright/test";
import path from "path";

const PETSTORE_FIXTURE = path.join(__dirname, "fixtures", "petstore.json");

/**
 * Uploads the Petstore fixture via the file input on the /upload page and
 * waits until the browser has navigated to /select.
 */
export async function uploadPetstoreSpec(page: Page): Promise<void> {
  await page.goto("/upload");

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(PETSTORE_FIXTURE);

  await page.waitForURL("**/select");
}

/**
 * Re-export `test` and `expect` for convenience in spec files.
 */
export { test, expect };
