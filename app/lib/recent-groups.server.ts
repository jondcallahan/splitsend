export interface RecentGroup {
  name: string;
  url: string;
  role: "admin" | "member";
  memberName?: string;
}

const COOKIE_NAME = "splitsend_recent";
const MAX_GROUPS = 10;

export function parseRecentGroups(cookieHeader: string | null): RecentGroup[] {
  if (!cookieHeader) {
    return [];
  }
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) {
    return [];
  }
  try {
    return JSON.parse(decodeURIComponent(match[1])) as RecentGroup[];
  } catch {
    return [];
  }
}

export function makeRecentGroupsCookie(
  existing: RecentGroup[],
  current: RecentGroup
): string {
  const filtered = existing.filter((g) => g.url !== current.url);
  filtered.unshift(current);
  const groups = filtered.slice(0, MAX_GROUPS);
  const value = encodeURIComponent(JSON.stringify(groups));
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
}
