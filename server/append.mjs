import fs from "fs"

const iotPath = "./src/api/routes/iot.ts"
let content = fs.readFileSync(iotPath, "utf-8")

if (!content.includes("getControllersResponseSchema")) {
    const schemaPos = content.indexOf("const registerControllerResponseSchema =")
    
    const schema = `
const getControllersResponseSchema = z.object({
    controllers: z.array(
        z.object({
            id: z.string(),
            roomId: z.string().nullable(),
            sensorProtocol: z.string().nullable(),
            sensorModel: z.string().nullable(),
            firmwareVersion: z.string().nullable(),
            lastSeenAt: z.string(),
            isOnline: z.boolean(),
        })
    )
});
`
    content = content.slice(0, schemaPos) + schema + "\n" + content.slice(schemaPos)
}

if (!content.includes('"/controllers"')) {
const newRoute = `
app.get(
"/controllers",
{
schema: {
tags: ["iot"],
summary: "Lista todos os controladores",
response: {
200: getControllersResponseSchema,
},
} satisfies SchemaWithExamples,
},
async (request, reply) => {
const db = (await import("@/db")).db;
const { doorController } = await import("@/db/schema/room");
const controllers = await db.select().from(doorController);

const now = new Date();

return reply.send({
controllers: controllers.map((c: any) => {
const timeout = 60000; // 60 segundos
const isOnline = (now.getTime() - new Date(c.lastSeenAt).getTime()) < timeout;
return {
id: c.id,
roomId: c.roomId,
sensorProtocol: c.sensorProtocol,
sensorModel: c.sensorModel,
firmwareVersion: c.firmwareVersion,
lastSeenAt: c.lastSeenAt.toISOString(),
isOnline,
};
}),
});
}
);
`
content = content.replace(/};\s*$/, newRoute + "\n};")
}

fs.writeFileSync(iotPath, content)
