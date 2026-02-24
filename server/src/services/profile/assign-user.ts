export const assignUserToProfile = async (userId: string, profileId: string) => {
  // persistir associação user_profile no DB
  return { ok: true } as const;
};
