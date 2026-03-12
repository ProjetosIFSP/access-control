import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

import type { ProfileSummary } from "@/services/profiles/types";
import type { UserSummary } from "@/services/users/types";

// ── Constants ──────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20;
export const TABS = ["users", "profiles"] as const;

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActiveTab = (typeof TABS)[number];

export type PanelMode =
  | { kind: "none" }
  | { kind: "createUser" }
  | { kind: "editUser"; item: UserSummary }
  | { kind: "createProfile" }
  | { kind: "editProfile"; item: ProfileSummary };

// ── Search params parsers ──────────────────────────────────────────────────────

export const usersSearchParams = {
  q: parseAsString.withDefault(""),
  tab: parseAsStringLiteral(TABS).withDefault("users"),
  profileIds: parseAsArrayOf(parseAsString).withDefault([]),
  page: parseAsInteger.withDefault(1),
};
