export type UserSummary = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  hasCredentials: boolean;
  fingerprintCount: number;
  profiles: { id: string; name: string }[];
};

export type UsersResponse = {
  result: UserSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  isAdmin: boolean;
  password?: string;
  profileIds?: string[];
  roomIds?: string[];
  roomTypeIds?: string[];
};

export type UpdateUserPayload = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  profileIds?: string[];
  roomIds?: string[];
  roomTypeIds?: string[];
};

export type UserRelations = {
  profiles: { id: string; name: string; description: string }[];
  rooms: { id: string; name: string; blockId: string }[];
  roomTypes: { id: string; name: string; abbreviation: string }[];
};
