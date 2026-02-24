import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";
import { room } from "@/db/schema/room";
import { userRoomPermission, userRoomTypePermission } from "@/db/schema/access";
import { userProfile } from "@/db/schema/profile";
import { profileRoomPermission, profileRoomTypePermission } from "@/db/schema/profile";
import { eq, and } from "drizzle-orm";

export const verifyAccess = async (payload: {
  roomId: string;
  credentialValue: string;
  type: "BIOMETRY" | "RFID";
}) => {
  // buscar sala
  const roomRows = await db.select().from(room).where(eq(room.id, payload.roomId));
  const r = roomRows[0];
  if (!r) return { granted: false, reason: "ROOM_NOT_FOUND" } as const;

  // verificar requisitos multimodais
  if (r.requiresBiometry && payload.type !== "BIOMETRY") return { granted: false, reason: "BIOMETRY_REQUIRED" } as const;
  if (r.requiresRFID && payload.type !== "RFID") return { granted: false, reason: "RFID_REQUIRED" } as const;

  // identificar usuário pela credencial
  const credRows = await db.select().from(accessCredential).where(eq(accessCredential.value, payload.credentialValue));
  const cred = credRows[0];
  const userId = cred?.userId;

  // checar permissões diretas do usuário para a sala
  if (userId) {
    const directRows = await db.select().from(userRoomPermission).where(and(eq(userRoomPermission.userId, userId), eq(userRoomPermission.roomId, payload.roomId)));
    if (directRows[0]) return { granted: true, reason: "DIRECT_USER_ROOM" } as const;

    // checar permissões por tipo
    const byTypeRows = await db.select().from(userRoomTypePermission).where(and(eq(userRoomTypePermission.userId, userId), eq(userRoomTypePermission.roomTypeId, r.typeId)));
    if (byTypeRows[0]) return { granted: true, reason: "DIRECT_USER_ROOM_TYPE" } as const;
  }

  // checar permissões via perfis do usuário
  if (userId) {
    const profiles = await db.select().from(userProfile).where(eq(userProfile.userId, userId));
    for (const p of profiles) {
      const prRows = await db.select().from(profileRoomPermission).where(and(eq(profileRoomPermission.profileId, p.profileId), eq(profileRoomPermission.roomId, payload.roomId)));
      if (prRows[0]) return { granted: true, reason: "PROFILE_ROOM" } as const;

      const prtRows = await db.select().from(profileRoomTypePermission).where(and(eq(profileRoomTypePermission.profileId, p.profileId), eq(profileRoomTypePermission.roomTypeId, r.typeId)));
      if (prtRows[0]) return { granted: true, reason: "PROFILE_ROOM_TYPE" } as const;
    }
  }

  return { granted: false, reason: "NO_PERMISSION" } as const;
};
