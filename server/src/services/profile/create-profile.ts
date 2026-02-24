import { db } from "@/db";
import { profile } from "@/db/schema/profile";
import { v7 as uuidv7 } from "uuid";

export const createProfile = async (data: { name: string; description?: string }) => {
  const id = uuidv7();
  await db.insert(profile).values({ id, name: data.name, description: data.description ?? "" }).run();
  const created = await db.select().from(profile).where(profile.id.eq(id)).get();
  return created;
};
