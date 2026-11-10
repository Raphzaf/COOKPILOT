import { cn } from "@/lib/utils";

/**
 * Original illustrated covers used when a recipe has no photograph.
 * (CookPilot never uses manufacturer or third-party images; real photography can be
 * uploaded per recipe from the admin panel.)
 */
const PALETTES: Record<string, { bg: string; plate: string; rim: string }> = {
  chicken: { bg: "#efe6d2", plate: "#fffdf8", rim: "#e2d8c1" },
  wedges: { bg: "#e9ead8", plate: "#fffdf8", rim: "#d9dcc3" },
  carrots: { bg: "#f1e2cf", plate: "#fffdf8", rim: "#e5d3ba" },
  salmon: { bg: "#e6eadf", plate: "#fffdf8", rim: "#d5dccb" },
  steak: { bg: "#e8dfd2", plate: "#3a3833", rim: "#2b2a26" },
  skewers: { bg: "#ece8d6", plate: "#fffdf8", rim: "#ddd7bf" },
  vanilla: { bg: "#f2e9d8", plate: "#fffdf8", rim: "#e6dac2" },
  sorbet: { bg: "#f3e6cf", plate: "#fffdf8", rim: "#e8d6b6" },
  default: { bg: "#ece7d8", plate: "#fffdf8", rim: "#ddd6c2" },
};

function Food({ kind }: { kind: string }) {
  switch (kind) {
    case "chicken":
      return (
        <g>
          {[[-34, -14, -18], [30, -22, 24], [-8, 30, 8]].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <ellipse rx="34" ry="24" fill="#c98a3c" />
              <ellipse rx="26" ry="17" cx="-3" cy="-3" fill="#dba552" />
              <path d="M-14-6q10-8 24 0" stroke="#b5722a" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          ))}
          <g transform="translate(52 40)">
            <circle r="20" fill="#f0d34f" />
            <circle r="15" fill="#f8e98c" />
            {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M0 0L0-15" stroke="#e9c93f" strokeWidth="1.5" transform={`rotate(${a})`} />)}
          </g>
          {[[-58, 26], [8, -52], [58, -2]].map(([x, y], i) => <path key={i} d={`M${x} ${y}q6-10 12 0`} stroke="#5e6b3a" strokeWidth="3.5" fill="none" strokeLinecap="round" />)}
        </g>
      );
    case "wedges":
      return (
        <g>
          {[[-46, -30, -30], [-6, -44, 10], [40, -26, 44], [-52, 14, 18], [-10, 2, -12], [36, 12, 70], [-28, 44, -40], [18, 46, 22]].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path d="M-24 6Q0-18 24 6Q0 14-24 6Z" fill="#e0a84a" />
              <path d="M-18 5Q0-10 18 5" stroke="#f3cf7e" strokeWidth="4" fill="none" strokeLinecap="round" />
            </g>
          ))}
          {[[-20, -20], [22, -6], [-40, 34], [44, 40], [2, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#a8442a" />)}
        </g>
      );
    case "carrots":
      return (
        <g>
          {[[-44, -8, -8], [-16, 4, 6], [12, -6, -4], [40, 6, 10]].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path d="M-9-50Q0-56 9-50L3 52Q0 58-3 52Z" fill="#e2803a" />
              <path d="M-5-30h8M-4-8h7M-3 14h5" stroke="#c96a28" strokeWidth="2" strokeLinecap="round" />
              <path d="M0-52q-8-14-14-12M0-52q2-16 8-16M0-52q10-10 14-6" stroke="#5e6b3a" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    case "salmon":
      return (
        <g>
          {[[-30, -8, -14], [30, 14, 12]].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <rect x="-40" y="-22" width="80" height="44" rx="16" fill="#f0906d" />
              {[-22, -6, 10, 26].map((lx) => <path key={lx} d={`M${lx}-20q8 20 0 40`} stroke="#f7b79c" strokeWidth="3" fill="none" />)}
            </g>
          ))}
          <g transform="translate(-44 46) rotate(-20)">
            <circle r="17" fill="#f0d34f" /><circle r="12.5" fill="#f8e98c" />
          </g>
          {[[36, -44], [50, -30], [-6, 52]].map(([x, y], i) => <path key={i} d={`M${x} ${y}q-2-12 6-18M${x} ${y}q8-6 14-4M${x} ${y}q-8-4-12 2`} stroke="#5e6b3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />)}
        </g>
      );
    case "steak":
      return (
        <g>
          <path d="M-58-10Q-56-48-12-50Q40-52 58-22Q70 6 44 34Q14 58-26 46Q-60 34-58-10Z" fill="#6e3524" />
          <path d="M-46-10Q-44-38-10-40Q30-42 46-18Q56 4 36 26Q12 44-20 36Q-48 26-46-10Z" fill="#8a4630" />
          {[-30, -10, 10, 30].map((x) => <path key={x} d={`M${x - 14}-34L${x + 14} 30`} stroke="#4a2218" strokeWidth="5" strokeLinecap="round" opacity=".75" />)}
          <rect x="-16" y="-14" width="32" height="24" rx="6" fill="#f3e2a0" transform="rotate(-8)" />
          {[[-4, -6], [6, 2], [-8, 4]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#5e6b3a" />)}
        </g>
      );
    case "skewers":
      return (
        <g>
          {[-38, 0, 38].map((y, row) => (
            <g key={y} transform={`translate(0 ${y}) rotate(${row === 1 ? 3 : -3})`}>
              <path d="M-78 0H78" stroke="#b08a56" strokeWidth="3.5" strokeLinecap="round" />
              {["#c0392b", "#6f8a3a", "#7a4a8a", "#d8c9a8", "#c0392b", "#6f8a3a"].map((c, i) => (
                <rect key={i} x={-58 + i * 20} y="-12" width="16" height="24" rx="6" fill={row % 2 ? ["#6f8a3a", "#d8c9a8", "#c0392b", "#7a4a8a", "#6f8a3a", "#d8c9a8"][i] : c} />
              ))}
            </g>
          ))}
        </g>
      );
    case "vanilla":
      return (
        <g>
          <circle cx="-22" cy="12" r="34" fill="#f6ead0" />
          <circle cx="24" cy="6" r="32" fill="#f3e3c1" />
          <circle cx="0" cy="-22" r="33" fill="#faf1dc" />
          <path d="M-18-34q12-12 30-2" stroke="#fffdf8" strokeWidth="5" fill="none" strokeLinecap="round" />
          {[[-10, -18], [8, -30], [18, 2], [-28, 10], [-6, 20], [30, 18], [2, -6]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#4a3a26" />)}
          <path d="M44-52Q60-20 50 28" stroke="#3b2a1a" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    case "sorbet":
      return (
        <g>
          <circle cx="-20" cy="14" r="33" fill="#f5a623" />
          <circle cx="24" cy="10" r="31" fill="#f7b541" />
          <circle cx="2" cy="-20" r="32" fill="#f9c35c" />
          <path d="M-14-34q12-10 28-2" stroke="#fde3a6" strokeWidth="5" fill="none" strokeLinecap="round" />
          <g transform="translate(48 -42) rotate(20)">
            <path d="M-20 0A20 20 0 0 1 20 0Z" fill="#8dbb3f" />
            <path d="M-15 0A15 15 0 0 1 15 0Z" fill="#d9eaa0" />
            {[-50, -90, -130].map((a) => <path key={a} d="M0 0L14 0" stroke="#8dbb3f" strokeWidth="1.5" transform={`rotate(${a})`} />)}
          </g>
          {[[-48, -30], [40, 46]].map(([x, y], i) => <path key={i} d={`M${x} ${y}q10-10 16 2q-10 6-16-2Z`} fill="#5e6b3a" />)}
        </g>
      );
    default:
      return (
        <g stroke="#b9b29c" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M-22-36v30M-32-36v14q0 8 10 8t10-8v-14M-22-6v44" />
          <path d="M24 38V-36q-14 8-14 30h14" />
        </g>
      );
  }
}

export function RecipeArt({ kind, className, title }: { kind: string | null; className?: string; title?: string }) {
  const key = kind && PALETTES[kind] ? kind : "default";
  const p = PALETTES[key]!;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={cn("size-full", className)} role="img" aria-label={title ?? ""}>
      <rect width="400" height="300" fill={p.bg} />
      <circle cx="200" cy="156" r="118" fill="#000" opacity=".06" />
      <circle cx="200" cy="150" r="118" fill={p.rim} />
      <circle cx="200" cy="150" r="96" fill={p.plate} />
      <g transform="translate(200 150)">
        <Food kind={key} />
      </g>
    </svg>
  );
}
