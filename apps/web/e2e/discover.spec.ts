import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // sample portraits come from a photo CDN; keep tests independent of the network
  await page.route("**/images.pexels.com/**", (r) => r.abort());
  await page.goto("/discover");
});

test("a thought brings matching Vibers out of the sphere", async ({ page }) => {
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("textbox", { name: "What's on your mind?" }).fill("Looking for people to trek Hampta this weekend");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("list", { name: "What I understood" }).getByText("#Treks")).toBeVisible();
  await expect(page.getByText(/sample Vibers who share this thought/)).toBeVisible();
  const cards = page.getByRole("list", { name: /Vibers who share your thought/ }).getByRole("button");
  // cards become buttons as each one lands in the formation
  await expect.poll(() => cards.count(), { timeout: 5000 }).toBeGreaterThanOrEqual(6);
  // the cards sit above the thought bar, inside the screen
  const bar = await page.getByRole("search").boundingBox();
  for (const box of await Promise.all((await cards.all()).map((c) => c.boundingBox()))) {
    expect(box!.y + box!.height).toBeLessThan(bar!.y);
    expect(box!.x).toBeGreaterThanOrEqual(-1);
  }
});

test("open a profile, like and save, then pass", async ({ page }) => {
  await page.getByRole("textbox", { name: "What's on your mind?" }).fill("Trek Hampta this weekend");
  await page.keyboard.press("Enter");
  const first = page.getByRole("list", { name: /Vibers who share your thought/ }).getByRole("button").first();
  await first.click();
  const panel = page.getByRole("dialog", { name: /profile/ });
  await expect(panel.getByText("Why they're here")).toBeVisible();
  await panel.getByRole("button", { name: "Like" }).click();
  await expect(page.getByText(/If they like you back, you can connect/)).toBeVisible();
  await panel.getByRole("button", { name: "Save" }).click();
  await expect(panel.getByRole("button", { name: "Saved" })).toBeVisible();
  const name = (await first.getAttribute("aria-label"))!.split(",")[0];
  await panel.getByRole("button", { name: "Pass" }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: new RegExp(`^${name},`) })).toHaveCount(0);
});

test("list view, calm mode and the about dialog", async ({ page }) => {
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.getByRole("heading", { name: "Vibers around Manali" })).toBeVisible();
  await page.getByRole("button", { name: "List view" }).click();
  await page.getByRole("button", { name: "Calm mode" }).click();
  await expect(page.getByRole("button", { name: "Calm mode" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "About Discover" }).click();
  await expect(page.getByRole("dialog", { name: "About Discover" })).toContainText("design preview");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "About Discover" })).toBeHidden();
});

test("the main navigation stays reachable", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Events" }).click();
  await expect(page.getByRole("heading", { name: "Events", level: 1 })).toBeVisible();
});
