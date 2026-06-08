import "server-only";
import { cache } from "react";
import { api, type ApiResult } from "./api";
import type { BracketViewDto, DrawFormat, SeedItem } from "./brackets-types";

export * from "./brackets-types";

// ── Public reads ────────────────────────────────────────────────────────────
export const getPublicBracket = cache(async (bracketId: string): Promise<BracketViewDto | null> => {
  const res = await api.get<BracketViewDto>(`/api/brackets/${encodeURIComponent(bracketId)}`);
  return res.ok ? res.data : null;
});

export const getPublicBracketByParent = cache(async (
  parentType: string,
  parentId:   string,
): Promise<BracketViewDto | null> => {
  const qs  = new URLSearchParams({ parentType, parentId }).toString();
  const res = await api.get<BracketViewDto>(`/api/brackets/by-parent?${qs}`);
  return res.ok ? res.data : null;
});

// ── Admin reads ─────────────────────────────────────────────────────────────
export const getAdminBracket = cache(async (bracketId: string): Promise<BracketViewDto | null> => {
  const res = await api.get<BracketViewDto>(`/api/brackets/admin/${encodeURIComponent(bracketId)}`);
  return res.ok ? res.data : null;
});

export const getAdminBracketByParent = cache(async (
  parentType: string,
  parentId:   string,
): Promise<BracketViewDto | null> => {
  const qs  = new URLSearchParams({ parentType, parentId }).toString();
  const res = await api.get<BracketViewDto>(`/api/brackets/admin/by-parent?${qs}`);
  return res.ok ? res.data : null;
});

// ── Admin mutations ─────────────────────────────────────────────────────────
export function createBracket(
  parentType: string,
  parentId:   string,
  format:     DrawFormat,
): Promise<ApiResult<BracketViewDto>> {
  return api.post<BracketViewDto>("/api/brackets/admin", { parentType, parentId, format });
}

export function seedBracket(
  bracketId:    string,
  participants: SeedItem[],
): Promise<ApiResult<BracketViewDto>> {
  return api.put<BracketViewDto>(
    `/api/brackets/admin/${encodeURIComponent(bracketId)}/seed`,
    { participants },
  );
}

export function publishBracket(
  bracketId: string,
  publish:   boolean,
): Promise<ApiResult<BracketViewDto>> {
  return api.post<BracketViewDto>(
    `/api/brackets/admin/${encodeURIComponent(bracketId)}/publish`,
    { publish },
  );
}
