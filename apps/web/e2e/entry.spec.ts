import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The first page: ARPIT's entry film played with depth in three.js (features/film). The motion is
 * reviewed frame by frame; these check that the film starts from the button, Enter and a tap on the
 * picture, that the page is clean, and that with reduced motion the button goes straight to Home.
 * (The earlier door-and-camp entry, features/entry and features/camp, is kept but no longer routed.)
 */
test.beforeEach(async ({ page }) => {
  await page.route("**/images.pexels.com/**", (r) => r.abort());
});

const consoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/Failed to load resource|ERR_FAILED|localhost:8000|ERR_CONNECTION_REFUSED/.test(
        m.text(),
      )
    )
      errors.push(m.text());
  });
  return errors;
};

const entry = (page: Page) => page.locator("[data-film]");
const unveil = (page: Page) =>
  page.getByRole("button", { name: "Unveil What Awaits" });

test("the entry shows the title and the button, cleanly", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = consoleErrors(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { level: 1, name: /A World Awaits/ }),
  ).toBeVisible();
  await expect(unveil(page)).toBeEnabled();
  await expect(entry(page)).toHaveAttribute("data-state", "ready");
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  const wide = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(wide).toBe(false);
  expect(errors).toEqual([]);
});

for (const how of ["button", "Enter", "tap"] as const) {
  test(`the film starts from the ${how}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/?world=3d", { waitUntil: "load" });
    await expect(unveil(page)).toBeEnabled();
    if (how === "button") await unveil(page).click();
    else if (how === "Enter") await page.keyboard.press("Enter");
    else {
      // the picture only takes taps once three.js has it on screen
      await expect(page.locator("canvas[data-live]")).toBeAttached({
        timeout: 60_000,
      });
      const box = page.viewportSize() ?? { width: 800, height: 600 };
      await page.mouse.click(box.width * 0.75, box.height * 0.7);
    }
    await expect(entry(page)).toHaveAttribute("data-state", /playing|leaving/);
    await expect(unveil(page)).toBeDisabled();
  });
}

test("with reduced motion the button goes straight to Home", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "load" });
  await unveil(page).click();
  await expect(page).toHaveURL(/\/home$/);
});
