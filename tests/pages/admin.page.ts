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

    // BaseUI Select renders the trigger as role="combobox"
    await section.getByRole("combobox", { name: /who paid/i }).click();
    await this.page.getByRole("option", { name: paidBy }).click();

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
    // Click the Edit button (aria-label="Edit expense: {description}")
    await this.page
      .getByRole("button", { name: `Edit expense: ${currentDescription}` })
      .click();

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
    // Open the edit dialog first via the Edit button
    await this.page
      .getByRole("button", { name: `Edit expense: ${description}` })
      .click();

    const editDialog = this.page.getByRole("dialog", { name: "Edit Expense" });
    await editDialog.waitFor({ state: "visible" });

    // Click "Delete" inside the edit dialog — this closes edit and opens confirmation
    await editDialog.getByRole("button", { name: "Delete" }).click();

    // Wait for the delete confirmation alertdialog
    const confirmDialog = this.page.getByRole("alertdialog");
    await confirmDialog.waitFor({ state: "visible" });

    await Promise.all([
      this.waitForPost(),
      confirmDialog.getByRole("button", { name: "Delete" }).click(),
    ]);
    await this.page
      .getByRole("heading", { level: 3, name: description })
      .waitFor({ state: "detached" });
  }

  async renameGroup(newName: string): Promise<void> {
    // Click the Rename group button (aria-label="Rename group")
    await this.page.getByRole("button", { name: /rename group/i }).click();

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
      // Remove the Web Share API so the clipboard fallback is always used
      (navigator as { share?: unknown }).share = undefined;
      navigator.clipboard.writeText = (text: string): Promise<void> => {
        win.__capturedUrl = text;
        return Promise.resolve();
      };
    });

    const row = this.page.getByRole("row").filter({ hasText: memberName });
    await row.getByRole("button", { name: /share link/i }).click();

    const url = await this.page.evaluate(
      () => (window as typeof window & { __capturedUrl?: string }).__capturedUrl
    );
    return url ?? "";
  }
}
