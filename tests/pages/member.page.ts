import type { Page, Response } from "@playwright/test";

export class MemberPage {
  slug = "";
  memberToken = "";

  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(`/g/${this.slug}/m/${this.memberToken}`);
  }

  private waitForPost(): Promise<Response> {
    const urlBase = this.slug ? `/g/${this.slug}/` : "/g/";
    return this.page.waitForResponse(
      (r) => r.url().includes(urlBase) && r.request().method() === "POST"
    );
  }

  async memberLoggedInAs(): Promise<string> {
    return this.page.locator("p").filter({ hasText: "Logged in as" }).innerText();
  }

  async balances(): Promise<string> {
    return this.page.getByRole("region", { name: /your balances/i }).innerText();
  }

  async addExpense({
    description,
    amount,
    paidBy,
    splitAmong,
  }: {
    description: string;
    amount: string;
    paidBy: string;
    splitAmong?: string[];
  }): Promise<void> {
    const section = this.page.getByRole("region", { name: /add expense/i });

    await section.getByLabel(/what was it for/i).fill(description);
    await section.getByLabel(/amount/i).fill(amount);

    // Options may include "(you)" suffix — select by value of the matching option
    const matchingOption = section
      .locator("#paidBy option")
      .filter({ hasText: paidBy })
      .first();
    const value = await matchingOption.getAttribute("value");
    if (!value) {
      throw new Error(`Member option not found: ${paidBy}`);
    }
    await section.getByLabel(/who paid/i).selectOption(value);

    if (splitAmong !== undefined) {
      const group = section.getByRole("group", { name: /split among/i });
      const checkboxes = group.getByRole("checkbox");
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).uncheck();
      }
      for (const memberName of splitAmong) {
        await group
          .getByRole("checkbox", { name: new RegExp(memberName) })
          .check();
      }
    }

    await Promise.all([
      this.waitForPost(),
      section.getByRole("button", { name: /add expense/i }).click(),
    ]);
    await this.page.getByRole("heading", { level: 3, name: description }).waitFor();
  }

  async expenseDescriptions(): Promise<string[]> {
    const section = this.page.getByRole("region", { name: /expenses/i });
    return section.getByRole("heading", { level: 3 }).allTextContents();
  }
}
