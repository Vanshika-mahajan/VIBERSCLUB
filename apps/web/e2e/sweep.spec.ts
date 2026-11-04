import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Every page, on a phone, a tablet width and a desktop: it loads with a heading, nothing scrolls sideways, the
 * console stays clean, and an automated accessibility scan (WCAG 2.1 A and AA) finds nothing
 * serious. Run with SWEEP_SHOTS=1 to also save a screenshot of each page for a look-and-feel review.
 */
const routes = [
  "/",
  "/home",
  "/discover",
  "/explore",
  "/explore?section=itinerary",
  "/profile",
  "/chats",
  "/chats?with=tashi",
  "/events",
  "/events/sunrise-jogini",
  "/events/new",
  "/vibers/meera-kapoor",
  "/universe",
];

test.beforeEach(async ({ page }) => {
  await page.route("**/images.pexels.com/**", (r) => r.abort());
});

for (const route of routes) {
  test(`page ${route}`, async ({ page }, info) => {
    // the door and the universe draw WebGL, which is slow in software rendering on CI machines
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      // blocked sample photos and the API (not running in tests) are expected
      if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|localhost:8000|ERR_CONNECTION_REFUSED/.test(m.text()))
        errors.push(m.text());
    });
    await page.goto(route, { waitUntil: "load" });
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);

    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow(), "nothing scrolls sideways").toBeLessThanOrEqual(1);
    if (info.project.name === "desktop") {
      // and at tablet width, between the phone and desktop layouts
      const size = page.viewportSize()!;
      await page.setViewportSize({ width: 820, height: 1100 });
      await page.waitForTimeout(400);
      expect(await overflow(), "nothing scrolls sideways on a tablet").toBeLessThanOrEqual(1);
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
    }

    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // the WebGL canvases are decorative and labelled; axe cannot read colours drawn on them
      .exclude("canvas")
      .analyze();
    const serious = scan.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(serious, "accessibility").toEqual([]);
    expect(errors, "console errors").toEqual([]);

    if (process.env.SWEEP_SHOTS) {
      const name = `${info.project.name}${route.replace(/[/?=]+/g, "_") || "_root"}`;
      await page.screenshot({ path: `../../.sweep/${name}.png` });
    }
  });
}
