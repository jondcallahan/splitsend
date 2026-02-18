import { db } from "~/db.server";
import { generateSlug } from "~/lib/slugs.server";

export interface Group {
  id: number;
  name: string;
  slug: string;
  admin_token: string;
  created_at: string;
}

export const GroupDAO = {
  create(name: string): Group {
    let slug = generateSlug();

    // Retry on slug collision (unlikely but possible)
    const existing = db.prepare("SELECT id FROM groups WHERE slug = ?");
    let attempts = 0;
    while (existing.get(slug) && attempts < 10) {
      slug = generateSlug();
      attempts++;
    }

    const adminToken = crypto.randomUUID();

    const result = db
      .prepare(
        "INSERT INTO groups (name, slug, admin_token) VALUES (?, ?, ?) RETURNING *"
      )
      .get(name, slug, adminToken) as Group;

    return result;
  },

  findByAdminToken(adminToken: string): Group | null {
    return (
      (db
        .prepare("SELECT * FROM groups WHERE admin_token = ?")
        .get(adminToken) as Group) ?? null
    );
  },

  findBySlug(slug: string): Group | null {
    return (
      (db.prepare("SELECT * FROM groups WHERE slug = ?").get(slug) as Group) ??
      null
    );
  },

  findBySlugAndAdminToken(slug: string, adminToken: string): Group | null {
    return (
      (db
        .prepare("SELECT * FROM groups WHERE slug = ? AND admin_token = ?")
        .get(slug, adminToken) as Group) ?? null
    );
  },

  updateName(id: number, name: string): void {
    db.prepare("UPDATE groups SET name = ? WHERE id = ?").run(name, id);
  },
};
