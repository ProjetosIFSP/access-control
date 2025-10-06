import type { FastifySchema } from "fastify";

export type SchemaWithExamples = FastifySchema & {
	responseExamples?: Record<string, unknown>;
	bodyExample?: unknown;
	paramsExample?: unknown;
	querystringExample?: unknown;
	headersExample?: unknown;
};
