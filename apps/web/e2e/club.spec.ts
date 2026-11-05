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
  await page.getByRole("button", { name: /Ignite the vibe/ }).click();
  await expect(page.getByRole("dialog", { name: "Ignite the vibe" })).toBeVisible();
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

test("Discover sits on the butter page like the rest of the club", async ({ page }) => {
  await page.goto("/discover");
  const bg = (sel: string) =>
    page.locator(sel).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg("[data-formed]")).toBe("rgb(255, 249, 227)");
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

test("itinerary: use a public plan, edit it, go public, add a place by menu", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Itinerary" }).click();
  await expect(page).toHaveURL(/section=itinerary/);
  const detail = page.locator("article").filter({ has: page.getByRole("button", { name: "Use this plan" }) });
  await expect(detail.getByText("Travel style")).toBeVisible();
  await expect(detail.getByText("Activities")).toBeVisible();
  await page.getByRole("button", { name: "Use this plan" }).first().click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Your first two days");

  // a copy starts private; make it public and it joins the public itineraries, by you
  const who = page.getByRole("group", { name: "Who can see it" });
  await expect(who.getByRole("button", { name: "Private" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Title", { exact: true }).fill("Manali with Ana");
  await page.getByLabel("Travel style").selectOption("Adventure");
  await who.getByRole("button", { name: "Public" }).click();
  await expect(page.getByText(/Public: other Vibers can find/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Public itineraries", exact: true })).toContainText("Manali with Ana");

  // the touch way: pick the day from the place's menu
  await page.getByRole("combobox", { name: "Add Solang meadows to a day" }).selectOption({ label: "Day 2" });
  const day2 = page.getByRole("region", { name: "Day 2" });
  await expect(day2.getByText("Solang meadows")).toBeVisible();
  await day2.getByRole("textbox", { name: "Activity at Solang meadows" }).fill("Paragliding");

  // and it all survives a reload
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Manali with Ana");
  await expect(page.getByRole("region", { name: "Day 2" }).getByRole("textbox", { name: "Activity at Solang meadows" })).toHaveValue("Paragliding");
});

test("itinerary: drag places onto days, reorder, move to another day, remove", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones use the menus instead of drag and drop");
  await page.goto("/explore?section=itinerary");
  await page.getByLabel("Create your own").fill("Drag test");
  await page.getByLabel("Days", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Drag test");

  const tray = page.getByRole("complementary", { name: "Places from Explore" });
  const day1 = page.getByRole("region", { name: "Day 1" });
  const day2 = page.getByRole("region", { name: "Day 2" });
  // a person drags to a day they can see; the places tray stays beside it
  await day1.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await tray.getByRole("listitem").filter({ hasText: "Jogini falls" }).dragTo(day1);
  await tray.getByRole("listitem").filter({ hasText: "Hadimba Devi temple" }).dragTo(day1);
  await expect(day1.getByText("Jogini falls")).toBeVisible();
  await expect(day1.getByText("Hadimba Devi temple")).toBeVisible();

  // reorder with the buttons, then move one to day 2 by dragging
  // dropped on the middle of the day, the temple landed above the falls; swap them back
  const rows = day1.locator("[data-stop-row]");
  await expect(rows.first()).toContainText("Hadimba Devi temple");
  await day1.getByRole("button", { name: "Move Hadimba Devi temple later" }).click();
  await expect(rows.first()).toContainText("Jogini falls");
  // centred, clear of the pill bar at the foot of the screen
  await day2.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await day1.locator("[data-stop-row]").filter({ hasText: "Jogini falls" }).dragTo(day2);
  await expect(day2.getByText("Jogini falls")).toBeVisible();
  await expect(day1.getByText("Jogini falls")).toHaveCount(0);

  await day2.getByRole("button", { name: "Remove Jogini falls from day 2" }).click();
  await expect(day2.getByText(/Drag a place here/)).toBeVisible();
});

test("explore: add a place to a plan from its card", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("combobox", { name: "Add Jogini falls to a plan" }).selectOption("new");
  await expect(page.getByText(/Jogini falls is day 1 of a new plan/)).toBeVisible();
  await page.getByRole("button", { name: "Itinerary" }).click();
  await expect(page.getByRole("region", { name: "Day 1" }).getByText("Jogini falls")).toBeVisible();
});

test("post: keywords appear while typing and find matching Vibers", async ({
  page,
}) => {
  await page.goto("/profile#ignite");
  await expect(page.getByRole("dialog", { name: "Ignite the vibe" })).toBeVisible();
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

// a small real PNG, made in the page so the test needs no file on disk
const png = async (page: import("@playwright/test").Page, color: string) => {
  const data = await page.evaluate((c) => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 48;
    const g = cv.getContext("2d")!;
    g.fillStyle = c;
    g.fillRect(0, 0, 64, 48);
    return cv.toDataURL("image/png").split(",")[1];
  }, color);
  return { name: `${color.slice(1)}.png`, mimeType: "image/png", buffer: Buffer.from(data, "base64") };
};

test("profile: post a photo with a caption", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Post: ignite the vibe" }).click();
  await expect(page.getByRole("heading", { name: "IGNITE THE VIBE" })).toBeVisible();
  await page.getByRole("button", { name: "Photo", exact: true }).click();
  await page.getByLabel("Choose a photo").setInputFiles(await png(page, "#6b3543"));
  await expect(page.getByAltText("The photo you picked")).toBeVisible();
  await page.getByLabel("Caption").fill("Sunset from the rooftop in Old Manali");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Sunset from the rooftop in Old Manali").first()).toBeVisible();
});

test("profile: make an album, watch it, change it", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "New", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New album" });
  await editor.getByLabel("Name").fill("Hampta");
  await editor.getByLabel("Add photos").setInputFiles([await png(page, "#51202c"), await png(page, "#2f4736")]);
  await expect(editor.getByRole("img", { name: /^Photo \d/ })).toHaveCount(2);
  await editor.getByRole("button", { name: "Make photo 2 the cover" }).click();
  await editor.getByRole("button", { name: "Add to profile" }).click();
  await page.getByRole("button", { name: "Hampta, 2 photos" }).click();
  const viewer = page.getByRole("dialog", { name: /Hampta, photo 1 of 2/ });
  await expect(viewer).toBeVisible();
  await viewer.getByRole("button", { name: "Next photo" }).click();
  await expect(page.getByRole("dialog", { name: /photo 2 of 2/ })).toBeVisible();
  await page.getByRole("button", { name: "Edit album" }).click();
  const edit = page.getByRole("dialog", { name: "Edit album" });
  await edit.getByRole("button", { name: "Remove photo 1" }).click();
  await edit.getByRole("button", { name: "Save album" }).click();
  await expect(page.getByRole("button", { name: "Hampta, 1 photo" })).toBeVisible();
});

test("profile: lists open what they hold", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("button", { name: "Join", exact: true }).first().click();
  await page.goto("/profile");
  const plans = page.getByRole("listbox", { name: "Your plans" });
  await expect(plans.getByRole("option")).toHaveCount(1);
  await plans.getByRole("option").first().click();
  await expect(page).toHaveURL(/\/events\//);
});

test("explore: the wheel names its parts and takes you there", async ({ page }) => {
  await page.goto("/explore");
  const wheel = page.getByRole("listbox", { name: /Parts of Explore/ });
  await expect(wheel.getByRole("option")).toHaveText(["Places to visit", "Posts like yours", "Day plans"]);
  await wheel.getByRole("option", { name: "Day plans" }).click();
  await expect(page.locator("#day-plans")).toBeInViewport();
  await expect(wheel.getByRole("option", { name: "Day plans" })).toHaveAttribute("aria-selected", "true");
});

test("day plans: save one for later, then customize it in the builder", async ({ page }) => {
  await page.goto("/explore");
  const plan = page.locator("#old-manali-slow");
  await plan.getByRole("button", { name: /Save A slow day in Old Manali for later/ }).click();
  await expect(plan.getByRole("button", { name: /is saved for later/ })).toHaveText("Saved ✓");
  await plan.getByRole("button", { name: "Customize A slow day in Old Manali" }).click();
  await expect(page).toHaveURL(/section=itinerary/);
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("A slow day in Old Manali");
  // customizing used the saved copy, not a second one
  await page.goto("/explore");
  await expect(page.locator("#old-manali-slow").getByRole("button", { name: /is saved for later/ })).toBeVisible();
});
