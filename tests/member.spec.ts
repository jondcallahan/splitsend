import { expect, test } from "./fixtures";
import { MemberPage } from "./pages/member.page";

async function createGroupWithMembers(
  homePage: import("./pages/home.page").HomePage,
  adminPage: import("./pages/admin.page").AdminPage
): Promise<string> {
  await homePage.goto();
  const url = await homePage.createGroup(`Member Test ${Date.now()}`);
  const match = url.match(/\/g\/([^/]+)\/admin\/([^/]+)/);
  if (!match) {
    throw new Error(`Unexpected URL: ${url}`);
  }
  adminPage.slug = match[1];
  adminPage.adminToken = match[2];
  await adminPage.addMember("Alice");
  await adminPage.addMember("Bob");
  return adminPage.memberInviteUrl("Alice");
}

test("member page shows correct name and group", async ({
  browser,
  homePage,
  adminPage,
}) => {
  const aliceUrl = await createGroupWithMembers(homePage, adminPage);

  const ctx = await browser.newContext();
  const freshPage = await ctx.newPage();
  await freshPage.goto(aliceUrl);

  await expect(freshPage).toHaveURL(/\/g\/.+\/m\/.+/);
  await expect(
    freshPage.locator("p strong").filter({ hasText: "Alice" })
  ).toBeVisible();
  await expect(freshPage.getByText(/logged in as/i)).toBeVisible();

  await ctx.close();
});

test("member sees correct balances", async ({
  browser,
  homePage,
  adminPage,
}) => {
  const aliceUrl = await createGroupWithMembers(homePage, adminPage);

  // Admin adds expense: $60, Bob pays, split evenly → Alice owes Bob $30
  await adminPage.addExpense({
    amount: "60",
    description: "Dinner",
    paidBy: "Bob",
  });

  const ctx = await browser.newContext();
  const freshPage = await ctx.newPage();
  await freshPage.goto(aliceUrl);

  const memberPage = new MemberPage(freshPage);
  const balancesText = await memberPage.balances();
  expect(balancesText.toLowerCase()).toMatch(/you owe/);

  await ctx.close();
});

test("member can add an expense", async ({ browser, homePage, adminPage }) => {
  const aliceUrl = await createGroupWithMembers(homePage, adminPage);

  const ctx = await browser.newContext();
  const freshPage = await ctx.newPage();
  await freshPage.goto(aliceUrl);

  const memberPage = new MemberPage(freshPage);
  await memberPage.addExpense({
    amount: "10",
    description: "Coffee",
    paidBy: "Alice",
  });

  const descriptions = await memberPage.expenseDescriptions();
  expect(descriptions).toContain("Coffee");

  await ctx.close();
});
