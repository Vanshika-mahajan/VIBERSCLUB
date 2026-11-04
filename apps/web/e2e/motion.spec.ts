import { expect, test } from "@playwright/test";

test("motion lab: Vanta, SplitText, reveals and Lenis all run", async ({ page }) => {
  await page.goto("/lab");
  await expect(page.locator("h1").first()).toContainText("Find your people,");
  // Vanta swaps the gradient for a WebGL canvas once three.js has loaded
  await expect(page.locator("canvas.vanta-canvas")).toHaveCount(1);
  // Lenis marks the page while it controls scrolling
  await expect(page.locator("html")).toHaveClass(/lenis/);
  const last = page.getByTestId("lab-block").last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveCSS("opacity", "1");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("motion lab skips WebGL and smooth scrolling but shows everything", async ({ page }) => {
    await page.goto("/lab");
    await expect(page.getByText("not just places.")).toBeVisible();
    await expect(page.getByTestId("lab-block")).toHaveCount(4);
    for (const block of await page.getByTestId("lab-block").all()) await expect(block).toHaveCSS("opacity", "1");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
  });
});
