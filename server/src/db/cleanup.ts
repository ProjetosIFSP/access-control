import { client, db } from "."
import { user } from "./schema/auth"
import { block, room, roomType } from "./schema/room"

async function cleanup() {
  await db.delete(room)
  await db.delete(roomType)
  await db.delete(block)
  await db.delete(user)
}

cleanup().finally(() => {
  client.end()
})
