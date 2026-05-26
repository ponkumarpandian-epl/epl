"use client";
import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ProfileDto, SkillLevel } from "@/lib/profile";
import type { SeasonGameDto } from "@/lib/seasons";
import "./profile.css";

const LEVELS: SkillLevel[] = ["Beginner", "Intermediate", "Advanced", "Professional"];

function initials(name: string, fallback?: string | null) {
  const src = (name && name.trim()) || (fallback && fallback.trim()) || "";
  if (!src) return "U";
  const parts = src.split(/[\s@]/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || src[0]).toUpperCase();
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

interface GameMaster { id: string; name: string; slug: string; }

export function ProfileEditor({
  profile, games,
}: {
  profile: ProfileDto;
  games:   GameMaster[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [busy, setBusy] = useState<"avatar" | "skills" | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; msg?: string }>({ kind: "idle" });

  // Build a map of (gameId → level), pre-filled from profile.skills
  const initialLevels: Record<string, SkillLevel> = {};
  for (const s of profile.skills) initialLevels[s.gameId] = s.level;
  const [levels, setLevels] = useState<Record<string, SkillLevel>>(initialLevels);

  function setLevel(gameId: string, level: SkillLevel) {
    setLevels((prev) => ({ ...prev, [gameId]: level }));
    setStatus({ kind: "idle" });
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy("avatar"); setStatus({ kind: "idle" });

    const form = new FormData();
    form.append("file", f);

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({ kind: "error", msg: body.message ?? `Upload failed (${res.status})` });
        return;
      }
      const data = (await res.json()) as { avatarUrl: string };
      setAvatarUrl(data.avatarUrl);
      setStatus({ kind: "success", msg: "Profile picture updated." });
      // Refresh server components so the header avatar updates everywhere.
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus({ kind: "error", msg: (err as Error).message });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSaveSkills() {
    setBusy("skills"); setStatus({ kind: "idle" });
    const payload = {
      skills: games
        .filter((g) => levels[g.id])    // only send games that have a level chosen
        .map((g) => ({ gameId: g.id, level: levels[g.id] })),
    };
    try {
      const res = await fetch("/api/profile/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({ kind: "error", msg: body.message ?? `Save failed (${res.status})` });
        return;
      }
      setStatus({ kind: "success", msg: "Skills saved." });
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus({ kind: "error", msg: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const contact = profile.email ?? profile.phoneNumber ?? "";
  const role    = profile.roles.includes("Admin") ? "Admin" : profile.roles[0] ?? "Player";

  return (
    <>
      {/* ── Hero ── */}
      <section className="profileHero">
        <div className="avatarFrame">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatarPic" src={avatarUrl} alt="" />
          ) : (
            <span className="avatarInitials">{initials(profile.fullName, contact)}</span>
          )}
          <label className="avatarUploadBtn" title="Upload a new picture" aria-label="Upload a new profile picture">
            <CameraIcon />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={onAvatarChange}
              disabled={busy === "avatar"}
            />
          </label>
        </div>

        <div className="profileIdentity">
          <span className="profileEyebrow">My Profile</span>
          <h1 className="profileName">{profile.fullName}</h1>
          <div className="profileMeta">
            {profile.email && <span>{profile.email}</span>}
            {profile.phoneNumber && <span>· {profile.phoneNumber}</span>}
          </div>
          <span className="profileRolePill">{role}</span>
        </div>
      </section>

      {/* ── Skills ── */}
      <section className="skillPanel" aria-labelledby="skill-heading">
        <header className="skillPanelHeader">
          <div>
            <h2 id="skill-heading" className="skillPanelTitle">Skill Levels</h2>
          </div>
        </header>
        <p className="skillPanelLead">
          Set your self-rated level for each sport. Match makers use this to balance teams; it&apos;s not visible
          publicly. You can update it anytime.
        </p>

        <div className="skillGrid">
          {games.map((g) => (
            <article key={g.id} className={`skillCard ${g.slug}`}>
              <h3 className="skillCardName">{g.name}</h3>
              <div className="levelPicker" role="radiogroup" aria-label={`${g.name} skill level`}>
                {LEVELS.map((lvl) => {
                  const selected = levels[g.id] === lvl;
                  return (
                    <label key={lvl} className={`levelChip ${selected ? "is-selected" : ""}`}>
                      <input
                        type="radio"
                        name={`skill-${g.id}`}
                        value={lvl}
                        checked={selected}
                        onChange={() => setLevel(g.id, lvl)}
                      />
                      {lvl}
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </div>

        <div className="profileSaveBar">
          <span className={`profileSaveStatus is-${status.kind}`} aria-live="polite">
            {status.msg ?? " "}
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              className="adminBtn adminBtnGold"
              onClick={onSaveSkills}
              disabled={busy !== null || pending}
            >
              {busy === "skills" ? "Saving…" : "Save skills"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export type { SeasonGameDto };
