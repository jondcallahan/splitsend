import { db } from "~/db.server";

export interface Member {
  id: number;
  group_id: number;
  name: string;
  token: string;
  created_at: string;
}

function rowToMember(row: Record<string, unknown>): Member {
  return {
    created_at: row.created_at as string,
    group_id: row.group_id as number,
    id: row.id as number,
    name: row.name as string,
    token: row.token as string,
  };
}

export const MemberDAO = {
  async create(groupId: number, name: string): Promise<Member> {
    const token = crypto.randomUUID();

    const result = await db.execute({
      args: [groupId, name, token],
      sql: "INSERT INTO members (group_id, name, token) VALUES (?, ?, ?) RETURNING *",
    });

    return rowToMember(result.rows[0] as unknown as Record<string, unknown>);
  },

  async findByGroupId(groupId: number): Promise<Member[]> {
    const result = await db.execute({
      args: [groupId],
      sql: "SELECT * FROM members WHERE group_id = ? ORDER BY created_at",
    });
    return result.rows.map((row) =>
      rowToMember(row as unknown as Record<string, unknown>)
    );
  },

  async findByGroupIdAndToken(
    groupId: number,
    token: string
  ): Promise<Member | null> {
    const result = await db.execute({
      args: [groupId, token],
      sql: "SELECT * FROM members WHERE group_id = ? AND token = ?",
    });
    return result.rows.length > 0
      ? rowToMember(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },

  async findById(id: number): Promise<Member | null> {
    const result = await db.execute({
      args: [id],
      sql: "SELECT * FROM members WHERE id = ?",
    });
    return result.rows.length > 0
      ? rowToMember(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },

  async findByToken(token: string): Promise<Member | null> {
    const result = await db.execute({
      args: [token],
      sql: "SELECT * FROM members WHERE token = ?",
    });
    return result.rows.length > 0
      ? rowToMember(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },
};
