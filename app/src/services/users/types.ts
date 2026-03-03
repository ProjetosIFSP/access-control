export type UserSummary = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  hasCredentials: boolean;
};

export type UsersResponse = {
  result: UserSummary[];
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
