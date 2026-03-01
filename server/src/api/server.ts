import fastifyCors from "@fastify/cors";
import fastify from "fastify";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerDocs } from "./docs";
import { authRoute } from "./routes/auth";
import { doorRoute } from "./routes/door";
import { iotRoute } from "./routes/iot";
import { roomRoute } from "./routes/room";
import { roomTypesRoute } from "./routes/room-types";
import { userRoute } from "./routes/user";

const app = fastify({
	routerOptions: {
		caseSensitive: false,
	},
}).withTypeProvider<ZodTypeProvider>();

async function bootstrap() {
	app.register(fastifyCors, {
		origin: ["http://localhost:5173", "http://localhost:3000"],
		credentials: true,
	});

	await registerDocs(app);

	app.register(authRoute, { prefix: "/auth" });
	app.register(userRoute, { prefix: "/users" });
	app.register(roomRoute, { prefix: "/rooms" });
	app.register(roomTypesRoute, { prefix: "/room-types" });
	app.register(doorRoute, { prefix: "/doors" });
	app.register(iotRoute, { prefix: "/iot" });
	app.get("/", (_request, reply) => {
		reply.send({
			hello: "Bem vindo à API do sistema de controle de acesso",
			status: "running",
			version: "1.0.0",
			message: "API do sistema de controle de acesso",
		});
	});

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	await app.listen({
		port: 3333,
	});

	console.log("----- Backend rodando em http://localhost:3333 -----");
}

bootstrap().catch((error) => {
	console.error("Erro ao iniciar o servidor", error);
	process.exit(1);
});
