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

test("community: a Viber's overview opens in place, then their full profile", async ({
  page,
}) => {
  await page.goto("/discover#community");
  const front = page.locator(
    '[aria-roledescription="profile gallery"], [aria-roledescription="card stack"]',
  );
  const name = (await front.getAttribute("aria-label"))!.split(/[.,]/)[0];
  await page.getByRole("button", { name: `Open ${name.split(" ")[0]}` }).click();
  const overview = page.getByRole("dialog", { name });
  await expect(overview).toBeVisible();
  await expect(page).toHaveURL(/\/discover/);
  for (const h of ["Into", "Here for"])
    await expect(overview.getByRole("heading", { name: h })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(overview).toBeHidden();
  await page.getByRole("button", { name: `Open ${name.split(" ")[0]}` }).click();
  await overview.getByRole("link", { name: "View full profile" }).click();
  await expect(page).toHaveURL(/\/vibers\//);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  const connect = page.getByRole("button", { name: "Connect" });
  // keep it clear of the pill bar at the foot of the screen
  await connect.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await connect.click();
  // liked: either waiting for them, or (when they liked you first) straight into a chat
  await expect(
    page.getByText(/^Waiting for /).or(page.getByRole("link", { name: "Open chat" })),
  ).toBeVisible();
});

test("Discover is black from the sphere to the community", async ({ page }) => {
  await page.goto("/discover");
  const bg = (sel: string) =>
    page.locator(sel).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg("[data-formed]")).toBe("rgb(0, 0, 0)");
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
