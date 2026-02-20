import type { Page } from "@playwright/test";

export class HomePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  async createGroup(name: string): Promise<string> {
    await this.page
      .getByRole("textbox", { name: /name your group/i })
      .fill(name);
    await this.page.getByRole("button", { name: /create group/i }).click();
    await this.page.waitForURL(/\/g\/.+\/admin\/.+/);
    return this.page.url();
  }

  async recentGroupNames(): Promise<string[]> {
    // <section> with an <h3>Your recent groups</h3> inside; each link has a <strong> for the group name
    const section = this.page.locator("section").filter({
      has: this.page.getByRole("heading", {
        level: 3,
        name: /your recent groups/i,
      }),
    });
    return section.locator("strong").allTextContents();
  }
}
