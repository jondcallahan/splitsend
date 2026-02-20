import type { Page, Response } from "@playwright/test";

export class AdminPage {
  slug = "";
  adminToken = "";

  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(`/g/${this.slug}/admin/${this.adminToken}`);
  }

  private waitForPost(): Promise<Response> {
    return this.page.waitForResponse(
      (r) =>
        r.url().includes(`/g/${this.slug}/`) && r.request().method() === "POST"
    );
  }

  async addMember(name: string): Promise<void> {
    await this.page.getByRole("textbox", { name: /member name/i }).fill(name);
    await Promise.all([
      this.waitForPost(),
      this.page.getByRole("button", { name: "Add" }).click(),
    ]);
    await this.page
      .getByRole("table", { name: /members/i })
      .getByRole("cell", { name })
      .waitFor();
  }

  async memberNames(): Promise<string[]> {
    const rows = await this.page
      .getByRole("table", { name: /members/i })
      .locator("tbody")
      .getByRole("row")
      .all();
    return Promise.all(
      rows.map((row) => row.getByRole("cell").first().textContent())
    );
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
    await section.getByLabel(/who paid/i).selectOption({ label: paidBy });

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
    await this.page
      .getByRole("heading", { level: 3, name: description })
      .waitFor();
  }

  async editExpense(
    currentDescription: string,
    updates: { description?: string; amount?: string }
  ): Promise<void> {
    // The expense description is an h3 — go up two levels to reach the expense container
    const expenseContainer = this.page
      .getByRole("heading", { level: 3, name: currentDescription })
      .locator("../..");

    // locator() can find hidden elements; filter by dialog heading text
    const closedDialog = expenseContainer
      .locator("dialog")
      .filter({ hasText: "Edit Expense" });
    const dialogId = await closedDialog.getAttribute("id");
    if (!dialogId) {
      throw new Error(`No edit dialog found for "${currentDescription}"`);
    }

    await this.page.evaluate((id) => {
      (document.querySelector(`#${id}`) as HTMLDialogElement)?.showModal();
    }, dialogId);

    // Dialog now open → getByRole finds it in the accessibility tree
    const dialog = this.page.getByRole("dialog", { name: "Edit Expense" });
    await dialog.waitFor({ state: "visible" });

    if (updates.description !== undefined) {
      await dialog.getByLabel("Description").fill(updates.description);
    }
    if (updates.amount !== undefined) {
      await dialog.getByLabel(/amount/i).fill(updates.amount);
    }

    const finalDescription = updates.description ?? currentDescription;
    await Promise.all([
      this.waitForPost(),
      dialog.getByRole("button", { name: /save/i }).click(),
    ]);
    await this.page
      .getByRole("heading", { level: 3, name: finalDescription })
      .waitFor();
  }

  async deleteExpense(description: string): Promise<void> {
    const expenseContainer = this.page
      .getByRole("heading", { level: 3, name: description })
      .locator("../..");

    const closedDialog = expenseContainer
      .locator("dialog")
      .filter({ hasText: "Delete Expense?" });
    const dialogId = await closedDialog.getAttribute("id");
    if (!dialogId) {
      throw new Error(`No delete dialog found for "${description}"`);
    }

    await this.page.evaluate((id) => {
      (document.querySelector(`#${id}`) as HTMLDialogElement)?.showModal();
    }, dialogId);

    const dialog = this.page.getByRole("dialog", { name: "Delete Expense?" });
    await dialog.waitFor({ state: "visible" });

    await Promise.all([
      this.waitForPost(),
      dialog.getByRole("button", { name: "Delete" }).click(),
    ]);
    await this.page
      .getByRole("heading", { level: 3, name: description })
      .waitFor({ state: "detached" });
  }

  async renameGroup(newName: string): Promise<void> {
    await this.page.evaluate(() => {
      (
        document.querySelector("#rename-dialog") as HTMLDialogElement
      )?.showModal();
    });
    const dialog = this.page.getByRole("dialog", { name: "Rename Group" });
    await dialog.waitFor({ state: "visible" });
    await dialog.getByLabel(/group name/i).fill(newName);
    await Promise.all([
      this.waitForPost(),
      dialog.getByRole("button", { name: /save/i }).click(),
    ]);
    await this.page
      .getByRole("heading", { level: 1 })
      .filter({ hasText: newName })
      .waitFor();
  }

  async groupHeading(): Promise<string> {
    return this.page.getByRole("heading", { level: 1 }).textContent();
  }

  async settlements(): Promise<{ from: string; to: string; amount: string }[]> {
    const section = this.page.getByRole("region", { name: /settlements/i });
    const items = section.getByRole("listitem");
    const count = await items.count();
    const results: { from: string; to: string; amount: string }[] = [];

    for (let i = 0; i < count; i++) {
      const strongs = await items.nth(i).locator("strong").allTextContents();
      if (strongs.length >= 3) {
        results.push({ amount: strongs[2], from: strongs[0], to: strongs[1] });
      }
    }
    return results;
  }

  async expenseDescriptions(): Promise<string[]> {
    const section = this.page.getByRole("region", { name: /expenses/i });
    return section.getByRole("heading", { level: 3 }).allTextContents();
  }

  async memberInviteUrl(memberName: string): Promise<string> {
    await this.page.evaluate(() => {
      const win = window as typeof window & { __capturedUrl?: string };
      win.__capturedUrl = undefined;
      navigator.clipboard.writeText = (text: string): Promise<void> => {
        win.__capturedUrl = text;
        return Promise.resolve();
      };
    });

    const row = this.page.getByRole("row").filter({ hasText: memberName });
    await row.getByRole("button", { name: /copy link/i }).click();

    const url = await this.page.evaluate(
      () => (window as typeof window & { __capturedUrl?: string }).__capturedUrl
    );
    return url ?? "";
  }
}
