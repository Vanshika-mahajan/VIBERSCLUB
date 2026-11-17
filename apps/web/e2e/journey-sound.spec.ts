import { expect, test } from "@playwright/test";

// The old door and Earth journey no longer opens the site: the new entry (features/intro, e2e/intro.spec.ts)
// replaced it at "/" on 2026-11-18. These checks are kept, skipped, until ARPIT approves deleting the old journey.
test.skip(true, "the old journey was replaced at / by the new entry");

test("the door page has its own sound switch, on by default and remembered", async ({ page }) => {
  await page.goto("/?world=css");
  const sound = page.getByRole("button", { name: "Sound", exact: true });
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("button", { name: "Sound", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("the journey runs with sound on, without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?world=css");
  await page.getByRole("button", { name: "Sound", exact: true }).click(); // a gesture: the browser lets sound play
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.getByRole("textbox").first().fill("Treks and bonfires");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});
