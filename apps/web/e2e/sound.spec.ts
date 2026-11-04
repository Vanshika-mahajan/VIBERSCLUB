import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/images.pexels.com/**", (r) => r.abort());
  // count the notes the app starts, without needing speakers
  await page.addInitScript(() => {
    const w = window as unknown as { __notes: number };
    w.__notes = 0;
    const make = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      w.__notes++;
      return make.call(this);
    };
  });
});

const notes = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __notes: number }).__notes);

test("sounds: quiet on arrival, play on a tap, and can be muted from the profile menu", async ({ page }) => {
  await page.goto("/home");
  await page.waitForTimeout(300);
  expect(await notes(page)).toBe(0); // nothing plays on its own

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Explore" }).click();
  await expect(page).toHaveURL(/\/explore/);
  await expect.poll(() => notes(page)).toBeGreaterThan(0);

  // turn them off in the profile menu
  await page.getByRole("button", { name: /Your profile and chats/ }).click();
  const sw = page.getByRole("switch", { name: "Sounds" });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Sound volume")).toBeVisible();
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");

  const before = await notes(page);
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/home/);
  await page.waitForTimeout(300);
  expect(await notes(page)).toBe(before);

  // and it stays off after a reload
  await page.reload();
  await page.getByRole("button", { name: /Your profile and chats/ }).click();
  await expect(page.getByRole("switch", { name: "Sounds" })).toHaveAttribute("aria-checked", "false");
});
