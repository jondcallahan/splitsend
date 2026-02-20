import { expect, test } from "./fixtures";

test("renders hero content", async ({ page, homePage }) => {
  await homePage.goto();
  await expect(page.locator("h1")).toContainText("SplitSend");
  await expect(
    page.getByRole("button", { name: /create group/i })
  ).toBeVisible();
  await expect(page.getByText(/how to split bills/i)).toBeVisible();
});

test("create group navigates to admin", async ({ homePage }) => {
  await homePage.goto();
  const url = await homePage.createGroup(`Test Group ${Date.now()}`);
  expect(url).toMatch(/\/g\/.+\/admin\/.+/);
});

test("recent groups appear after creating a group", async ({
  page,
  homePage,
}) => {
  await homePage.goto();
  const groupName = `Recent Test ${Date.now()}`;
  await homePage.createGroup(groupName);
  await page.goto("/");
  const names = await homePage.recentGroupNames();
  expect(names).toContain(groupName);
});
