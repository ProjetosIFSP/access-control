export type ProfileSummary = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
};

export type ProfilesResponse = {
  result: ProfileSummary[];
};

export type CreateProfilePayload = {
  name: string;
  description?: string;
  userIds?: string[];
  roomIds?: string[];
  roomTypeIds?: string[];
};

export type UpdateProfilePayload = {
  id: string;
  name: string;
  description?: string;
  userIds?: string[];
  roomIds?: string[];
  roomTypeIds?: string[];
};

export type ProfileRelations = {
  users: { id: string; name: string; email: string }[];
  rooms: { id: string; name: string; blockId: string }[];
  roomTypes: { id: string; name: string; abbreviation: string }[];
};
