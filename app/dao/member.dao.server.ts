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
    id: row.id as number,
    group_id: row.group_id as number,
    name: row.name as string,
    token: row.token as string,
    created_at: row.created_at as string,
  };
}

export const MemberDAO = {
  async create(groupId: number, name: string): Promise<Member> {
    const token = crypto.randomUUID();

    const result = await db.execute({
      sql: "INSERT INTO members (group_id, name, token) VALUES (?, ?, ?) RETURNING *",
      args: [groupId, name, token],
    });

    return rowToMember(result.rows[0] as unknown as Record<string, unknown>);
  },

  async findByGroupId(groupId: number): Promise<Member[]> {
    const result = await db.execute({
      sql: "SELECT * FROM members WHERE group_id = ? ORDER BY created_at",
      args: [groupId],
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
      sql: "SELECT * FROM members WHERE group_id = ? AND token = ?",
      args: [groupId, token],
    });
    return result.rows.length > 0
      ? rowToMember(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },

  async findById(id: number): Promise<Member | null> {
    const result = await db.execute({
      sql: "SELECT * FROM members WHERE id = ?",
      args: [id],
    });
    return result.rows.length > 0
      ? rowToMember(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },

  async findByToken(token: string): Promise<Member | null> {
    const result = await db.execute({
      sql: "SELECT * FROM members WHERE token = ?",
      args: [token],
    });
    return result.rows.length > 0
      ? rowToMember(result.rows[0] as unknown as Record<string, unknown>)
      : null;
  },
};
