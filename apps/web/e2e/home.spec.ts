import { expect, test } from "@playwright/test";

test("home shows API OK from the real API", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: /Spaces for curious people/, level: 1 })).toBeVisible();
  await expect(page.getByText("API OK")).toBeVisible();
});

const CONTENTS = ["Your vibe", "Vibers like you", "This week", "Day plans", "Discover", "Events", "Explore"];

test("the contents list the four chapters of Home and the other pages, I to VII, and follow every page", async ({ page }) => {
  await page.goto("/home");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of CONTENTS) await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(CONTENTS.length);
  // Discover, Events and Explore are chapters V to VII of Home: the contents glide down to them
  for (const [label, id] of [
    ["Discover", "discover"],
    ["Events", "events"],
    ["Explore", "explore"],
  ] as const) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/home#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "location");
  }
  // each still has its own page, where its line in the contents is the current page
  await page.goto("/events");
  await expect(nav.getByRole("link", { name: "Events", exact: true })).toHaveAttribute("aria-current", "page");
  // the wordmark goes back to Home
  await page.getByRole("link", { name: "Vibers Club" }).click();
  await expect(page.getByRole("heading", { name: /Spaces for curious people/, level: 1 })).toBeAttached();
});

test("on Home the contents sit centred, dock in the corner on scroll, and come back at the top", async ({ page }) => {
  await page.goto("/home");
  const list = page.getByRole("navigation", { name: "Main" }).getByRole("list");
  const viewport = page.viewportSize()!;
  const centreX = async () => {
    const b = (await list.boundingBox())!;
    return b.x + b.width / 2;
  };
  // centred in the frame
  expect(Math.abs((await centreX()) - viewport.width / 2)).toBeLessThan(40);
  await page.evaluate(() => window.scrollTo(0, 600));
  // docked: bottom left (on a phone, a strip along the foot of the screen)
  await expect.poll(async () => (await list.boundingBox())!.x).toBeLessThan(40);
  await expect.poll(async () => { const b = (await list.boundingBox())!; return b.y + b.height; }).toBeGreaterThan(viewport.height - 80);
  // back at the very top, it flies back into the frame
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => Math.abs((await centreX()) - viewport.width / 2)).toBeLessThan(40);
});

test("a chapter in the contents glides to it on Home", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "This week", exact: true }).click();
  await expect(page.locator("#this-week")).toBeInViewport({ timeout: 8000 });
  await expect(page).toHaveURL(/#this-week$/);
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
