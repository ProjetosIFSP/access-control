import path from "node:path";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerDocs } from "./docs";
import { authRoute } from "./routes/auth";
import { blockRoute } from "./routes/block";
import { credentialsRoute } from "./routes/credentials";
import { doorRoute } from "./routes/door";
import { iotRoute } from "./routes/iot";
import { logsRoute } from "./routes/logs";
import { profileRoute } from "./routes/profile";
import { roomRoute } from "./routes/room";
import { roomTypesRoute } from "./routes/room-types"; // GET / added
import { userRoute } from "./routes/user";

const app = fastify({
	routerOptions: {
		caseSensitive: false,
	},
}).withTypeProvider<ZodTypeProvider>();

async function bootstrap() {
	app.register(fastifyCors, {
		origin: (origin, cb) => {
			if (
				!origin ||
				origin.startsWith("http://localhost") ||
				origin.startsWith("http://127.0.0.1") ||
				origin.match(/^http:\/\/192\.168\./)
			) {
				cb(null, true);
				return;
			}
			cb(null, true); // Fallback to allowing all in dev so the app is robust.
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
	});

	app.register(fastifyStatic, {
		root: path.join(__dirname, "../../public"),
		prefix: "/public/", // optional: default '/'
	});

	await registerDocs(app);

	app.register(authRoute, { prefix: "/auth" });
	app.register(userRoute, { prefix: "/users" });
	app.register(logsRoute, { prefix: "/logs" });
	app.register(roomRoute, { prefix: "/rooms" });
	app.register(roomTypesRoute, { prefix: "/room-types" });
	app.register(doorRoute, { prefix: "/doors" });
	app.register(credentialsRoute, { prefix: "/credentials" });
	app.register(iotRoute, { prefix: "/iot" });
	app.register(blockRoute, { prefix: "/blocks" });
	app.register(profileRoute, { prefix: "/profiles" });
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
