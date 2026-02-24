import { z } from "../../lib/zod";

export const getProfiles = async () => {
  // Placeholder - implementar integração com Drizzle
  return {
    result: [
      {
        id: "00000000-0000-0000-0000-000000000000",
        name: "Default",
        description: "Perfil padrão",
        createdAt: new Date(),
      },
    ],
  } as const;
};
