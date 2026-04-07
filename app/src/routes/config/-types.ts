import { parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs";

export type ConfigActiveTab = "controllers" | "credentials";

export const configSearchParams = {
	tab: parseAsStringEnum<ConfigActiveTab>([
		"controllers",
		"credentials",
	]).withDefault("controllers"),
	q: parseAsString,
	page: parseAsInteger.withDefault(1),
};

export type IotController = {
	id: string;
	roomId: string | null;
	sensorProtocol: string | null;
	sensorModel: string | null;
	firmwareVersion: string | null;
	lastSeenAt: string;
	isOnline: boolean;
};

export type ControllersResponse = {
	controllers: IotController[];
};
