import { db } from "~/db.server";

export interface Member {
  id: number;
  group_id: number;
  name: string;
  token: string;
  created_at: string;
}

export const MemberDAO = {
  create(groupId: number, name: string): Member {
    const token = crypto.randomUUID();

    return db
      .prepare(
        "INSERT INTO members (group_id, name, token) VALUES (?, ?, ?) RETURNING *"
      )
      .get(groupId, name, token) as Member;
  },

  findByGroupId(groupId: number): Member[] {
    return db
      .query("SELECT * FROM members WHERE group_id = ? ORDER BY created_at")
      .all(groupId) as Member[];
  },

  findByGroupIdAndToken(groupId: number, token: string): Member | null {
    return (
      (db
        .query("SELECT * FROM members WHERE group_id = ? AND token = ?")
        .get(groupId, token) as Member) ?? null
    );
  },

  findById(id: number): Member | null {
    return (
      (db.query("SELECT * FROM members WHERE id = ?").get(id) as Member) ?? null
    );
  },

  findByToken(token: string): Member | null {
    return (
      (db
        .query("SELECT * FROM members WHERE token = ?")
        .get(token) as Member) ?? null
    );
  },
};
