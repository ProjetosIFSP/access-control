import { db } from "@/db";
import { profile } from "@/db/schema/profile";
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";

export const createProfile = async (data: { name: string; description?: string }) => {
  const id = uuidv7();
  await db.insert(profile).values({ id, name: data.name, description: data.description ?? "" });
  const rows = await db.select().from(profile).where(eq(profile.id, id));
  return rows[0];
};
