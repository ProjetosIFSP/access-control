import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import type { SwaggerTransform } from "@fastify/swagger";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import type { SchemaWithExamples } from "./openapi";

type JsonSchemaNode = Record<string, any>;

const attachExample = (schemaNode: unknown, example: unknown): JsonSchemaNode => {
	if (!schemaNode || typeof schemaNode !== "object") {
		return schemaNode as JsonSchemaNode;
	}

	const node = schemaNode as JsonSchemaNode;

	if ("$ref" in node) {
		return {
			allOf: [node],
			example,
		};
	}

	return {
		...node,
		example,
	};
};

const swaggerTransformWithExamples: SwaggerTransform<SchemaWithExamples> = (
	input,
) => {
	const base = jsonSchemaTransform(input as any);
	const typedSchema = input.schema as SchemaWithExamples | undefined;

	if (!typedSchema) {
		return base;
	}

	const enrichedSchema: JsonSchemaNode = {
		...(base.schema as JsonSchemaNode),
	};

	if (typedSchema.responseExamples && enrichedSchema.response) {
		enrichedSchema.response = { ...enrichedSchema.response };
		for (const [statusCode, example] of Object.entries(
			typedSchema.responseExamples,
		)) {
			const responseSchema = enrichedSchema.response?.[statusCode];
			if (responseSchema) {
				enrichedSchema.response[statusCode] = attachExample(
					responseSchema,
					example,
				);
			}
		}
	}

	if (typedSchema.bodyExample && enrichedSchema.body) {
		enrichedSchema.body = attachExample(
			enrichedSchema.body,
			typedSchema.bodyExample,
		);
	}

	if (typedSchema.paramsExample && enrichedSchema.params) {
		enrichedSchema.params = attachExample(
			enrichedSchema.params,
			typedSchema.paramsExample,
		);
	}

	if (typedSchema.querystringExample && enrichedSchema.querystring) {
		enrichedSchema.querystring = attachExample(
			enrichedSchema.querystring,
			typedSchema.querystringExample,
		);
	}

	if (typedSchema.headersExample && enrichedSchema.headers) {
		enrichedSchema.headers = attachExample(
			enrichedSchema.headers,
			typedSchema.headersExample,
		);
	}

	return {
		...base,
		schema: enrichedSchema,
	};
};

export async function registerDocs(app: FastifyInstance) {
	await app.register(fastifySwagger, {
		openapi: {
			info: {
				title: "Access Control API",
				description:
					"API REST para gerenciamento de usuários, salas e integrações IoT do sistema de controle de acesso.",
				version: "1.0.0",
			},
			externalDocs: {
				description: "Repositório do projeto",
				url: "https://github.com/ProjetosIFSP/access-control",
			},
			tags: [
				{ name: "auth", description: "Fluxo de autenticação e sessões" },
				{ name: "users", description: "Gestão de usuários e credenciais" },
				{ name: "rooms", description: "Inventário de blocos, salas e status" },
				{
					name: "doors",
					description:
						"Operações administrativas de controladores físicos (portas) e auditoria",
				},
				{
					name: "iot",
					description:
						"Contrato MQTT/HTTP consumido pelos dispositivos ESP32 instalados nas portas",
				},
			],
			components: {
				securitySchemes: {
					sessionCookie: {
						type: "apiKey",
						in: "cookie",
						name: "auth_session",
						description:
							"Sessão de usuário gerenciada pela camada Auth baseada em cookies.",
					},
				},
			},
		},
		transform: swaggerTransformWithExamples,
	});

	await app.register(fastifySwaggerUi, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: false,
		},
	});
}
