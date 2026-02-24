export const assignProfileToRoom = async (profileId: string, roomId: string) => {
  // persistir associação profile_room_permission no DB
  return { ok: true } as const;
};
