import type { BracketViewDto } from "@/lib/brackets-types";
import "./bracket-view.css";

// SVG geometry — ported from the archive's hub/bracket-view.tsx.
const CARD_W   = 180;
const CARD_H   = 70;
const COL_GAP  = 60;
const ROW_GAP  = 20;
const PADDING  = 16;

function roundHeight(matchCount: number): number {
  return matchCount * CARD_H + Math.max(0, matchCount - 1) * ROW_GAP;
}

interface BracketViewProps {
  bracket: BracketViewDto;
  /** Optional — when supplied, that participant's matches get a highlighted accent bar. */
  highlightParticipantId?: string;
}

export function BracketView({ bracket, highlightParticipantId }: BracketViewProps) {
  const rounds = bracket.rounds;
  if (rounds.length === 0) {
    return (
      <div className="bracketViewEmpty" role="status">
        Bracket is empty — no participants yet.
      </div>
    );
  }

  const byId = new Map(bracket.participants.map((p) => [p.id, p]));

  const maxHeight  = Math.max(...rounds.map((r) => roundHeight(r.matches.length)));
  const totalWidth = rounds.length * CARD_W + (rounds.length - 1) * COL_GAP + PADDING * 2;
  const svgHeight  = maxHeight + 56;

  return (
    <div className="bracketView">
      <div className="bracketViewScroll">
        <svg
          viewBox={`0 0 ${totalWidth} ${svgHeight}`}
          style={{ width: "100%", minWidth: totalWidth, height: svgHeight, display: "block" }}
          role="img"
          aria-label="Tournament bracket"
        >
          {rounds.map((round, rIdx) => {
            const colX     = PADDING + rIdx * (CARD_W + COL_GAP);
            const rh       = roundHeight(round.matches.length);
            const topY     = (maxHeight - rh) / 2 + 28;
            const isLast   = rIdx === rounds.length - 1;
            const nextRoundMatches = isLast ? 0 : rounds[rIdx + 1].matches.length;
            const nextRoundTopY    = isLast ? 0 : (maxHeight - roundHeight(nextRoundMatches)) / 2 + 28;

            return (
              <g key={round.id}>
                {/* Round label */}
                <text
                  x={colX + CARD_W / 2}
                  y={14}
                  textAnchor="middle"
                  className="bracketRoundLabel"
                >
                  {round.name.toUpperCase()}
                </text>

                {round.matches.map((match, mIdx) => {
                  const cardY = topY + mIdx * (CARD_H + ROW_GAP);
                  const a     = match.participantAId ? byId.get(match.participantAId) : undefined;
                  const b     = match.participantBId ? byId.get(match.participantBId) : undefined;
                  const winner = match.winnerParticipantId;
                  const highlighted = highlightParticipantId &&
                    (match.participantAId === highlightParticipantId
                     || match.participantBId === highlightParticipantId);

                  return (
                    <g key={match.id}>
                      {/* Connector to next round (centered junction) */}
                      {!isLast && (
                        <path
                          d={`M ${colX + CARD_W} ${cardY + CARD_H / 2}
                              H ${colX + CARD_W + COL_GAP / 2}
                              V ${nextRoundTopY + Math.floor(mIdx / 2) * (CARD_H + ROW_GAP) + CARD_H / 2}
                              H ${colX + CARD_W + COL_GAP}`}
                          fill="none"
                          stroke="rgba(255,255,255,0.18)"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Card background */}
                      <rect
                        x={colX}
                        y={cardY}
                        width={CARD_W}
                        height={CARD_H}
                        rx="8"
                        className={`bracketCard ${highlighted ? "is-highlighted" : ""} ${match.status === "Complete" ? "is-complete" : ""} ${match.status === "InProgress" ? "is-live" : ""}`}
                      />

                      {/* Accent left bar */}
                      <rect
                        x={colX}
                        y={cardY}
                        width={4}
                        height={CARD_H}
                        rx="4"
                        className="bracketCardAccent"
                      />

                      {/* Slot A */}
                      <SlotRow
                        x={colX}
                        y={cardY}
                        half="top"
                        participant={a}
                        isWinner={winner !== undefined && winner === match.participantAId}
                      />

                      {/* Divider */}
                      <line
                        x1={colX + 8}
                        y1={cardY + CARD_H / 2}
                        x2={colX + CARD_W - 8}
                        y2={cardY + CARD_H / 2}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                      />

                      {/* Slot B */}
                      <SlotRow
                        x={colX}
                        y={cardY}
                        half="bottom"
                        participant={b}
                        isWinner={winner !== undefined && winner === match.participantBId}
                      />

                      {/* Status badge (bottom-right) */}
                      <text
                        x={colX + CARD_W - 8}
                        y={cardY + CARD_H - 6}
                        textAnchor="end"
                        className={`bracketCardStatus is-${match.status.toLowerCase()}`}
                      >
                        {statusLabel(match.status)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function SlotRow({
  x, y, half, participant, isWinner,
}: {
  x: number;
  y: number;
  half: "top" | "bottom";
  participant?: { displayName: string; seed?: number; isBye: boolean };
  isWinner: boolean;
}) {
  const baseY = half === "top" ? y + 22 : y + CARD_H / 2 + 22;
  const seedY = half === "top" ? y + 22 : y + CARD_H / 2 + 22;
  const isBye = participant?.isBye ?? false;
  const name  = participant ? truncate(participant.displayName, 22) : "TBD";

  return (
    <>
      {participant?.seed !== undefined && (
        <text
          x={x + 12}
          y={seedY}
          className={`bracketCardSeed ${isBye ? "is-bye" : ""}`}
        >
          {participant.seed}
        </text>
      )}
      <text
        x={x + (participant?.seed !== undefined ? 30 : 12)}
        y={baseY}
        className={`bracketCardName ${isBye ? "is-bye" : ""} ${isWinner ? "is-winner" : ""}`}
      >
        {name}
      </text>
    </>
  );
}

function statusLabel(s: string): string {
  switch (s) {
    case "Pending":    return "TBD";
    case "Scheduled":  return "SCHED";
    case "InProgress": return "LIVE";
    case "Complete":   return "FT";
    case "Walkover":   return "W/O";
    default:           return s.toUpperCase();
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
