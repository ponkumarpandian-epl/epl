import "server-only";
import { cache } from "react";
import { api } from "./api";

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Professional";

export interface ProfileSkillDto {
  gameId:   string;
  gameName: string;
  gameSlug: string;
  level:    SkillLevel;
}

export interface ProfileDto {
  id:          string;
  fullName:    string;
  email:       string | null;
  phoneNumber: string | null;
  avatarUrl:   string | null;
  roles:       string[];
  skills:      ProfileSkillDto[];
}

export const getMyProfile = cache(async (): Promise<ProfileDto | null> => {
  const res = await api.get<ProfileDto>("/api/profile/me");
  return res.ok ? res.data : null;
});
