import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // sample photos come from a photo CDN; keep tests independent of the network
  await page.route("**/images.pexels.com/**", (r) => r.abort());
});

test("the club home has five sections on a wheel and the open one lives in the URL", async ({
  page,
}) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "your Manali has people in it",
  );
  const wheel = page.getByRole("listbox", { name: "Vibers Club sections" });
  await expect(wheel.getByRole("option")).toHaveText([
    "Events",
    "Community",
    "Explore",
    "My itinerary",
    "Post",
  ]);
  await expect(wheel.getByRole("option", { name: "Events" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await wheel.getByRole("option", { name: "Explore" }).click();
  await expect(page).toHaveURL(/tab=explore/);
  await expect(
    page.getByRole("heading", { name: "Places to visit" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Posts like yours" }),
  ).toBeVisible();
  // the keyboard turns the wheel too
  await wheel.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/tab=itinerary/);
});

test("community: like, pass and save for later", async ({ page }) => {
  await page.goto("/home?tab=community");
  // the Viber in front is named on the gallery (or the card stack without WebGL2)
  const front = page.locator(
    '[aria-roledescription="profile gallery"], [aria-roledescription="card stack"]',
  );
  const name = async () =>
    (await front.getAttribute("aria-label"))!.split(/[.,]/)[0];
  const first = await name();
  await page.getByRole("button", { name: `Save ${first} for later` }).click();
  await expect(
    page.getByRole("complementary", { name: "Your people" }).getByText(first),
  ).toBeVisible();
  await expect.poll(name).not.toBe(first);
  const second = await name();
  await page.getByRole("button", { name: `Pass on ${second}` }).click();
  await expect.poll(name).not.toBe(second);
});

test("events: join and leave", async ({ page }) => {
  await page.goto("/home?tab=events");
  await page.getByRole("button", { name: "Join", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: /Going ✓/ }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Going ✓/ })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /Going ✓/ })).toHaveCount(0);
});

test("itinerary: use a Vibers Club plan, then add a stop", async ({ page }) => {
  await page.goto("/home?tab=itinerary");
  await page.getByRole("button", { name: "Use this plan" }).first().click();
  await expect(
    page
      .getByRole("heading", { name: "Your first two days", level: 3 })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Place to add on day 1" })
    .selectOption("solang");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await expect(page.getByText("Solang meadows").first()).toBeVisible();
});

test("post: keywords appear while typing and find matching Vibers", async ({
  page,
}) => {
  await page.goto("/home?tab=post");
  await page
    .getByLabel("Your post")
    .fill("Sunrise trek on Saturday, then cafes in Old Manali");
  await expect(page.getByLabel("Keywords we found")).toContainText("#Sunrise");
  await expect(
    page.getByRole("heading", { name: "Vibers who match this post" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Vibers who match your latest post" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete post" })).toBeVisible();
});
