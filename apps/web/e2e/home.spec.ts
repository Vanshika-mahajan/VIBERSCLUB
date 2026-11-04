import { expect, test } from "@playwright/test";

test("home shows API OK from the real API", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: /your Manali has people/, level: 1 })).toBeVisible();
  await expect(page.getByText("API OK")).toBeVisible();
});

test("the pill bar has Home, Discover and Explore, and follows the page", async ({ page }) => {
  await page.goto("/home");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(["Home", "Discover", "Explore"]);
  // at the foot of the screen, clear of the edge
  const box = (await nav.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.y + box.height).toBeGreaterThan(viewport.height - 60);
  for (const [label, heading] of [
    ["Discover", "Discover Vibers"],
    ["Explore", "Explore Manali"],
    ["Home", /your Manali has people/],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeAttached();
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  }
});

test("the profile menu at the top right reaches profile, chats and events", async ({ page }) => {
  for (const [label, heading] of [
    ["Your profile", "Your profile"],
    ["Chats", "Chats"],
    ["Events", "Events"],
  ]) {
    await page.goto("/home");
    const avatar = page.getByRole("button", { name: /Your profile and chats/ });
    await avatar.click();
    await expect(avatar).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("link", { name: new RegExp(`^${label}`) }).click();
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  }
  await page.getByRole("button", { name: /Your profile and chats/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Your profile and chats/ })).toHaveAttribute("aria-expanded", "false");
});

test("serves an installable manifest", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect((await response.json()).name).toBe("Vibers Club");
});
