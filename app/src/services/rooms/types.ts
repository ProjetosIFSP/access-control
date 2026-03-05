export type UserInfo = {
	id: string;
	name: string;
	email: string;
};

export type RoomState = "aberta" | "fechada" | "alerta";

export type RoomSummaryItem = {
	id: string;
	name: string;
	typeAbbreviation: string;
	state: RoomState;
	lastStatusUpdateAt: string | null;
	currentUser?: UserInfo | null;
	lastUser?: UserInfo | null;
};

export type BlockWithRooms = {
	block: { id: string; name: string };
	rooms: RoomSummaryItem[];
};

export type RoomsSummaryResponse = {
	authenticated: boolean;
	isAdmin: boolean;
	result: BlockWithRooms[];
};

export type RoomType = {
	id: string;
	name: string;
	abbreviation: string;
};

export type RoomTypesResponse = {
	result: RoomType[];
};

export type CreateRoomTypePayload = {
	name: string;
	abbreviation: string;
	description?: string;
};

export type UpdateRoomTypePayload = {
	id: string;
	name: string;
	abbreviation: string;
	description?: string;
};

export type RoomsSummaryFilters = {
	q?: string;
	type?: string;
	state?: RoomState;
};

// ── Block types ───────────────────────────────────────────────────────────────

export type BlockSummary = {
	id: string;
	name: string;
};

export type BlocksResponse = {
	result: BlockSummary[];
};

export type CreateBlockPayload = {
	name: string;
};

export type UpdateBlockPayload = {
	id: string;
	name: string;
};

// ── Room CRUD types ───────────────────────────────────────────────────────────

export type RoomSummaryAdmin = {
	id: string;
	name: string;
	blockId: string;
	blockName: string;
	typeId: string;
	typeAbbreviation: string;
	typeName: string;
	requiresBiometry: boolean;
	requiresRFID: boolean;
	doorState: string;
	isLocked: boolean | null;
	lastStatusUpdateAt: string | null;
	createdAt: string;
};

export type RoomsAdminResponse = {
	result: RoomSummaryAdmin[];
};

export type CreateRoomPayload = {
	name: string;
	blockId: string;
	typeId: string;
	requiresBiometry?: boolean;
	requiresRFID?: boolean;
	profileIds?: string[];
	userIds?: string[];
};

export type UpdateRoomPayload = {
	id: string;
	name: string;
	blockId: string;
	typeId: string;
	requiresBiometry?: boolean;
	requiresRFID?: boolean;
	profileIds?: string[];
	userIds?: string[];
};

export type RoomRelations = {
	profiles: { id: string; name: string; description: string }[];
	users: { id: string; name: string; email: string }[];
};
