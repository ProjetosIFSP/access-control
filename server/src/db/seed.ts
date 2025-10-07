import { client, db } from "."
import { user } from "./schema/auth"
import { block, room } from "./schema/room"

async function seed() {
  const [userReturning] = await db.insert(user).values([
    {
      name: "Admin User",
      email: "admin@example.com",
      emailVerified: true,
      isAdmin: true,
    }
  ]).returning()

  const [blockReturning] = await db.insert(block).values([
    {
      name: "Bloco A",
    }
  ]).returning()

  const [roomReturning] = await db.insert(room).values([
    {
      name: "A101",
      blockId: blockReturning.id,
    }
  ]).returning()
}

seed().finally(() => {
  client.end()
})