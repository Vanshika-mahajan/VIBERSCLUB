import { expect, test } from "@playwright/test";

test("the first page: door, question, and a thought sent with the keyboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Every journey begins with a thought." })).toBeVisible();
  // no app navigation over the scene
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  const field = page.getByLabel("What’s on your mind?");
  await expect(field).toBeVisible();
  // the field and the door never overlap
  const door = await page.locator("[class*=door]").first().boundingBox();
  const ask = await page.getByText("What’s on your mind?").boundingBox();
  expect(ask!.y).toBeGreaterThan(door!.y + door!.height - 4);
  await field.focus();
  await page.keyboard.type("Looking for people who love mountain adventures");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "opening");
  await expect(field).toHaveValue("Looking for people who love mountain adventures");
});

test("the meadow is alive: the grass sways", async ({ page }) => {
  await page.goto("/");
  const grass = page.locator("[data-layer=grass]");
  const a = await grass.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(700);
  const b = await grass.evaluate((el) => getComputedStyle(el).transform);
  expect(a).not.toBe(b);
});

test("Enter the app opens the universe", async ({ page }) => {
  await page.route("**/images.pexels.com/**", (r) => r.abort());
  await page.goto("/");
  await page.getByRole("link", { name: "Enter the app" }).click();
  await expect(page).toHaveURL(/\/universe$/);
  await expect(page.locator("canvas")).toBeVisible();
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the scene is still and the headline shows at once", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const grass = page.locator("[data-layer=grass]");
    const a = await grass.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(700);
    expect(await grass.evaluate((el) => getComputedStyle(el).transform)).toBe(a);
  });
});
