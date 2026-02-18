import { expect, test } from "./fixtures";

test.beforeEach(async ({ homePage, adminPage }) => {
  await homePage.goto();
  const url = await homePage.createGroup(`Admin Test ${Date.now()}`);
  const match = url.match(/\/g\/([^/]+)\/admin\/([^/]+)/);
  if (!match) {throw new Error(`Unexpected URL: ${url}`);}
  adminPage.slug = match[1];
  adminPage.adminToken = match[2];
});

test("add member appears in table", async ({ adminPage }) => {
  await adminPage.addMember("Alice");
  const names = await adminPage.memberNames();
  expect(names).toContain("Alice");
});

test("add expense form appears with 2+ members", async ({
  page,
  adminPage,
}) => {
  await adminPage.addMember("Alice");
  await adminPage.addMember("Bob");
  await expect(page.getByRole("heading", { name: /add expense/i })).toBeVisible();
});

test("add expense shows in list with correct splits", async ({ adminPage }) => {
  await adminPage.addMember("Alice");
  await adminPage.addMember("Bob");
  await adminPage.addExpense({
    amount: "90",
    description: "Groceries",
    paidBy: "Alice",
    splitAmong: ["Alice", "Bob"],
  });

  const descriptions = await adminPage.expenseDescriptions();
  expect(descriptions).toContain("Groceries");

  const settlements = await adminPage.settlements();
  expect(settlements).toHaveLength(1);
  expect(settlements[0]).toMatchObject({ from: "Bob", to: "Alice" });
  expect(settlements[0].amount).toContain("45");
});

test("edit expense updates description", async ({ adminPage }) => {
  await adminPage.addMember("Alice");
  await adminPage.addMember("Bob");
  await adminPage.addExpense({
    amount: "30",
    description: "Groceries",
    paidBy: "Alice",
  });
  await adminPage.editExpense("Groceries", { description: "Supermarket" });

  const descriptions = await adminPage.expenseDescriptions();
  expect(descriptions).toContain("Supermarket");
  expect(descriptions).not.toContain("Groceries");
});

test("delete expense removes from list", async ({ adminPage }) => {
  await adminPage.addMember("Alice");
  await adminPage.addMember("Bob");
  await adminPage.addExpense({
    amount: "20",
    description: "Coffee",
    paidBy: "Alice",
  });
  await adminPage.deleteExpense("Coffee");

  const descriptions = await adminPage.expenseDescriptions();
  expect(descriptions).not.toContain("Coffee");
});

test("rename group updates heading", async ({ adminPage }) => {
  await adminPage.renameGroup("New Name");
  const heading = await adminPage.groupHeading();
  expect(heading).toBe("New Name");
});

test("member invite URL opens member page in a fresh context", async ({
  browser,
  adminPage,
}) => {
  await adminPage.addMember("Alice");
  const aliceUrl = await adminPage.memberInviteUrl("Alice");
  expect(aliceUrl).toMatch(/\/g\/.+\/m\/.+/);

  const ctx = await browser.newContext();
  const freshPage = await ctx.newPage();
  await freshPage.goto(aliceUrl);

  await expect(freshPage).toHaveURL(/\/g\/.+\/m\/.+/);
  await expect(
    freshPage.locator("p strong").filter({ hasText: "Alice" })
  ).toBeVisible();

  await ctx.close();
});
