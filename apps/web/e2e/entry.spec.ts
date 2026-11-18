import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The first page: the door in ARPIT's meadow opens onto their sunset camp (features/entry, features/camp).
 * The motion is reviewed frame by frame; these check that it opens onto the camp by keyboard, tap and
 * the Unveil button, and that the camp shows straight away when the entry cannot run.
 */
test.beforeEach(async ({ page }) => {
  await page.route("**/images.pexels.com/**", (r) => r.abort());
});

const camp = (page: import("@playwright/test").Page) => page.getByRole("img", { name: /hilltop camp at sunset/ });

const consoleErrors = (page: import("@playwright/test").Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|localhost:8000|ERR_CONNECTION_REFUSED/.test(m.text()))
      errors.push(m.text());
  });
  return errors;
};

test("the door opens onto the camp with the keyboard", async ({ page }) => {
  // software WebGL is slow on CI machines
  test.setTimeout(120_000);
  const errors = consoleErrors(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator('[data-entry][data-state="ready"]')).toBeAttached({ timeout: 60_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("[data-entry]").analyze();
  expect(scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  // the scene and its loading are clean (checked before leaving: Home's own scroll loops throw once
  // when any page with Home on it is left, a known issue of Home's, not of the entry)
  expect(errors).toEqual([]);
  // the key listener catches up just after the door turns ready
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-entry]")).toHaveCount(0, { timeout: 60_000 });
  await expect(camp(page)).toBeVisible();
});

test("a tap on the door opens it too", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator('[data-entry][data-state="ready"]')).toBeAttached({ timeout: 60_000 });
  await page.getByRole("button", { name: "Open the door to Vibers Club" }).click();
  await expect(page.locator("[data-entry]")).toHaveCount(0, { timeout: 60_000 });
  await expect(camp(page)).toBeVisible();
});

test("the Unveil What Awaits button opens it", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator('[data-entry][data-state="ready"]')).toBeAttached({ timeout: 60_000 });
  const unveil = page.getByRole("button", { name: "Unveil What Awaits" });
  await expect(unveil).toBeInViewport();
  await unveil.click();
  await expect(page.locator("[data-entry]")).toHaveCount(0, { timeout: 60_000 });
  await expect(camp(page)).toBeVisible();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("shows the camp straight away, with no entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-entry]")).toHaveCount(0, { timeout: 20_000 });
    await expect(camp(page)).toBeVisible();
  });
});
