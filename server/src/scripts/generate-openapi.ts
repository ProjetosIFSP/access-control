import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import fastify from "fastify";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerDocs } from "@/api/docs";
import { authRoute } from "@/api/routes/auth";
import { userRoute } from "@/api/routes/user";
import { roomRoute } from "@/api/routes/room";
import { doorRoute } from "@/api/routes/door";
import { iotRoute } from "@/api/routes/iot";

async function generateOpenApiSpec() {
	const app = fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	await registerDocs(app);

	app.register(authRoute, { prefix: "/auth" });
	app.register(userRoute, { prefix: "/users" });
	app.register(roomRoute, { prefix: "/rooms" });
	app.register(doorRoute, { prefix: "/doors" });
	app.register(iotRoute, { prefix: "/iot" });

	await app.ready();

	const document = app.swagger();
	const yamlDocument = app.swagger({ yaml: true });

	const outputDir = resolve(__dirname, "../../docs");
	await mkdir(outputDir, { recursive: true });

	await writeFile(resolve(outputDir, "openapi.json"), JSON.stringify(document, null, 2));
	await writeFile(resolve(outputDir, "openapi.yaml"), yamlDocument);

	await app.close();
}

generateOpenApiSpec().catch((error) => {
	console.error("Falha ao gerar a especificação OpenAPI:", error);
	process.exit(1);
});
