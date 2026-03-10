import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

import type { BlockSummary, RoomSummaryAdmin, RoomType } from "@/services/rooms/types";

// ── Constants ─────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20;
export const TABS = ["rooms", "blocks", "types"] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActiveTab = (typeof TABS)[number];

export type PanelMode =
  | { kind: "none" }
  | { kind: "createRoom" }
  | { kind: "editRoom"; item: RoomSummaryAdmin }
  | { kind: "createBlock" }
  | { kind: "editBlock"; item: BlockSummary }
  | { kind: "createRoomType" }
  | { kind: "editRoomType"; item: RoomType };

// ── Search params ─────────────────────────────────────────────────────────────

export const roomsSearchParams = {
  q: parseAsString.withDefault(""),
  tab: parseAsStringLiteral(TABS).withDefault("rooms"),
  typeIds: parseAsArrayOf(parseAsString).withDefault([]),
  blockIds: parseAsArrayOf(parseAsString).withDefault([]),
  page: parseAsInteger.withDefault(1),
};
