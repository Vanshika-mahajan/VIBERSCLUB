import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // sample portraits come from a photo CDN; keep tests independent of the network
  await page.route("**/images.pexels.com/**", (r) => r.abort());
  await page.goto("/");
});

test("home is one full-screen universe with the thought bar at its centre", async ({ page }) => {
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const viewport = page.viewportSize()!;
  const box = (await canvas.boundingBox())!;
  expect(box.width).toBe(viewport.width);
  expect(box.height).toBe(viewport.height);
  // no app navigation bar and no page scroll
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height);
  const bar = (await page.getByRole("search").boundingBox())!;
  expect(Math.abs(bar.y + 32 - viewport.height / 2)).toBeLessThan(40);
});

test("typing word by word pulls matches into the inner orbit", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "What's on your mind?" });
  await input.focus();
  await input.pressSequentially("I want to explore Manali with people who love photography", { delay: 15 });
  await expect(page.getByRole("list", { name: "What I understood" }).getByText("#Photography")).toBeVisible();
  await expect(page.getByText(/6 Vibers and \d conversations? in the inner orbit/)).toBeVisible();
  await page.getByRole("button", { name: "See as a list" }).click();
  await page.getByRole("region", { name: "The universe as a list" }).getByRole("button").first().click();
  await expect(page.getByRole("dialog", { name: /profile/ }).getByText("Why they're here")).toBeVisible();
});

test("the menu reaches the rest of the site", async ({ page }) => {
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Events" }).click();
  await expect(page.getByRole("heading", { name: "Events", level: 1 })).toBeVisible();
});

test("stepping in pulls matches into the core, which opens into a room", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "What's on your mind?" });
  await input.focus();
  await input.pressSequentially("people who love photography", { delay: 15 });
  await expect(page.getByText(/in the inner orbit/)).toBeVisible();
  await page.keyboard.press("Enter");
  const room = page.getByRole("region", { name: "Manali through a lens" });
  await expect(room).toBeVisible({ timeout: 5000 });
  // the universe keeps turning behind the room
  await expect(page.locator("canvas")).toBeVisible();
  await expect(room.getByText("Anyone up for Lamadugh at golden hour tomorrow?", { exact: false })).toBeVisible();
  await room.getByRole("button", { name: /Golden hour spots/ }).click();
  await expect(room.getByText(/Lamadugh meadow at 6 pm/)).toBeVisible();
  await room.getByRole("button", { name: /^Meera Kapoor, .*Open profile/ }).click();
  await expect(page.getByRole("dialog", { name: /profile/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(room).toBeHidden();
  await expect(input).toBeFocused();
});
