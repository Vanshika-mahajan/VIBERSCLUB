import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // sample photos come from a photo CDN; keep tests independent of the network
  await page.route("**/images.pexels.com/**", (r) => r.abort());
});

test("home is one page: the hero, then what used to be Today", async ({
  page,
}) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "your Manali has people in it",
  );
  await expect(page.getByRole("listbox")).toHaveCount(0);
  for (const name of [
    "Vibers like you",
    "Happening this week",
    "Explore Manali",
  ])
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
  await expect(page.getByLabel("Your post")).toBeVisible();
});

test("old Home tab links land on their new pages", async ({ page }) => {
  await page.goto("/home?tab=community");
  await expect(page).toHaveURL(/\/discover$/);
  await page.goto("/home?tab=itinerary");
  await expect(page).toHaveURL(/\/explore\?section=itinerary$/);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/home$/);
});

test("community: like, pass and save for later", async ({ page }) => {
  await page.goto("/discover#community");
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
  await page.goto("/events");
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
  await page.goto("/explore");
  await page.getByRole("button", { name: "Itinerary" }).click();
  await expect(page).toHaveURL(/section=itinerary/);
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
  await page.goto("/home#post");
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
