import "./home.css";

export function FloatingBalls() {
  return (
    <div className="floatBalls" aria-hidden="true">
      {/* Cricket ball 1 (top-left) */}
      <svg className="floatBall b1" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="cricketBall" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#FF8A75" />
            <stop offset="60%" stopColor="#C8202F" />
            <stop offset="100%" stopColor="#5A0A12" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#cricketBall)" stroke="#3a0a14" strokeWidth="1" />
        <path d="M 12 32 Q 32 20 52 32" fill="none" stroke="#FFF" strokeWidth="0.8" opacity="0.7" />
        <path d="M 12 32 Q 32 44 52 32" fill="none" stroke="#FFF" strokeWidth="0.8" opacity="0.7" />
        <g stroke="#FFF" strokeWidth="0.5" opacity="0.6">
          {[
            [18, 28, 20, 26], [24, 25, 26, 23], [32, 23, 34, 21], [40, 25, 42, 23], [46, 28, 48, 26],
            [18, 36, 20, 38], [24, 39, 26, 41], [32, 41, 34, 43], [40, 39, 42, 41], [46, 36, 48, 38],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
        <ellipse cx="24" cy="22" rx="5" ry="2.5" fill="#FFB5A8" opacity="0.4" />
      </svg>

      {/* Cricket ball 2 (mid-left) */}
      <svg className="floatBall b2" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="url(#cricketBall)" stroke="#3a0a14" strokeWidth="1" />
        <path d="M 12 32 Q 32 20 52 32" fill="none" stroke="#FFF" strokeWidth="0.8" opacity="0.7" />
        <path d="M 12 32 Q 32 44 52 32" fill="none" stroke="#FFF" strokeWidth="0.8" opacity="0.7" />
      </svg>

      {/* Volleyball (right, lower) */}
      <svg className="floatBall b3" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="volBall" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFD15C" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#volBall)" stroke="#0E2F66" strokeWidth="2" />
        <path d="M 8 30 Q 40 22 72 30" fill="none" stroke="#0E2F66" strokeWidth="2" />
        <path d="M 8 50 Q 40 58 72 50" fill="none" stroke="#0E2F66" strokeWidth="2" />
        <path d="M 28 5 Q 22 40 28 75" fill="none" stroke="#0E2F66" strokeWidth="2" />
        <path d="M 52 5 Q 58 40 52 75" fill="none" stroke="#0E2F66" strokeWidth="2" />
        <ellipse cx="30" cy="22" rx="8" ry="4" fill="#FFFFFF" opacity="0.5" transform="rotate(-30 30 22)" />
      </svg>
    </div>
  );
}
