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
};

export type UpdateProfilePayload = {
  id: string;
  name: string;
  description?: string;
};
