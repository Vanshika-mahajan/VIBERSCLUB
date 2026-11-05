import { expect, test } from "@playwright/test";

test("home shows API OK from the real API", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: /your Manali has people/, level: 1 })).toBeVisible();
  await expect(page.getByText("API OK")).toBeVisible();
});

test("the pill bar has Home, Discover, Events and Explore, and follows the page", async ({ page }) => {
  await page.goto("/home");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(["Home", "Discover", "Events", "Explore"]);
  // at the foot of the screen, clear of the edge
  const box = (await nav.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.y + box.height).toBeGreaterThan(viewport.height - 60);
  for (const [label, heading] of [
    ["Discover", "Discover Vibers"],
    ["Events", "Events"],
    ["Explore", "Explore Manali"],
    ["Home", /your Manali has people/],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeAttached();
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  }
});

test("your initial opens your profile; the gear opens settings", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("link", { name: "Your profile" }).click();
  await expect(page.getByRole("heading", { name: "Riya", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Albums" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Posts/ })).toBeVisible();
  await expect(page.getByText("Only you can see this")).toBeVisible();
  await page.getByRole("link", { name: "Settings" }).click();
  for (const h of ["Your profile", "YOUR VIBE LINE", /WHAT'S YOUR VIBE/, "LOOKING FOR", "PRIVACY AND SAFETY"])
    await expect(page.getByRole("heading", { name: h }).first()).toBeVisible();
});

test("the bell on Home holds notifications and chats", async ({ page }) => {
  await page.goto("/events/sunrise-jogini");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await page.goto("/home");
  const bell = page.getByRole("link", { name: /Chats and notifications, \d+ new/ });
  await bell.click();
  const notes = page.getByRole("list", { name: "Notifications" });
  await expect(notes.getByText(/wants to connect/).first()).toBeVisible();
  await expect(notes.getByText(/Sunrise walk to Jogini falls is (tomorrow|today)/)).toBeVisible();
  // seen now: the count goes once you have looked
  await page.goto("/home");
  await expect(page.getByRole("link", { name: "Chats and notifications" })).toBeVisible();
  await page.getByRole("link", { name: "Chats and notifications" }).click();
  await page.getByRole("tab", { name: "Chats" }).click();
  const group = page.getByRole("link", { name: /Sunrise walk to Jogini falls/ }).filter({ hasText: "Group" });
  await group.first().click();
  await page.getByLabel("Message the group").fill("Bringing a flask of chai");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Bringing a flask of chai")).toBeVisible();
});

test("the + posts from anywhere: IGNITE THE VIBE", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Post: ignite the vibe" }).click();
  const sheet = page.getByRole("dialog", { name: "Ignite the vibe" });
  await sheet.getByLabel("Your post").fill("Sunset jam at the river tonight, bring a guitar");
  await sheet.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText(/Posted/).first()).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await page.goto("/profile");
  await expect(page.getByText("Sunset jam at the river tonight, bring a guitar")).toBeVisible();
});

test("serves an installable manifest", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect((await response.json()).name).toBe("Vibers Club");
});
