import { db } from "~/db.server";
import { generateSlug } from "~/lib/slugs.server";

export interface Group {
  id: number;
  name: string;
  slug: string;
  admin_token: string;
  created_at: string;
}

function rowToGroup(row: Record<string, unknown>): Group {
  return {
    admin_token: row.admin_token as string,
    created_at: row.created_at as string,
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
  };
}

export const GroupDAO = {
  async create(name: string): Promise<Group> {
    let slug = generateSlug();

    // Retry on slug collision (unlikely but possible)
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.execute({
        args: [slug],
        sql: "SELECT id FROM groups WHERE slug = ?",
      });
      if (existing.rows.length === 0) {
        break;
      }
      slug = generateSlug();
      attempts++;
    }

    const adminToken = crypto.randomUUID();

    const result = await db.execute({
      args: [name, slug, adminToken],
      sql: "INSERT INTO groups (name, slug, admin_token) VALUES (?, ?, ?) RETURNING *",
    });

    return rowToGroup(result.rows[0] as unknown as Record<string, unknown>);
  },

  async findByAdminToken(adminToken: string): Promise<Group | null> {
    const result = await db.execute({
      args: [adminToken],
      sql: "SELECT * FROM groups WHERE admin_token = ?",
    });
    return result.rows.length > 0
      ? rowToGroup(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },

  async findBySlug(slug: string): Promise<Group | null> {
    const result = await db.execute({
      args: [slug],
      sql: "SELECT * FROM groups WHERE slug = ?",
    });
    return result.rows.length > 0
      ? rowToGroup(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },

  async findBySlugAndAdminToken(
    slug: string,
    adminToken: string
  ): Promise<Group | null> {
    const result = await db.execute({
      args: [slug, adminToken],
      sql: "SELECT * FROM groups WHERE slug = ? AND admin_token = ?",
    });
    return result.rows.length > 0
      ? rowToGroup(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },

  async updateName(id: number, name: string): Promise<void> {
    await db.execute({
      args: [name, id],
      sql: "UPDATE groups SET name = ? WHERE id = ?",
    });
  },
};
