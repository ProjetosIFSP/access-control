import fastifyCors from "@fastify/cors";
import fastify from "fastify";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { authRoute } from "./routes/auth";
import { doorRoute } from "./routes/door";
import { iotRoute } from "./routes/iot";
import { roomRoute } from "./routes/room";
import { userRoute } from "./routes/user";

const app = fastify({
	routerOptions: {
		caseSensitive: false,
		defaultRoute: (_req, res) => {
			res.status(404).send({ error: "Not Found" });
		},
	},
}).withTypeProvider<ZodTypeProvider>();

app.register(fastifyCors, {
	origin: ["http://localhost:5173"],
});

app.register(authRoute, { prefix: "/auth" });
app.register(userRoute, { prefix: "/users" });
app.register(roomRoute, { prefix: "/rooms" });
app.register(doorRoute, { prefix: "/doors" });
app.register(iotRoute, { prefix: "/iot" });

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app
	.listen({
		port: 3000,
	})
	.then(() => {
		console.log("----- Backend rodando em http://localhost:3000 -----");
	});
