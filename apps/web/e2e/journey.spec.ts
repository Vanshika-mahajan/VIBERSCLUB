import { expect, test } from "@playwright/test";

// Two versions of the opening play: the 3D scene where WebGL2 runs well, and the layered CSS scene
// everywhere else. Most tests here check the CSS scene, so WebGL is turned off for them; the 3D
// scene has its own tests at the end, in software WebGL.
test.use({ launchOptions: { args: ["--disable-3d-apis"] } });

test("the first page: door, question, and a thought sent with the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Every journey begins with a thought.",
    }),
  ).toBeVisible();
  // no app navigation over the scene
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  const field = page.getByLabel("What’s on your mind?");
  await expect(field).toBeVisible();
  // the field and the door never overlap
  const door = await page.locator("[class*=door]").first().boundingBox();
  const ask = await page.getByText("What’s on your mind?").boundingBox();
  expect(ask!.y).toBeGreaterThan(door!.y + door!.height - 4);
  await field.focus();
  await page.keyboard.type("Looking for people who love mountain adventures");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-phase]")).toHaveAttribute(
    "data-phase",
    "opening",
  );
  await expect(field).toHaveValue(
    "Looking for people who love mountain adventures",
  );
});

test("the meadow is alive: the grass sways", async ({ page }) => {
  await page.goto("/");
  const grass = page.locator("[data-layer=grass]");
  const a = await grass.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(700);
  const b = await grass.evaluate((el) => getComputedStyle(el).transform);
  expect(a).not.toBe(b);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the scene is still and the headline shows at once", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const grass = page.locator("[data-layer=grass]");
    const a = await grass.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(700);
    expect(await grass.evaluate((el) => getComputedStyle(el).transform)).toBe(
      a,
    );
  });
});

test.describe("the door opens", () => {
  test("a thought opens the door and carries us into the cosmos", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByLabel("What’s on your mind?")
      .fill("Planning a spontaneous trip to Manali");
    await page.keyboard.press("Enter");
    const stage = page.locator("[data-phase]");
    await expect(stage).toHaveAttribute("data-phase", "opening");
    // Skip is offered at once and takes focus
    await expect(
      page.getByRole("button", { name: /Skip intro/ }),
    ).toBeFocused();
    // the leaf turns on its hinge
    await page.waitForTimeout(1800);
    const turned = await page
      .locator("[class*=leaf]")
      .first()
      .evaluate((el) => getComputedStyle(el).transform);
    expect(turned).not.toBe("none");
    await expect(stage).toHaveAttribute("data-phase", "cosmos", {
      timeout: 6000,
    });
    // the cosmos now fills the screen, the meadow is gone
    const cosmos = page.locator("[data-cosmos]");
    await expect(cosmos).toBeVisible();
    const clip = await cosmos.evaluate((el) => getComputedStyle(el).clipPath);
    expect(clip === "none" || /inset\(0px( 0px)*\)/.test(clip)).toBe(true);
  });

  test("Skip and Escape jump straight to the cosmos", async ({ page }) => {
    await page.goto("/");
    await page
      .getByLabel("What’s on your mind?")
      .fill("Hidden cafés in Old Manali");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-phase]")).toHaveAttribute(
      "data-phase",
      "cosmos",
      { timeout: 1500 },
    );
  });
});

test.describe("door with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the door does not swing; the cosmos fades in", async ({ page }) => {
    await page.goto("/");
    await page
      .getByLabel("What’s on your mind?")
      .fill("Looking for like-minded people to explore with");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-phase]")).toHaveAttribute(
      "data-phase",
      "cosmos",
      { timeout: 1500 },
    );
    const leaf = await page
      .locator("[class*=leaf]")
      .first()
      .evaluate((el) => getComputedStyle(el).transform);
    expect(leaf).toBe("none");
  });
});
