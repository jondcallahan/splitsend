import { test as base } from "@playwright/test";

import { AdminPage } from "./pages/admin.page";
import { HomePage } from "./pages/home.page";
import { MemberPage } from "./pages/member.page";

interface Fixtures {
  homePage: HomePage;
  adminPage: AdminPage;
  memberPage: MemberPage;
}

export const test = base.extend<Fixtures>({
  adminPage: async ({ page }, use) => use(new AdminPage(page)),
  homePage: async ({ page }, use) => use(new HomePage(page)),
  memberPage: async ({ page }, use) => use(new MemberPage(page)),
});

export { expect } from "@playwright/test";
