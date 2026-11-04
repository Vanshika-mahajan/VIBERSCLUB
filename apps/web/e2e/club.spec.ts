import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // sample photos come from a photo CDN; keep tests independent of the network
  await page.route("**/images.pexels.com/**", (r) => r.abort());
});

test("the club home has five tabs and the open one lives in the URL", async ({
  page,
}) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "your Manali has people in it",
  );
  const tabs = page.getByRole("tablist", { name: "Vibers Club" });
  await expect(tabs.getByRole("tab")).toHaveText([
    "Events",
    "Community",
    "Explore",
    "My itinerary",
    "Post",
  ]);
  await expect(tabs.getByRole("tab", { name: "Events" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await tabs.getByRole("tab", { name: "Explore" }).click();
  await expect(page).toHaveURL(/tab=explore/);
  await expect(
    page.getByRole("heading", { name: "Places to visit" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Posts like yours" }),
  ).toBeVisible();
});

test("community: like, pass and save for later", async ({ page }) => {
  await page.goto("/home?tab=community");
  const deck = page.locator('[aria-roledescription="card stack"]');
  const first = (await deck.getAttribute("aria-label"))!.split(".")[0];
  await page.getByRole("button", { name: `Save ${first} for later` }).click();
  await expect(
    page.getByRole("complementary", { name: "Your people" }).getByText(first),
  ).toBeVisible();
  const second = (await deck.getAttribute("aria-label"))!.split(".")[0];
  expect(second).not.toBe(first);
  await deck.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(deck).not.toHaveAttribute(
    "aria-label",
    new RegExp(`^${second}\\.`),
  );
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
