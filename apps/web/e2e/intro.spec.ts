import { expect, test } from "@playwright/test";

// "A World Awaits" (features/intro) no longer opens the site: the door in the clouds (features/entry,
// e2e/entry.spec.ts) replaced it at "/" on 2026-11-18. Its checks are kept, skipped, until ARPIT
// approves deleting it; the last two still hold and still run.

/**
 * The first page: "A World Awaits", the door, the Vibers World, the paraglider, then Home. The full
 * motion is reviewed frame by frame (features/intro/README.md); these check the sequence works end to
 * end on the still version (?world=css) and that the 3D door takes over where WebGL is available.
 */
test.skip("Scene 1 shows the headline and the button, and the button runs once", async ({
  page,
}) => {
  await page.goto("/?world=css");
  await expect(
    page.getByRole("heading", { level: 1, name: /A World Awaits/ }),
  ).toBeVisible();
  const unveil = page.getByRole("button", { name: "Unveil What Awaits" });
  await expect(unveil).toBeEnabled();
  await unveil.click();
  await expect(unveil).toBeDisabled();
});

test.skip("the entry runs straight into Home and the canopy lets go", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/?world=css");
  await page.getByRole("button", { name: "Unveil What Awaits" }).click();
  await page.waitForURL("**/home", { timeout: 20_000 });
  // the curtain opens and is gone, leaving Home usable
  await expect(page.locator("[class*=reveal]")).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test.skip("the still version still reaches Home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Unveil What Awaits" }).click();
    await page.waitForURL("**/home", { timeout: 20_000 });
    await expect(page.locator("[class*=reveal]")).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});

test("a normal visit to Home never shows the canopy", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[class*=reveal]")).toHaveCount(0);
});

test("the old review address lands on the first page", async ({ page }) => {
  await page.goto("/intro-demo");
  await expect(page).toHaveURL(/\/$/);
});
