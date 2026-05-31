import "server-only";
import { cookies, headers } from "next/headers";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

async function forwardedHeaders(extra?: HeadersInit): Promise<Headers> {
  const h = new Headers(extra);
  const ck = await cookies();
  const cookieHeader = ck.getAll().map(c => `${c.name}=${c.value}`).join("; ");
  if (cookieHeader) h.set("cookie", cookieHeader);
  const reqHeaders = await headers();
  const cid = reqHeaders.get("x-correlation-id");
  if (cid) h.set("x-correlation-id", cid);
  if (!h.has("content-type")) h.set("content-type", "application/json");
  return h;
}

function parseSetCookie(raw: string): { name: string; value: string; options: Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2] } | null {
  const parts = raw.split(";").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  const eq = first.indexOf("=");
  if (eq < 0) return null;

  const name  = first.substring(0, eq).trim();
  const value = first.substring(eq + 1).trim();

  const options: Record<string, unknown> = {};
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    const e   = seg.indexOf("=");
    const key = (e < 0 ? seg : seg.substring(0, e)).toLowerCase().trim();
    const val = e < 0 ? "" : seg.substring(e + 1).trim();

    switch (key) {
      case "path":     options.path     = val; break;
      case "domain":   options.domain   = val; break;
      case "expires":  { const d = new Date(val); if (!Number.isNaN(d.getTime())) options.expires = d; break; }
      case "max-age":  { const n = Number(val);    if (Number.isFinite(n))         options.maxAge  = n; break; }
      case "httponly": options.httpOnly = true;  break;
      case "secure":   options.secure   = true;  break;
      case "samesite": {
        const s = val.toLowerCase();
        if (s === "lax" || s === "strict" || s === "none") options.sameSite = s;
        break;
      }
    }
  }
  return { name, value, options: options as Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2] };
}

async function forwardSetCookies(res: Response): Promise<void> {
  const setCookies = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  if (setCookies.length === 0) return;

  let jar: Awaited<ReturnType<typeof cookies>>;
  try {
    jar = await cookies();
  } catch {
    return;
  }

  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed) continue;
    try {
      if (parsed.options?.maxAge === 0 || (parsed.options?.expires instanceof Date && parsed.options.expires.getTime() < Date.now())) {
        jar.delete(parsed.name);
      } else {
        jar.set(parsed.name, parsed.value, parsed.options);
      }
    } catch {
      // outside Server Action / Route Handler → silently skip
    }
  }
}

export interface ApiSuccess<T>  { ok: true;  data: T;                                                 status: number; }
export interface ApiFailure     { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]>; status: number; }
export type     ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function call<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_INTERNAL_URL}${path}`, {
      ...init,
      headers: await forwardedHeaders(init.headers),
      cache: "no-store",
    });
  } catch (e) {
    return {
      ok: false,
      code: "api_unreachable",
      message: `Cannot reach API at ${API_INTERNAL_URL}. ${(e as Error).message}`,
      status: 0,
    };
  }

  await forwardSetCookies(res);

  const text = await res.text();
  const body = text ? safeJson(text) : null;

  if (res.ok) return { ok: true, data: body as T, status: res.status };

  const b = (body ?? {}) as Record<string, unknown>;
  const message = (typeof b.message === "string" ? b.message
                : typeof b.title   === "string" ? b.title
                : `Request failed (${res.status})`);
  const code    = (typeof b.code === "string" ? b.code
                : typeof b.type === "string" ? b.type
                : "request_failed");
  const fieldErrors = (b.errors && typeof b.errors === "object")
    ? (b.errors as Record<string, string[]>)
    : undefined;
  return { ok: false, code, message, fieldErrors, status: res.status };
}

function safeJson(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return null; }
}

export const api = {
  get:   <T>(path: string)                 => call<T>(path, { method: "GET" }),
  post:  <T>(path: string, body?: unknown) => call<T>(path, { method: "POST",  body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => call<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
};
