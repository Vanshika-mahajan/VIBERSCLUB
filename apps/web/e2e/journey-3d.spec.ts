import { expect, test } from "@playwright/test";

// The 3D opening, in software WebGL. This machine has no GPU, so frames take about half a second:
// enough to check the 3D scene takes over, plays, skips and gives way, not to watch it at speed
// (the frame-by-frame review videos do that). ?world=3d insists on 3D despite the slow frames.
test.use({
  viewport: { width: 640, height: 400 },
  deviceScaleFactor: 1,
  launchOptions: {
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-unsafe-swiftshader",
    ],
  },
});
// slow software frames: one page at a time, with time to spare
test.describe.configure({ mode: "serial", timeout: 90_000 });

test("the 3D scene takes over and the door starts to open", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/?world=3d");
  const stage = page.locator("[data-phase]");
  // the 3D world replaces the CSS scene once it is drawing
  await expect(stage).toHaveAttribute("data-world", "3d", { timeout: 30000 });
  await expect(page.locator("canvas[data-world]")).toBeVisible();
  await page
    .getByLabel("What’s on your mind?")
    .fill("Planning a spontaneous trip to Manali");
  await page.keyboard.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "opening");
  await expect(page.getByRole("button", { name: /Skip intro/ })).toBeFocused();
  // the scene keeps playing, still in 3D, with nothing thrown
  await page.waitForTimeout(3000);
  await expect(stage).toHaveAttribute("data-world", "3d");
  expect(errors).toEqual([]);
});

test("Escape skips the 3D opening into the cosmos", async ({ page }) => {
  await page.goto("/?world=3d");
  const stage = page.locator("[data-phase]");
  await expect(stage).toHaveAttribute("data-world", "3d", { timeout: 30000 });
  await page
    .getByLabel("What’s on your mind?")
    .fill("Hidden cafés in Old Manali");
  await page.keyboard.press("Enter");
  await expect(stage).toHaveAttribute("data-phase", "opening");
  await page.keyboard.press("Escape");
  // a 0.4 s fast-forward; slow frames stretch it here
  await expect(stage).toHaveAttribute("data-phase", "cosmos", {
    timeout: 30000,
  });
});

test("a device that can't keep 3D smooth gets the CSS version", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(6000);
  await expect(page.locator("[data-phase]")).toHaveAttribute(
    "data-world",
    "css",
  );
  await expect(page.locator("canvas[data-world]")).toBeHidden();
});

test("reduced motion keeps the still CSS version, even when 3D is asked for", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/?world=3d");
  await page.waitForTimeout(3000);
  await expect(page.locator("[data-phase]")).toHaveAttribute(
    "data-world",
    "css",
  );
  await context.close();
});

// the universe draws with WebGL too, so this lives here
test("Enter the app opens the universe", async ({ page }) => {
  await page.route("**/images.pexels.com/**", (r) => r.abort());
  await page.goto("/");
  await page.getByRole("link", { name: "Enter the app" }).click();
  await expect(page).toHaveURL(/\/universe$/);
  await expect(page.locator("canvas").first()).toBeVisible();
});
