import { z } from "../../lib/zod";

export const createProfile = async (data: { name: string; description?: string }) => {
  // Placeholder - persistir com Drizzle
  return {
    id: "00000000-0000-0000-0000-000000000000",
    name: data.name,
    description: data.description ?? "",
    createdAt: new Date(),
  };
};
