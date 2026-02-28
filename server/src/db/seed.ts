import { client, db } from "."
import { user } from "./schema/auth"
import { block, room, roomType } from "./schema/room"

async function seed() {
  await db.delete(room)
  await db.delete(roomType)
  await db.delete(block)
  await db.delete(user)

  const [userReturning] = await db.insert(user).values([
    {
      name: "Admin User",
      email: "[EMAIL_ADDRESS]",
      emailVerified: true,
      isAdmin: true,
    }
  ]).returning()

  const blockReturning = await db.insert(block).values([
    {
      name: "Bloco A",
    },
    {
      name: "Bloco B",
    },
    {
      name: "Bloco C",
    },
    {
      name: "Bloco D",
    }
  ]).returning()

  const roomTypeReturning = await db.insert(roomType).values([
    {
      name: "Sala de Aula",
    },
    {
      name: "Laboratório de Informática",
    },
    {
      name: "Laboratório de Eletrônica",
    },
    {
      name: "Almoxarifado",
    },
    {
      name: "Sala de Reunião",
    }
  ]).returning()

  const roomReturning = await db.insert(room).values([
    {
      name: "A101",
      blockId: blockReturning[0].id,
      typeId: roomTypeReturning[0].id,
    },
    {
      name: "A106",
      blockId: blockReturning[0].id,
      typeId: roomTypeReturning[1].id,
    },
    {
      name: "A107",
      blockId: blockReturning[0].id,
      typeId: roomTypeReturning[2].id,
    },
    {
      name: "D104",
      blockId: blockReturning[3].id,
      typeId: roomTypeReturning[1].id,
    }
  ]).returning()
}

seed().finally(() => {
  client.end()
})