import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // sample photos come from a CDN; keep tests independent of the network
  await page.route("**/images.pexels.com/**", (r) => r.abort());
});

test("the pitch journey: vibe → discover → like → connect → chat → RSVP", async ({ page, isMobile }) => {
  // example thoughts (and "Use my vibe") hide on short laptop screens to keep the sphere clear
  if (!isMobile) await page.setViewportSize({ width: 1280, height: 900 });
  // 1. write a vibe on your profile; the chips follow as you type
  await page.goto("/profile");
  const vibe = page.getByLabel(/what are you here for/);
  await vibe.fill("Yoga and hot springs in Vashisht, people to trek with");
  await expect(page.getByLabel("What we read from your vibe").getByText("#Yoga")).toBeVisible();
  await page.getByRole("button", { name: "Save vibe" }).click();
  await expect(page.getByText(/Vibe saved/)).toBeVisible();

  // 2. Discover with your own vibe
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Discover" }).click();
  await page.getByRole("button", { name: "Use my vibe" }).click();
  await expect(page.getByText(/Vibers who share this thought/)).toBeVisible();

  // 3. Meera already liked you: liking back is mutual, and a request connects
  await page.getByRole("button", { name: "List view" }).click();
  await page.getByRole("region", { name: "Discover as a list" }).getByRole("button", { name: /Meera Kapoor/ }).click();
  const panel = page.getByRole("dialog", { name: /profile/ });
  await panel.getByRole("button", { name: "Like" }).click();
  await expect(page.getByText(/You and Meera like each other/)).toBeVisible();
  await panel.getByRole("button", { name: /send a connection request/ }).click();
  await panel.getByRole("link", { name: "Open chat" }).click();

  // 4. chat opens only because you're connected
  await expect(page.getByRole("heading", { name: "Meera Kapoor", level: 1 })).toBeVisible();
  await page.getByLabel(/Message Meera/).fill("Hot springs tomorrow morning?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Hot springs tomorrow morning?")).toBeVisible();

  // 5. join an event, and the full one puts you on the waitlist
  await page.goto("/events/sunrise-jogini");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByText("You're going.", { exact: true })).toBeVisible();
  await page.goto("/events/hampta-pass");
  await page.getByRole("button", { name: "Join waitlist" }).click();
  await expect(page.getByText("You're on the waitlist.", { exact: true })).toBeVisible();

  // 6. it all survives a reload, and shows on your profile
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: /Sunrise walk to Jogini falls/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Hampta Pass/ })).toContainText("Waitlist");
  await page.goto("/chats");
  await expect(page.getByRole("link", { name: /Meera Kapoor/ })).toContainText("Hot springs tomorrow morning?");
});

test("host an event, then find it on Events", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("link", { name: "Host an event" }).click();
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByText(/at least 4 characters/)).toBeVisible();
  await page.getByLabel(/^Title/).fill("Sunset at Lamadugh");
  await page.getByLabel(/^Meeting point/).fill("Slow Pine café");
  await page.getByRole("button", { name: "Day hikes" }).click();
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByRole("heading", { name: "Sunset at Lamadugh", level: 1 })).toBeVisible();
  await expect(page.getByText("You're hosting this.")).toBeVisible();
  await page.getByRole("link", { name: "← All events" }).click();
  await expect(page.getByRole("link", { name: /Sunset at Lamadugh/ })).toBeVisible();
});

test("block someone from a chat and they disappear", async ({ page }) => {
  await page.goto("/chats?with=tashi");
  await page.getByRole("button", { name: "Block" }).click();
  await page.getByRole("button", { name: "Confirm block" }).click();
  await expect(page.getByRole("heading", { name: "Chats", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tashi/ })).toHaveCount(0);
});
