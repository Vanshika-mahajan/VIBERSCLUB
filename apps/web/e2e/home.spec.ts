import { expect, test } from "@playwright/test";

test("home shows API OK from the real API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /find your people/, level: 1 })).toBeVisible();
  await expect(page.getByText("API OK")).toBeVisible();
});

test("navigation reaches every section", async ({ page, isMobile }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const box = await nav.boundingBox();
  const viewport = page.viewportSize()!;
  if (isMobile) {
    // Bottom bar: pinned to the bottom edge of the screen.
    expect(Math.round(box!.y + box!.height)).toBe(viewport.height);
  } else {
    // Sidebar: on the left, full height.
    expect(box!.x).toBe(0);
    expect(box!.height).toBeGreaterThan(viewport.height * 0.9);
  }
  for (const [label, heading] of [
    ["Discover", "Discover Vibers"],
    ["Events", "Events"],
    ["Chats", "Chats"],
    ["Profile", "Your profile"],
  ]) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  }
});

test("serves an installable manifest", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect((await response.json()).name).toBe("Vibers Club");
});
